import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as crypto from 'crypto';
import ExcelJS from 'exceljs';
import { Model, Types } from 'mongoose';
import { Role } from '../../../shared/enums';
import { normalizePhoneNumber } from '../../../utils/phone-normalizer';
import { AuditService } from '../../audit/audit.service';
import { EmailService } from '../../notifications/email.service';
import { School, SchoolDocument } from '../../schools/schemas/school.schema';
import { SystemConfigService } from '../../system-config/system-config.service';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { BulkImportRowDto, ImportUserType } from './dto/bulk-import-row.dto';
import { buildErrorReportWorkbook } from './error-report-builder';
import { ActivationToken, ActivationTokenDocument } from './schemas/activation-token.schema';
import { ImportBatch, ImportBatchDocument } from './schemas/import-batch.schema';
import { HEADERS, buildTemplateWorkbook } from './template-builder';

const ACTIVATION_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours, per spec's suggested 24-72h window
const DUPLICATE_IMPORT_WINDOW_MS = 24 * 60 * 60 * 1000;

interface RawRow {
  rowNumber: number;
  raw: Record<string, unknown>;
}

// Excel auto-hyperlinks email addresses (and admins may paste rich-text/formula cells),
// so `cell.value` isn't always a plain string/number — exceljs returns objects like
// `{ text, hyperlink }` or `{ richText: [...] }` or `{ formula, result }` for those.
// Unwrap them to the plain display value so validation sees a real string, not `[object Object]`.
function normalizeCellValue(value: unknown): unknown {
  if (value && typeof value === 'object') {
    if ('text' in value) return (value as { text: unknown }).text;
    if ('richText' in value) {
      return (value as { richText: Array<{ text: string }> }).richText.map((r) => r.text).join('');
    }
    if ('result' in value) return (value as { result: unknown }).result;
  }
  return value;
}

interface FailedRow {
  rowNumber: number;
  data: Record<string, unknown>;
  errorReason: string;
}

@Injectable()
export class BulkImportService {
  private readonly logger = new Logger(BulkImportService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
    @InjectModel(ImportBatch.name) private importBatchModel: Model<ImportBatchDocument>,
    @InjectModel(ActivationToken.name) private activationTokenModel: Model<ActivationTokenDocument>,
    private systemConfig: SystemConfigService,
    private emailService: EmailService,
    private auditService: AuditService,
  ) {}

  async generateTemplate(): Promise<Buffer> {
    return buildTemplateWorkbook();
  }

  async processUpload(
    buffer: Buffer,
    fileName: string,
    adminId: string,
    adminEmail: string,
    force: boolean,
  ): Promise<ImportBatchDocument> {
    const startedAt = new Date();
    const fileChecksum = crypto.createHash('sha256').update(buffer).digest('hex');

    if (!force) {
      const recent = await this.importBatchModel
        .findOne({
          fileChecksum,
          status: { $in: ['COMPLETED', 'COMPLETED_WITH_ERRORS'] },
          createdAt: { $gte: new Date(Date.now() - DUPLICATE_IMPORT_WINDOW_MS) },
        })
        .exec();
      if (recent) {
        const createdAt = (recent as unknown as { createdAt: Date }).createdAt;
        throw new ConflictException(
          `This exact file was already imported at ${createdAt.toISOString()} (batch ${recent._id.toString()}). Re-submit with force=true to import it again anyway.`,
        );
      }
    }

    const rows = await this.parseWorkbook(buffer);

    const maxRows = await this.systemConfig.getSettingNumber('BULK_IMPORT_MAX_ROWS', 2000);
    if (rows.length > maxRows) {
      throw new BadRequestException(`File has ${rows.length} rows, exceeding the configured maximum of ${maxRows}. Split the file or ask an admin to raise the limit under Settings.`);
    }
    if (rows.length === 0) {
      throw new BadRequestException('No data rows found in the "Users" sheet.');
    }

    const failedRows: FailedRow[] = [];
    const validRows: Array<{ rowNumber: number; dto: BulkImportRowDto; raw: Record<string, unknown> }> = [];

    // ── Structural validation + in-file duplicate detection ──────────────────
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const seenRegNumbersInFile = new Set<string>();

    for (const { rowNumber, raw } of rows) {
      const dto = plainToInstance(BulkImportRowDto, raw);
      const errors = await validate(dto, { whitelist: true });
      if (errors.length > 0) {
        const reason = errors.map((e) => Object.values(e.constraints ?? {}).join('; ')).join(' | ');
        failedRows.push({ rowNumber, data: raw, errorReason: reason || 'Invalid row data' });
        continue;
      }

      const email = dto.email.toLowerCase().trim();
      const phone = normalizePhoneNumber(dto.phone);

      if (seenEmails.has(email)) {
        failedRows.push({ rowNumber, data: raw, errorReason: `Duplicate email within file: ${email}` });
        continue;
      }
      if (seenPhones.has(phone)) {
        failedRows.push({ rowNumber, data: raw, errorReason: `Duplicate phone within file: ${phone}` });
        continue;
      }

      if (dto.userType === ImportUserType.SCHOOL) {
        if (seenRegNumbersInFile.has(dto.schoolRegistrationNumber!)) {
          failedRows.push({ rowNumber, data: raw, errorReason: `Duplicate School Registration Number within file: ${dto.schoolRegistrationNumber}` });
          continue;
        }
        seenRegNumbersInFile.add(dto.schoolRegistrationNumber!);
      }

      seenEmails.add(email);
      seenPhones.add(phone);
      validRows.push({ rowNumber, dto, raw });
    }

    // ── Batch DB lookups: existing emails/phones, existing school registration numbers ──
    // (registration-number lookup here is only "does this SCHOOL already exist" — never
    // used to link a TEACHER row to anything; TEACHER rows are standalone accounts.)
    const emailsToCheck = validRows.map((r) => r.dto.email.toLowerCase().trim());
    const phonesToCheck = validRows.map((r) => normalizePhoneNumber(r.dto.phone));
    const regNumbersToCheck = [...new Set(validRows.filter((r) => r.dto.userType === ImportUserType.SCHOOL).map((r) => r.dto.schoolRegistrationNumber!))];

    const [existingUsers, existingSchools] = await Promise.all([
      emailsToCheck.length || phonesToCheck.length
        ? this.userModel
            .find({ $or: [{ email: { $in: emailsToCheck } }, { phone: { $in: phonesToCheck } }], deletedAt: null })
            .select('email phone')
            .lean()
            .exec()
        : Promise.resolve([]),
      regNumbersToCheck.length
        ? this.schoolModel
            .find({ registrationNumber: { $in: regNumbersToCheck }, deletedAt: null })
            .select('registrationNumber')
            .lean()
            .exec()
        : Promise.resolve([]),
    ]);

    const existingEmailSet = new Set(existingUsers.map((u) => (u as { email?: string }).email).filter(Boolean));
    const existingPhoneSet = new Set(existingUsers.map((u) => (u as { phone?: string }).phone).filter(Boolean));
    const existingSchoolRegNumbers = new Set(existingSchools.map((s) => (s as { registrationNumber: string }).registrationNumber));

    const schoolRows = validRows.filter((r) => r.dto.userType === ImportUserType.SCHOOL);
    const teacherRows = validRows.filter((r) => r.dto.userType === ImportUserType.TEACHER);

    const finalValidRows: Array<{ rowNumber: number; dto: BulkImportRowDto; raw: Record<string, unknown> }> = [];

    for (const row of schoolRows) {
      const email = row.dto.email.toLowerCase().trim();
      const phone = normalizePhoneNumber(row.dto.phone);
      if (existingEmailSet.has(email)) {
        failedRows.push({ rowNumber: row.rowNumber, data: row.raw, errorReason: `Email already registered: ${email}` });
        continue;
      }
      if (existingPhoneSet.has(phone)) {
        failedRows.push({ rowNumber: row.rowNumber, data: row.raw, errorReason: `Phone already registered: ${phone}` });
        continue;
      }
      if (existingSchoolRegNumbers.has(row.dto.schoolRegistrationNumber!)) {
        failedRows.push({ rowNumber: row.rowNumber, data: row.raw, errorReason: `School Registration Number already exists: ${row.dto.schoolRegistrationNumber}` });
        continue;
      }
      finalValidRows.push(row);
    }

    for (const row of teacherRows) {
      const email = row.dto.email.toLowerCase().trim();
      const phone = normalizePhoneNumber(row.dto.phone);
      if (existingEmailSet.has(email)) {
        failedRows.push({ rowNumber: row.rowNumber, data: row.raw, errorReason: `Email already registered: ${email}` });
        continue;
      }
      if (existingPhoneSet.has(phone)) {
        failedRows.push({ rowNumber: row.rowNumber, data: row.raw, errorReason: `Phone already registered: ${phone}` });
        continue;
      }
      finalValidRows.push(row);
    }

    // ── Create: SCHOOL rows first, then TEACHER rows (order no longer load-bearing for
    // linking — TEACHER rows are fully independent — but harmless to keep grouped) ──
    const createdUsers: UserDocument[] = [];

    for (const row of finalValidRows.filter((r) => r.dto.userType === ImportUserType.SCHOOL)) {
      try {
        const user = await this.createSchoolUserAndProfile(row.dto);
        createdUsers.push(user);
      } catch (err: unknown) {
        failedRows.push({ rowNumber: row.rowNumber, data: row.raw, errorReason: `Creation failed: ${String((err as Error).message ?? err)}` });
      }
    }

    for (const row of finalValidRows.filter((r) => r.dto.userType === ImportUserType.TEACHER)) {
      try {
        const user = await this.createTeacherUser(row.dto);
        createdUsers.push(user);
      } catch (err: unknown) {
        failedRows.push({ rowNumber: row.rowNumber, data: row.raw, errorReason: `Creation failed: ${String((err as Error).message ?? err)}` });
      }
    }

    // ── Activation tokens + fire-and-forget onboarding emails ────────────────
    let emailsQueued = 0;
    for (const user of createdUsers) {
      emailsQueued++;
      this.issueActivationAndEmail(user).catch((err: unknown) => {
        this.logger.warn(`Activation email failed for ${user._id.toString()}: ${String(err)}`);
      });
    }

    const completedAt = new Date();
    const status = failedRows.length === 0 ? 'COMPLETED' : createdUsers.length === 0 ? 'FAILED' : 'COMPLETED_WITH_ERRORS';

    const batch = await this.importBatchModel.create({
      importedByAdminId: new Types.ObjectId(adminId),
      importedByAdminEmail: adminEmail,
      fileName,
      fileChecksum,
      totalRows: rows.length,
      successCount: createdUsers.length,
      failedCount: failedRows.length,
      status,
      startedAt,
      completedAt,
      processingDurationMs: completedAt.getTime() - startedAt.getTime(),
      emailsQueued,
      emailsSent: 0,
      emailsFailed: 0,
      failedRows,
    });

    if (createdUsers.length > 0) {
      await this.userModel.updateMany(
        { _id: { $in: createdUsers.map((u) => u._id) } },
        { $set: { importBatchId: batch._id } },
      );
    }

    this.auditService.log(
      adminId,
      adminEmail,
      'BULK_USER_IMPORT',
      'user',
      batch._id.toString(),
      fileName,
      {},
      { totalRows: rows.length, successCount: createdUsers.length, failedCount: failedRows.length },
    );

    return batch;
  }

  async getHistory(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.importBatchModel
        .find({})
        .select('-failedRows.data')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.importBatchModel.countDocuments({}),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getErrorReport(batchId: string): Promise<Buffer> {
    const batch = await this.importBatchModel.findById(batchId).lean().exec();
    if (!batch) throw new NotFoundException('Import batch not found');
    return buildErrorReportWorkbook(batch.failedRows);
  }

  async resendEmails(batchId: string, userIds: string[] | undefined, adminId: string, adminEmail: string): Promise<{ queued: number }> {
    const batch = await this.importBatchModel.findById(batchId).lean().exec();
    if (!batch) throw new NotFoundException('Import batch not found');

    const filter: Record<string, unknown> = { importBatchId: new Types.ObjectId(batchId), activatedAt: null, deletedAt: null };
    if (userIds && userIds.length > 0) {
      filter['_id'] = { $in: userIds.map((id) => new Types.ObjectId(id)) };
    }
    const users = await this.userModel.find(filter).exec();

    let queued = 0;
    for (const user of users) {
      queued++;
      this.issueActivationAndEmail(user).catch((err: unknown) => {
        this.logger.warn(`Resend activation email failed for ${user._id.toString()}: ${String(err)}`);
      });
    }

    this.auditService.log(adminId, adminEmail, 'BULK_IMPORT_EMAILS_RESENT', 'user', batchId, batch.fileName, {}, { queued });
    return { queued };
  }

  // ── Row -> DB creation ──────────────────────────────────────────────────────

  private async createSchoolUserAndProfile(dto: BulkImportRowDto): Promise<UserDocument> {
    const phone = normalizePhoneNumber(dto.phone);
    const user = await this.userModel.create({
      role: Role.RECRUITER,
      email: dto.email.toLowerCase().trim(),
      phone,
      passwordHash: null,
      emailVerified: true,
      recruiterProfile: { fullName: dto.fullName, schoolId: null },
    });

    const school = await this.schoolModel.create({
      name: dto.schoolName!,
      registrationNumber: dto.schoolRegistrationNumber!,
      address: dto.schoolAddress!,
      city: dto.schoolCity!,
      state: dto.schoolState!,
      pincode: dto.schoolPincode!,
      contactEmail: (dto.schoolContactEmail ?? dto.email).toLowerCase().trim(),
      contactPhone: dto.schoolContactPhone ?? phone,
      adminUserId: user._id,
    });

    await this.userModel.findByIdAndUpdate(user._id, {
      $set: { 'recruiterProfile.schoolId': school._id },
    });
    user.recruiterProfile!.schoolId = school._id;
    return user;
  }

  private async createTeacherUser(dto: BulkImportRowDto): Promise<UserDocument> {
    const phone = normalizePhoneNumber(dto.phone);
    return this.userModel.create({
      role: Role.TEACHER,
      email: dto.email.toLowerCase().trim(),
      phone,
      passwordHash: null,
      emailVerified: true,
      seekerProfile: {
        fullName: dto.fullName,
        headline: null, bio: null, resumeUrl: null, introVideoUrl: null,
        city: dto.city ?? null, state: dto.state ?? null, availability: null,
        experienceYears: dto.experienceYears ?? null, skills: [], certUrls: [], desiredCities: [],
        age: null, gender: null, maritalStatus: null, degrees: [],
        whatsappNumber: null, whatsappVerified: false, pincode: null,
        currentSchool: dto.currentSchoolName ?? null, employmentType: null,
        expertise: [], academics: null, salaryRange: null,
        availableTimings: [], interestedToCover: [], indemnityInsurance: null,
        isRegisteredWithBoard: null, boardRegistrationName: null,
      },
    });
  }

  private async issueActivationAndEmail(user: UserDocument): Promise<void> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await this.activationTokenModel.create({
      userId: user._id,
      tokenHash,
      expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
      used: false,
    });

    const publicUrl = process.env.PUBLIC_FRONTEND_URL || 'https://schoolteacher.co.in';
    const activationLink = `${publicUrl}/activate/${rawToken}`;
    const name = user.seekerProfile?.fullName ?? user.recruiterProfile?.fullName ?? 'there';
    await this.emailService.sendAccountActivationEmail(user.email!, name, user.role, activationLink);
  }

  // ── Parsing ──────────────────────────────────────────────────────────────────

  private async parseWorkbook(buffer: Buffer): Promise<RawRow[]> {
    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } catch {
      throw new BadRequestException('Could not read the uploaded file. Make sure it is a valid .xlsx file.');
    }

    const sheet = workbook.getWorksheet('Users') ?? workbook.worksheets[0];
    if (!sheet) throw new BadRequestException('No worksheet found in the uploaded file.');

    const headerRow = sheet.getRow(1);
    const columnIndexToKey = new Map<number, string>();
    headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const headerText = String(cell.value ?? '').trim();
      const match = HEADERS.find((h) => h.header.trim() === headerText);
      if (match) columnIndexToKey.set(colNumber, match.key);
    });

    const requiredHeaders = ['userType', 'fullName', 'email', 'phone', 'schoolRegistrationNumber'];
    const foundKeys = new Set(columnIndexToKey.values());
    const missing = requiredHeaders.filter((k) => !foundKeys.has(k));
    if (missing.length > 0) {
      throw new BadRequestException(
        `Uploaded file's headers don't match the expected template. Missing required columns: ${missing.join(', ')}. Please use the downloaded template without renaming columns.`,
      );
    }

    const rows: RawRow[] = [];
    for (let r = 2; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      const raw: Record<string, unknown> = {};
      let isEmpty = true;

      columnIndexToKey.forEach((key, colNumber) => {
        const cell = row.getCell(colNumber);
        let value: unknown = normalizeCellValue(cell.value);
        if (value !== null && value !== undefined && value !== '') isEmpty = false;
        if (key === 'userType' && typeof value === 'string') value = value.trim().toUpperCase();
        if (key === 'experienceYears' && value !== null && value !== undefined && value !== '') {
          value = Number(value);
        } else if (key !== 'experienceYears' && typeof value === 'number') {
          // Every other field is expected as a string (phone/pincode/registration numbers
          // etc.) — Excel stores plain digit entries as numbers unless text-formatted,
          // which would otherwise fail @IsString() with a confusing "not a string" error.
          value = String(value);
        }
        if (typeof value === 'string') value = value.trim();
        raw[key] = value === '' ? undefined : value;
      });

      if (!isEmpty) rows.push({ rowNumber: r, raw });
    }

    return rows;
  }
}
