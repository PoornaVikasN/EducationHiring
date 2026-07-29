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
import { buildEmailStatusReportWorkbook } from './email-status-report-builder';
import { buildErrorReportWorkbook } from './error-report-builder';
import { ActivationToken, ActivationTokenDocument } from './schemas/activation-token.schema';
import { ImportBatch, ImportBatchDocument } from './schemas/import-batch.schema';
import { HEADERS, buildTemplateWorkbook } from './template-builder';

const ACTIVATION_TOKEN_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours, per spec's suggested 24-72h window
const DUPLICATE_IMPORT_WINDOW_MS = 24 * 60 * 60 * 1000;
const INSERT_CHUNK_SIZE = 1000;
// EmailService now pools SMTP connections (maxConnections: 3), so these groups queue
// through a handful of real connections rather than each opening a fresh one — kept
// modest anyway as defense-in-depth against Gmail's connection-level throttling.
const EMAIL_SEND_CHUNK_SIZE = 10;
const EMAIL_SEND_CHUNK_DELAY_MS = 1000;
// Keeps the ImportBatch document well clear of MongoDB's 16MB BSON document limit even
// on a catastrophic near-total-failure import — the full list is still available by
// re-downloading the Error Report immediately after a run; only the *inline copy* is capped.
const INLINE_FAILED_ROW_CAP = 2000;
// Same idea for the per-email failure reasons embedded in an audit log entry — keeps
// individual audit_log documents small even on a pass with a very high failure count.
const INLINE_AUDIT_FAILURE_CAP = 50;

interface EmailFailure {
  email: string;
  reason: string;
}

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

type PendingRowRef = { rowNumber: number; raw: Record<string, unknown> };
type PendingUserDoc = Record<string, unknown> & { _id: Types.ObjectId };

interface EmailInfo {
  email: string;
  role: Role;
  fullName: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
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

  // Fast synchronous half: dedupe/parse/cap-check, then hand off the heavy lifting to
  // runImportBatch() in the background so the HTTP request returns immediately — a 30k-row
  // file's actual processing (validation, batched writes, paced emails) can take well past
  // any reasonable request timeout, but the upload response itself must not.
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

    const batch = await this.importBatchModel.create({
      importedByAdminId: new Types.ObjectId(adminId),
      importedByAdminEmail: adminEmail,
      fileName,
      fileChecksum,
      totalRows: rows.length,
      successCount: 0,
      failedCount: 0,
      status: 'PROCESSING',
      startedAt,
      completedAt: null,
      processingDurationMs: null,
      emailsQueued: 0,
      emailsSent: 0,
      emailsFailed: 0,
      failedRows: [],
      failedRowsTruncated: false,
    });

    const batchId = batch._id.toString();
    setImmediate(() => {
      this.runImportBatch(batchId, rows, adminId, adminEmail, fileName, startedAt).catch((err: unknown) => {
        this.logger.error(`Bulk import batch ${batchId} crashed: ${String((err as Error)?.stack ?? err)}`);
      });
    });

    return batch;
  }

  // The async half — everything that used to run inline in the request. Never throws
  // out to a caller (there isn't one awaiting it); any unexpected failure is caught by
  // the setImmediate wrapper above and logged, leaving the batch stuck at PROCESSING.
  // Acceptable for an occasional internal admin operation at this scale (see plan notes);
  // would need a persisted/resumable job store if 30k-row imports become routine.
  private async runImportBatch(
    batchId: string,
    rows: RawRow[],
    adminId: string,
    adminEmail: string,
    fileName: string,
    startedAt: Date,
  ): Promise<void> {
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

    // ── Batched creation ──────────────────────────────────────────────────────
    // Build every document in memory first with pre-generated ObjectIds (so
    // recruiterProfile.schoolId / School.adminUserId are correct at insert time — no
    // post-insert findByIdAndUpdate needed), then insertMany in chunks instead of one
    // create() per row. Schools are inserted before their Users: if a School insert fails
    // (e.g. a registration-number race from a concurrent import), we skip creating that
    // row's User entirely rather than risk a User pointing at a School that doesn't exist.
    // The mirror-image edge case — a School succeeding while its paired User insert then
    // fails on an email/phone race — is accepted as a rare residual risk at this scale (the
    // existing-value checks above already rule out the common case; this only bites on a
    // genuine concurrent-import collision).
    const pendingEmailInfo = new Map<string, EmailInfo>();

    const schoolUserDocs: PendingUserDoc[] = [];
    const schoolDocs: PendingUserDoc[] = [];
    const schoolRowRefs: PendingRowRef[] = [];

    for (const row of finalValidRows.filter((r) => r.dto.userType === ImportUserType.SCHOOL)) {
      const dto = row.dto;
      const phone = normalizePhoneNumber(dto.phone);
      const userId = new Types.ObjectId();
      const schoolId = new Types.ObjectId();

      schoolUserDocs.push({
        _id: userId,
        role: Role.RECRUITER,
        email: dto.email.toLowerCase().trim(),
        phone,
        passwordHash: null,
        emailVerified: true,
        recruiterProfile: { fullName: dto.fullName, schoolId },
      });
      schoolDocs.push({
        _id: schoolId,
        name: dto.schoolName!,
        registrationNumber: dto.schoolRegistrationNumber!,
        address: dto.schoolAddress!,
        city: dto.schoolCity!,
        state: dto.schoolState!,
        pincode: dto.schoolPincode!,
        contactEmail: (dto.schoolContactEmail ?? dto.email).toLowerCase().trim(),
        contactPhone: dto.schoolContactPhone ?? phone,
        adminUserId: userId,
      });
      schoolRowRefs.push({ rowNumber: row.rowNumber, raw: row.raw });
      pendingEmailInfo.set(userId.toString(), { email: schoolUserDocs.at(-1)!.email as string, role: Role.RECRUITER, fullName: dto.fullName });
    }

    const teacherUserDocs: PendingUserDoc[] = [];
    const teacherRowRefs: PendingRowRef[] = [];

    for (const row of finalValidRows.filter((r) => r.dto.userType === ImportUserType.TEACHER)) {
      const dto = row.dto;
      const phone = normalizePhoneNumber(dto.phone);
      const userId = new Types.ObjectId();

      teacherUserDocs.push({
        _id: userId,
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
      teacherRowRefs.push({ rowNumber: row.rowNumber, raw: row.raw });
      pendingEmailInfo.set(userId.toString(), { email: teacherUserDocs.at(-1)!.email as string, role: Role.TEACHER, fullName: dto.fullName });
    }

    const succeededSchools = await this.insertManyTolerant(this.schoolModel, schoolDocs, schoolRowRefs, failedRows, 'School creation failed');
    const succeededSchoolIds = new Set(succeededSchools.map((s) => s._id.toString()));

    const combinedUserDocs: PendingUserDoc[] = [];
    const combinedRowRefs: PendingRowRef[] = [];
    for (let i = 0; i < schoolUserDocs.length; i++) {
      const userDoc = schoolUserDocs[i]!;
      const schoolId = (userDoc.recruiterProfile as { schoolId: Types.ObjectId }).schoolId;
      if (succeededSchoolIds.has(schoolId.toString())) {
        combinedUserDocs.push(userDoc);
        combinedRowRefs.push(schoolRowRefs[i]!);
      } else {
        pendingEmailInfo.delete(userDoc._id.toString());
      }
    }
    combinedUserDocs.push(...teacherUserDocs);
    combinedRowRefs.push(...teacherRowRefs);

    const succeededUsers = await this.insertManyTolerant(this.userModel, combinedUserDocs, combinedRowRefs, failedRows, 'User creation failed');

    if (succeededUsers.length > 0) {
      await this.userModel.updateMany(
        { _id: { $in: succeededUsers.map((u) => u._id) } },
        { $set: { importBatchId: new Types.ObjectId(batchId) } },
      );
    }

    // ── Activation tokens, batched ────────────────────────────────────────────
    const rawTokenByUserId = new Map<string, string>();
    const tokenDocs: Array<Record<string, unknown>> = [];
    for (const user of succeededUsers) {
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
      rawTokenByUserId.set(user._id.toString(), rawToken);
      tokenDocs.push({
        userId: user._id,
        tokenHash,
        expiresAt: new Date(Date.now() + ACTIVATION_TOKEN_TTL_MS),
        used: false,
      });
    }
    for (const c of chunk(tokenDocs, INSERT_CHUNK_SIZE)) {
      try {
        await this.activationTokenModel.insertMany(c, { ordered: false });
      } catch (err: unknown) {
        this.logger.warn(`Some activation tokens failed to insert (batch ${batchId}): ${String(err)}`);
      }
    }

    // ── Paced activation emails (Gmail daily-send-cap aware) ──────────────────
    const emailCap = await this.systemConfig.getSettingNumber('EMAIL_DAILY_SEND_CAP', 500);
    const toEmailNow = succeededUsers.slice(0, emailCap);
    const emailResult = await this.sendActivationEmailsPaced(toEmailNow, rawTokenByUserId, pendingEmailInfo);

    // ── Finalize batch ────────────────────────────────────────────────────────
    const completedAt = new Date();
    const status = failedRows.length === 0 ? 'COMPLETED' : succeededUsers.length === 0 ? 'FAILED' : 'COMPLETED_WITH_ERRORS';
    const failedRowsTruncated = failedRows.length > INLINE_FAILED_ROW_CAP;
    const storedFailedRows = failedRowsTruncated ? failedRows.slice(0, INLINE_FAILED_ROW_CAP) : failedRows;

    await this.importBatchModel.findByIdAndUpdate(batchId, {
      $set: {
        successCount: succeededUsers.length,
        failedCount: failedRows.length,
        status,
        completedAt,
        processingDurationMs: completedAt.getTime() - startedAt.getTime(),
        emailsQueued: succeededUsers.length,
        emailsSent: emailResult.sent,
        emailsFailed: emailResult.failed,
        failedRows: storedFailedRows,
        failedRowsTruncated,
      },
    });

    this.auditService.log(
      adminId,
      adminEmail,
      'BULK_USER_IMPORT',
      'user',
      batchId,
      fileName,
      {},
      {
        totalRows: rows.length,
        successCount: succeededUsers.length,
        failedCount: failedRows.length,
        emailsAttempted: toEmailNow.length,
        emailsSent: emailResult.sent,
        emailsFailed: emailResult.failed,
        failures: emailResult.failures,
        failuresTruncated: emailResult.failuresTruncated,
      },
    );
  }

  // Inserts `docs` (parallel-indexed with `rowRefs`) in chunks, tolerating partial
  // per-document failures (e.g. a duplicate-key race from a concurrent import) without
  // aborting the whole chunk (`ordered: false`). Successfully inserted docs are returned;
  // failed ones are pushed to `failedRows` with the row data they came from.
  private async insertManyTolerant<T extends PendingUserDoc>(
    model: Model<any>,
    docs: T[],
    rowRefs: PendingRowRef[],
    failedRows: FailedRow[],
    errorLabel: string,
  ): Promise<T[]> {
    if (docs.length === 0) return [];
    const succeeded: T[] = [];
    const docChunks = chunk(docs, INSERT_CHUNK_SIZE);
    const refChunks = chunk(rowRefs, INSERT_CHUNK_SIZE);

    for (let c = 0; c < docChunks.length; c++) {
      const chunkDocs = docChunks[c]!;
      const chunkRefs = refChunks[c]!;
      try {
        await model.insertMany(chunkDocs, { ordered: false });
        succeeded.push(...chunkDocs);
      } catch (err: unknown) {
        const bulkErr = err as {
          insertedDocs?: Array<{ _id: Types.ObjectId }>;
          writeErrors?: Array<{ index: number; err?: { errmsg?: string }; errmsg?: string }>;
        };
        const insertedIds = new Set((bulkErr.insertedDocs ?? []).map((d) => d._id.toString()));
        for (const d of chunkDocs) {
          if (insertedIds.has(d._id.toString())) succeeded.push(d);
        }
        for (let i = 0; i < chunkDocs.length; i++) {
          const d = chunkDocs[i]!;
          if (insertedIds.has(d._id.toString())) continue;
          const ref = chunkRefs[i];
          if (!ref) continue;
          const writeErr = (bulkErr.writeErrors ?? []).find((e) => e.index === i);
          const reason = writeErr?.err?.errmsg ?? writeErr?.errmsg ?? String((err as Error).message ?? err);
          failedRows.push({ rowNumber: ref.rowNumber, data: ref.raw, errorReason: `${errorLabel}: ${reason}` });
        }
      }
    }
    return succeeded;
  }

  // Sends in small concurrent groups with a short delay between groups — never a single
  // instantaneous burst even within the daily cap already applied by the caller. Marks
  // each successfully-sent user's activationEmailSentAt so later resend passes (see
  // resendEmails) know who still needs a first email.
  private async sendActivationEmailsPaced(
    users: PendingUserDoc[],
    rawTokenByUserId: Map<string, string>,
    emailInfo: Map<string, EmailInfo>,
  ): Promise<{ sent: number; failed: number; failures: EmailFailure[]; failuresTruncated: boolean }> {
    let sent = 0;
    let failed = 0;
    const failures: EmailFailure[] = [];
    let failuresTruncated = false;
    const sentUserIds: Types.ObjectId[] = [];
    const publicUrl = process.env.PUBLIC_FRONTEND_URL || 'https://schoolteacher.co.in';
    const groups = chunk(users, EMAIL_SEND_CHUNK_SIZE);

    for (let g = 0; g < groups.length; g++) {
      const group = groups[g]!;
      const results = await Promise.allSettled(
        group.map((user) => {
          const info = emailInfo.get(user._id.toString());
          const rawToken = rawTokenByUserId.get(user._id.toString());
          if (!info || !rawToken) return Promise.reject(new Error('missing email info or activation token'));
          const activationLink = `${publicUrl}/activate/${rawToken}`;
          return this.emailService.sendAccountActivationEmail(info.email, info.fullName, info.role, activationLink);
        }),
      );
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          sent++;
          sentUserIds.push(group[i]!._id);
        } else {
          failed++;
          const email = emailInfo.get(group[i]!._id.toString())?.email ?? group[i]!._id.toString();
          const reason = String((r.reason as Error)?.message ?? r.reason);
          this.logger.warn(`Activation email failed for ${email}: ${reason}`);
          if (failures.length < INLINE_AUDIT_FAILURE_CAP) failures.push({ email, reason });
          else failuresTruncated = true;
        }
      });
      if (g < groups.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, EMAIL_SEND_CHUNK_DELAY_MS));
      }
    }

    if (sentUserIds.length > 0) {
      await this.userModel.updateMany({ _id: { $in: sentUserIds } }, { $set: { activationEmailSentAt: new Date() } });
    }
    return { sent, failed, failures, failuresTruncated };
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

    const batchIds = data.map((b) => (b as unknown as { _id: Types.ObjectId })._id);
    const pendingCounts = batchIds.length
      ? await this.userModel.aggregate([
          { $match: { importBatchId: { $in: batchIds }, activationEmailSentAt: null, deletedAt: null } },
          { $group: { _id: '$importBatchId', count: { $sum: 1 } } },
        ])
      : [];
    const pendingByBatch = new Map(pendingCounts.map((p: { _id: Types.ObjectId; count: number }) => [p._id.toString(), p.count]));

    const withPending = data.map((b) => ({
      ...b,
      pendingEmailCount: pendingByBatch.get((b as unknown as { _id: Types.ObjectId })._id.toString()) ?? 0,
    }));

    return { data: withPending, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getBatch(batchId: string) {
    const batch = await this.importBatchModel.findById(batchId).select('-failedRows.data').lean().exec();
    if (!batch) throw new NotFoundException('Import batch not found');
    const pendingEmailCount = await this.userModel.countDocuments({
      importBatchId: batch._id,
      activationEmailSentAt: null,
      deletedAt: null,
    });
    return { ...batch, pendingEmailCount };
  }

  async getErrorReport(batchId: string, adminId: string, adminEmail: string): Promise<Buffer> {
    const batch = await this.importBatchModel.findById(batchId).lean().exec();
    if (!batch) throw new NotFoundException('Import batch not found');
    this.auditService.log(
      adminId, adminEmail, 'BULK_IMPORT_ERRORS_DOWNLOADED', 'user', batchId, batch.fileName,
      {}, { rowCount: batch.failedRows.length },
    );
    return buildErrorReportWorkbook(batch.failedRows);
  }

  // Per-user visibility into exactly who got their activation email and who's still
  // pending — the "did we actually send anything" question a downloaded stats card alone
  // can't answer.
  async getEmailStatusReport(batchId: string, adminId: string, adminEmail: string): Promise<Buffer> {
    const batch = await this.importBatchModel.findById(batchId).lean().exec();
    if (!batch) throw new NotFoundException('Import batch not found');

    const users = await this.userModel
      .find({ importBatchId: new Types.ObjectId(batchId), deletedAt: null })
      .select('email role activationEmailSentAt seekerProfile.fullName recruiterProfile.fullName')
      .sort({ activationEmailSentAt: -1 })
      .lean()
      .exec();

    const rows = users.map((u) => ({
      fullName: u.seekerProfile?.fullName ?? u.recruiterProfile?.fullName ?? '',
      email: u.email ?? '',
      role: u.role,
      activationEmailSentAt: u.activationEmailSentAt ?? null,
    }));

    this.auditService.log(
      adminId, adminEmail, 'BULK_IMPORT_EMAIL_STATUS_DOWNLOADED', 'user', batchId, batch.fileName,
      {}, { userCount: rows.length, sentCount: rows.filter((r) => r.activationEmailSentAt).length },
    );

    return buildEmailStatusReportWorkbook(rows);
  }

  // Auto-trickle mode (no userIds given): targets only users from this batch who have
  // never received their activation email (Gmail's real daily send limit means a large
  // batch can't all be emailed at once). Explicit userIds bypasses that filter — it's the
  // admin deliberately re-sending to specific people regardless of prior sends. Shared by
  // the admin-triggered "Resend" action and the automated daily sweep (below).
  private async findPendingUsers(batchId: string, userIds: string[] | undefined, limit: number): Promise<UserDocument[]> {
    const filter: Record<string, unknown> = { importBatchId: new Types.ObjectId(batchId), deletedAt: null };
    if (userIds && userIds.length > 0) {
      filter['_id'] = { $in: userIds.map((id) => new Types.ObjectId(id)) };
    } else {
      filter['activationEmailSentAt'] = null;
    }
    return this.userModel.find(filter).limit(limit).exec();
  }

  // Sends in small concurrent groups with a delay between groups (same shape as
  // sendActivationEmailsPaced) — never a single unbounded simultaneous burst. A first cut
  // at this fired every user in one go with zero pacing and reproducibly tripped a real
  // Gmail "421 Temporary System Problem" throttle response during live testing.
  private async sendPendingUserEmailsPaced(users: UserDocument[]): Promise<{ sent: number; failed: number; failures: EmailFailure[]; failuresTruncated: boolean }> {
    let sent = 0;
    let failed = 0;
    const failures: EmailFailure[] = [];
    let failuresTruncated = false;
    const groups = chunk(users, EMAIL_SEND_CHUNK_SIZE);

    for (let g = 0; g < groups.length; g++) {
      const group = groups[g]!;
      const results = await Promise.allSettled(group.map((user) => this.issueActivationAndEmail(user)));
      const sentIds: Types.ObjectId[] = [];
      results.forEach((r, i) => {
        if (r.status === 'fulfilled') {
          sent++;
          sentIds.push(group[i]!._id);
        } else {
          failed++;
          const email = group[i]!.email ?? group[i]!._id.toString();
          const reason = String((r.reason as Error)?.message ?? r.reason);
          this.logger.warn(`Pending-email dispatch failed for ${email}: ${reason}`);
          if (failures.length < INLINE_AUDIT_FAILURE_CAP) failures.push({ email, reason });
          else failuresTruncated = true;
        }
      });
      if (sentIds.length > 0) {
        await this.userModel.updateMany({ _id: { $in: sentIds } }, { $set: { activationEmailSentAt: new Date() } });
      }
      if (g < groups.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, EMAIL_SEND_CHUNK_DELAY_MS));
      }
    }
    return { sent, failed, failures, failuresTruncated };
  }

  async resendEmails(batchId: string, userIds: string[] | undefined, adminId: string, adminEmail: string): Promise<{ queued: number }> {
    const batch = await this.importBatchModel.findById(batchId).lean().exec();
    if (!batch) throw new NotFoundException('Import batch not found');

    const emailCap = await this.systemConfig.getSettingNumber('EMAIL_DAILY_SEND_CAP', 500);
    const users = await this.findPendingUsers(batchId, userIds, emailCap);

    // Fire-and-forget the whole paced pass (not per-user) — keeps the admin's "Resend"
    // click fast, matching this codebase's existing "don't block the caller on email
    // delivery" convention, while still pacing internally (see sendPendingUserEmailsPaced).
    // The audit entry is written once the pass actually finishes (not at trigger time) so
    // it records the real sent/failed outcome, not just an optimistic "attempted" count.
    // Also $inc the batch's cumulative emailsSent/emailsFailed — those fields used to only
    // ever be set once at initial-import completion, going stale after the first resend.
    this.sendPendingUserEmailsPaced(users)
      .then(async ({ sent, failed, failures, failuresTruncated }) => {
        await this.importBatchModel.updateOne({ _id: batchId }, { $inc: { emailsSent: sent, emailsFailed: failed } });
        this.auditService.log(
          adminId, adminEmail, 'BULK_IMPORT_EMAILS_RESENT', 'user', batchId, batch.fileName,
          {}, { attempted: users.length, sent, failed, failures, failuresTruncated },
        );
      })
      .catch((err: unknown) => {
        this.logger.warn(`Paced resend dispatch crashed for batch ${batchId}: ${String(err)}`);
      });

    return { queued: users.length };
  }

  // Automated daily trickle: finds every bulk-import batch that still has at least one
  // user pending their first activation email and dispatches the next wave for each,
  // respecting EMAIL_DAILY_SEND_CAP per batch per run — so a 4,000-row import (or larger)
  // finishes emailing everyone over a handful of days with zero manual "Resend" clicks.
  // Called from a daily cron (see src/scheduler). Batches are processed sequentially
  // (awaited, not fire-and-forget) since a background cron has no caller waiting on a
  // fast response, and racing multiple batches' sends concurrently would risk compounding
  // into the same Gmail rate-limit window. Each batch gets its own audit-log entry
  // (system-attributed, no admin) with the real sent/failed outcome — same visibility as
  // a manual "Resend" click, so every automated pass is traceable in Admin → Audit Logs.
  async runPendingEmailSweep(): Promise<{ batchesProcessed: number; totalQueued: number; totalSent: number; totalFailed: number }> {
    const pendingBatchIds = await this.userModel.aggregate<{ _id: Types.ObjectId }>([
      { $match: { importBatchId: { $ne: null }, activationEmailSentAt: null, deletedAt: null } },
      { $group: { _id: '$importBatchId' } },
    ]);

    const emailCap = await this.systemConfig.getSettingNumber('EMAIL_DAILY_SEND_CAP', 500);
    let totalQueued = 0;
    let totalSent = 0;
    let totalFailed = 0;

    for (const { _id } of pendingBatchIds) {
      const batchId = _id.toString();
      const batch = await this.importBatchModel.findById(batchId).select('fileName').lean().exec();
      const users = await this.findPendingUsers(batchId, undefined, emailCap);
      totalQueued += users.length;
      const { sent, failed, failures, failuresTruncated } = await this.sendPendingUserEmailsPaced(users);
      totalSent += sent;
      totalFailed += failed;
      await this.importBatchModel.updateOne({ _id: batchId }, { $inc: { emailsSent: sent, emailsFailed: failed } });

      this.auditService.logSystemEvent(
        'BULK_IMPORT_EMAILS_AUTO_RESENT', 'user', batchId, batch?.fileName ?? 'Unknown file',
        {}, { attempted: users.length, sent, failed, failures, failuresTruncated },
      );
    }
    return { batchesProcessed: pendingBatchIds.length, totalQueued, totalSent, totalFailed };
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

    // schoolRegistrationNumber is intentionally excluded — it's only ever required as a
    // per-row VALUE for SCHOOL rows (enforced by BulkImportRowDto's @ValidateIf), never as
    // a column that must exist in the sheet. A TEACHER-only file may omit it entirely.
    const requiredHeaders = ['userType', 'fullName', 'email', 'phone'];
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
