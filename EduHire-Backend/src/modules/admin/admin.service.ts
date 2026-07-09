import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { ApplicationState, JobStatus, PaymentStatus, Role, SubscriptionStatus, VerificationStatus } from '../../shared/enums';
import { normalizePhoneNumber } from '../../utils/phone-normalizer';
import { AuditService } from '../audit/audit.service';
import { School, SchoolDocument } from '../schools/schemas/school.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Application.name) private appModel: Model<ApplicationDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  // ── Users ─────────────────────────────────────────────────────────────────────

  async listUsers(
    page = 1,
    limit = 20,
    search?: string,
    role?: string,
    isActive?: boolean,
    city?: string,
    joinedFrom?: string,
    joinedTo?: string,
    includeDeleted = false,
  ) {
    const skip = (page - 1) * limit;
    const match: Record<string, unknown> = includeDeleted ? {} : { deletedAt: null };

    if (search) {
      match['$or'] = [
        { email: { $regex: new RegExp(search, 'i') } },
        { phone: { $regex: new RegExp(search, 'i') } },
      ];
    }
    if (role) match['role'] = role;
    if (isActive !== undefined) match['isActive'] = isActive;
    if (city) match['seekerProfile.city'] = { $regex: new RegExp(city, 'i') };

    if (joinedFrom || joinedTo) {
      const range: Record<string, Date> = {};
      if (joinedFrom) range['$gte'] = new Date(joinedFrom);
      if (joinedTo) range['$lte'] = new Date(joinedTo);
      match['createdAt'] = range;
    }

    const [data, total] = await Promise.all([
      this.userModel
        .find(match)
        .select('-passwordHash')
        .sort(includeDeleted ? { deletedAt: 1, createdAt: -1 } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(match),
    ]);

    // Resolve schoolId → schoolName for recruiters in one batch query
    const schoolIds = data
      .filter((u: any) => u.role === Role.RECRUITER && u.recruiterProfile?.schoolId)
      .map((u: any) => new Types.ObjectId(u.recruiterProfile.schoolId));

    let schoolMap = new Map<string, string>();
    if (schoolIds.length > 0) {
      const schools = await this.schoolModel
        .find({ _id: { $in: schoolIds } })
        .select('name')
        .lean()
        .exec();
      schoolMap = new Map(schools.map((s: any) => [s._id.toString(), s.name]));
    }

    const enriched = data.map((u: any) => {
      if (u.role === Role.RECRUITER && u.recruiterProfile?.schoolId) {
        return {
          ...u,
          recruiterProfile: {
            ...u.recruiterProfile,
            schoolName: schoolMap.get(u.recruiterProfile.schoolId.toString()) ?? null,
          },
        };
      }
      return u;
    });

    return { data: enriched, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async createUser(dto: CreateAdminUserDto, adminId: string, adminEmail: string): Promise<{ message: string }> {
    const phone = normalizePhoneNumber(dto.phone);
    const existing = await this.userModel
      .findOne({ $or: [{ email: dto.email.toLowerCase() }, { phone }], deletedAt: null })
      .lean()
      .exec();
    if (existing) {
      const field = (existing as any).email === dto.email.toLowerCase() ? 'Email' : 'Phone';
      throw new ConflictException(`${field} already registered`);
    }
    const passwordHash = await bcrypt.hash(dto.password, 12);
    this.logger.log(`createUser: email=${dto.email.toLowerCase()} phone=${phone} role=${dto.role}`);
    const seekerProfile =
      dto.role === Role.TEACHER
        ? {
            fullName: dto.fullName ?? '',
            headline: null, bio: null, resumeUrl: null, city: null, state: null, availability: null,
            experienceYears: null, skills: [], certUrls: [], desiredCities: [],
            age: null, gender: null, maritalStatus: null, degrees: [],
            whatsappNumber: null, pincode: null, currentSchool: null, employmentType: null,
            expertise: [], academics: null, salaryRange: null,
            availableTimings: [], interestedToCover: [], indemnityInsurance: null,
            isRegisteredWithBoard: null, boardRegistrationName: null,
          }
        : null;
    const recruiterProfile =
      dto.role === Role.RECRUITER ? { fullName: dto.fullName ?? '', schoolId: null } : null;
    // Role.ADMIN: no profile needed — admin identity is email/phone

    const created = await this.userModel.create({
      role: dto.role,
      email: dto.email.toLowerCase(),
      phone,
      passwordHash,
      emailVerified: true,
      seekerProfile,
      recruiterProfile,
    });

    this.auditService.log(adminId, adminEmail, 'USER_CREATED', 'user', created._id.toString(), dto.email.toLowerCase(), {}, { role: dto.role, email: dto.email.toLowerCase() });
    return { message: 'User created successfully' };
  }

  async suspendUser(userId: string, adminId: string, adminEmail: string): Promise<void> {
    const user = await this.userModel.findOne({ _id: userId, deletedAt: null }).exec();
    if (!user) throw new NotFoundException('User not found');
    await this.userModel.findByIdAndUpdate(userId, { $set: { isActive: false } });
    this.auditService.log(adminId, adminEmail, 'USER_SUSPENDED', 'user', userId, (user as any).email ?? userId, { isActive: true }, { isActive: false });
  }

  async activateUser(userId: string, adminId: string, adminEmail: string): Promise<void> {
    const user = await this.userModel.findOne({ _id: userId, deletedAt: null }).exec();
    if (!user) throw new NotFoundException('User not found');
    await this.userModel.findByIdAndUpdate(userId, { $set: { isActive: true } });
    this.auditService.log(adminId, adminEmail, 'USER_ACTIVATED', 'user', userId, (user as any).email ?? userId, { isActive: false }, { isActive: true });
  }

  /**
   * Soft-deletes a user and cascades to everything they own. Payment and audit
   * records are deliberately left untouched for compliance. Existing access
   * tokens are rejected on the very next request since jwt.strategy re-checks
   * `isActive`/`deletedAt` live on every call. tokenVersion is bumped too, as
   * defense-in-depth belt-and-suspenders alongside that live check.
   */
  async deleteUser(userId: string, adminId: string, adminEmail: string): Promise<void> {
    const user = await this.userModel.findOne({ _id: userId, deletedAt: null }).exec();
    if (!user) throw new NotFoundException('User not found');

    const now = new Date();
    await this.userModel.findByIdAndUpdate(userId, {
      $set: { deletedAt: now, isActive: false },
      $inc: { tokenVersion: 1 },
    });

    if (user.role === Role.RECRUITER && user.recruiterProfile?.schoolId) {
      const schoolId = user.recruiterProfile.schoolId;
      await this.schoolModel.findByIdAndUpdate(schoolId, { $set: { deletedAt: now } });
      await this.jobModel.updateMany(
        { schoolId, status: JobStatus.ACTIVE, deletedAt: null },
        { $set: { status: JobStatus.AUTO_DISABLED } },
      );
      const openStates = [ApplicationState.INTERESTED, ApplicationState.SHORTLISTED, ApplicationState.PAID];
      await this.appModel.updateMany(
        { schoolId, state: { $in: openStates } },
        { $set: { state: ApplicationState.CLOSED, decisionReason: 'School account deleted by admin', decisionAt: now } },
      );
      await this.subscriptionModel.updateMany(
        { schoolId, status: SubscriptionStatus.ACTIVE, deletedAt: null },
        { $set: { status: SubscriptionStatus.CANCELLED } },
      );
    }

    this.auditService.log(adminId, adminEmail, 'USER_DELETED', 'user', userId, (user as any).email ?? userId,
      { deletedAt: null, isActive: true },
      { deletedAt: now, isActive: false },
    );
  }

  /**
   * Restores a soft-deleted user. Cascades restore the owned school and its
   * jobs (as AUTO_DISABLED — admin must manually reactivate each job).
   * Applications/subscriptions closed at delete time are NOT restored;
   * that's intentional, same as RxJobs4U's reference behaviour.
   */
  async restoreUser(userId: string, adminId: string, adminEmail: string): Promise<void> {
    const user = await this.userModel.findOne({ _id: userId, deletedAt: { $ne: null } }).exec();
    if (!user) throw new NotFoundException('Deleted user not found');

    await this.userModel.findByIdAndUpdate(userId, {
      $set: { deletedAt: null, isActive: true },
      $inc: { tokenVersion: 1 },
    });

    if (user.role === Role.RECRUITER && user.recruiterProfile?.schoolId) {
      // Jobs stay AUTO_DISABLED on restore — admin reactivates each one manually, same as delete-cascade leaves them.
      await this.schoolModel.findByIdAndUpdate(user.recruiterProfile.schoolId, { $set: { deletedAt: null } });
    }

    this.auditService.log(adminId, adminEmail, 'USER_RESTORED', 'user', userId, (user as any).email ?? userId,
      { deletedAt: user.deletedAt, isActive: false },
      { deletedAt: null, isActive: true },
    );
  }

  // ── Schools ───────────────────────────────────────────────────────────────────

  async listSchools(
    page = 1,
    limit = 20,
    verified?: boolean,
    search?: string,
    registeredFrom?: string,
    registeredTo?: string,
  ) {
    const skip = (page - 1) * limit;
    const match: Record<string, unknown> = { deletedAt: null };
    if (verified !== undefined) match['isVerified'] = verified;
    if (search) match['name'] = { $regex: new RegExp(search, 'i') };

    if (registeredFrom || registeredTo) {
      const range: Record<string, Date> = {};
      if (registeredFrom) range['$gte'] = new Date(registeredFrom);
      if (registeredTo) range['$lte'] = new Date(registeredTo);
      match['createdAt'] = range;
    }

    const [data, total] = await Promise.all([
      this.schoolModel
        .find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.schoolModel.countDocuments(match),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async verifySchool(schoolId: string, adminId: string, adminEmail: string): Promise<void> {
    const school = await this.schoolModel.findOne({ _id: schoolId, deletedAt: null }).exec();
    if (!school) throw new NotFoundException('School not found');
    const prevStatus = (school as any).verificationStatus ?? 'PENDING';
    await this.schoolModel.findByIdAndUpdate(schoolId, { $set: { isVerified: true, verificationStatus: VerificationStatus.VERIFIED } });
    this.eventEmitter.emit('school.verified', { schoolId, recruiterId: (school as any).adminUserId.toString() });
    this.auditService.log(adminId, adminEmail, 'SCHOOL_VERIFIED', 'school', schoolId, (school as any).name, { status: prevStatus }, { status: 'VERIFIED' });
  }

  async rejectSchool(schoolId: string, adminId: string, adminEmail: string): Promise<void> {
    const school = await this.schoolModel.findOne({ _id: schoolId, deletedAt: null }).exec();
    if (!school) throw new NotFoundException('School not found');
    const prevStatus = (school as any).verificationStatus ?? 'PENDING';
    await this.schoolModel.findByIdAndUpdate(schoolId, { $set: { isVerified: false, verificationStatus: VerificationStatus.REJECTED } });
    this.auditService.log(adminId, adminEmail, 'SCHOOL_REJECTED', 'school', schoolId, (school as any).name, { status: prevStatus }, { status: 'REJECTED' });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalSeekers,
      totalRecruiters,
      totalSchools,
      activeJobs,
      pendingSchools,
      filledJobs,
      revenueAll,
      revenueMonthly,
    ] = await Promise.all([
      this.userModel.countDocuments({ deletedAt: null }),
      this.userModel.countDocuments({ role: Role.TEACHER, deletedAt: null }),
      this.userModel.countDocuments({ role: Role.RECRUITER, deletedAt: null }),
      this.schoolModel.countDocuments({ deletedAt: null }),
      this.jobModel.countDocuments({ status: JobStatus.ACTIVE }),
      this.schoolModel.countDocuments({ verificationStatus: VerificationStatus.PENDING, deletedAt: null }),
      this.jobModel.countDocuments({ status: JobStatus.FILLED }),
      this.paymentModel.aggregate([
        { $match: { status: PaymentStatus.PAID } },
        { $group: { _id: null, total: { $sum: '$amountPaise' } } },
      ]),
      this.paymentModel.aggregate([
        { $match: { status: PaymentStatus.PAID, createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amountPaise' } } },
      ]),
    ]);

    const totalRevenuePaise: number = revenueAll[0]?.total ?? 0;
    const monthlyRevenuePaise: number = revenueMonthly[0]?.total ?? 0;

    return {
      totalUsers,
      totalSeekers,
      totalRecruiters,
      totalSchools,
      activeJobs,
      pendingSchools,
      filledJobs,
      totalRevenuePaise,
      monthlyRevenuePaise,
    };
  }
}
