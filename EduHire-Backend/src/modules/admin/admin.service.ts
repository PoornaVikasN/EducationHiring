import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Model, Types } from 'mongoose';
import { JobStatus, JobType, PaymentStatus, Role, VerificationStatus } from '../../shared/enums';
import { normalizePhoneNumber } from '../../utils/phone-normalizer';
import { AuditService } from '../audit/audit.service';
import { Hospital, HospitalDocument } from '../hospitals/schemas/hospital.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
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
  ) {
    const skip = (page - 1) * limit;
    const match: Record<string, unknown> = { deletedAt: null };

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
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.userModel.countDocuments(match),
    ]);

    // Resolve hospitalId → hospitalName for recruiters in one batch query
    const hospitalIds = data
      .filter((u: any) => u.role === Role.RECRUITER && u.recruiterProfile?.hospitalId)
      .map((u: any) => new Types.ObjectId(u.recruiterProfile.hospitalId));

    let hospitalMap = new Map<string, string>();
    if (hospitalIds.length > 0) {
      const hospitals = await this.hospitalModel
        .find({ _id: { $in: hospitalIds } })
        .select('name')
        .lean()
        .exec();
      hospitalMap = new Map(hospitals.map((h: any) => [h._id.toString(), h.name]));
    }

    const enriched = data.map((u: any) => {
      if (u.role === Role.RECRUITER && u.recruiterProfile?.hospitalId) {
        return {
          ...u,
          recruiterProfile: {
            ...u.recruiterProfile,
            hospitalName: hospitalMap.get(u.recruiterProfile.hospitalId.toString()) ?? null,
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
      dto.role === Role.JOB_SEEKER
        ? {
            fullName: dto.fullName ?? '',
            headline: null, bio: null, resumeUrl: null, city: null, state: null, availability: null,
            experienceYears: null, skills: [], certUrls: [], desiredCities: [], desiredJobTypes: [],
            age: null, gender: null, maritalStatus: null, degrees: [],
            whatsappNumber: null, pincode: null, placeOfPractice: null, typeOfPractice: null,
            expertise: [], academics: null, salaryRange: null,
            availableTimings: [], interestedToCover: [], indemnityInsurance: null,
            isRegisteredInCouncil: null, medicalCouncilName: null,
          }
        : null;
    const recruiterProfile =
      dto.role === Role.RECRUITER ? { fullName: dto.fullName ?? '', hospitalId: null } : null;
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

  // ── Hospitals ─────────────────────────────────────────────────────────────────

  async listHospitals(
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
      this.hospitalModel
        .find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.hospitalModel.countDocuments(match),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async verifyHospital(hospitalId: string, adminId: string, adminEmail: string): Promise<void> {
    const hospital = await this.hospitalModel.findOne({ _id: hospitalId, deletedAt: null }).exec();
    if (!hospital) throw new NotFoundException('Hospital not found');
    const prevStatus = (hospital as any).verificationStatus ?? 'PENDING';
    await this.hospitalModel.findByIdAndUpdate(hospitalId, { $set: { isVerified: true, verificationStatus: VerificationStatus.VERIFIED } });
    this.eventEmitter.emit('hospital.verified', { hospitalId, recruiterId: (hospital as any).adminUserId.toString() });
    this.auditService.log(adminId, adminEmail, 'HOSPITAL_VERIFIED', 'hospital', hospitalId, (hospital as any).name, { status: prevStatus }, { status: 'VERIFIED' });
  }

  async rejectHospital(hospitalId: string, adminId: string, adminEmail: string): Promise<void> {
    const hospital = await this.hospitalModel.findOne({ _id: hospitalId, deletedAt: null }).exec();
    if (!hospital) throw new NotFoundException('Hospital not found');
    const prevStatus = (hospital as any).verificationStatus ?? 'PENDING';
    await this.hospitalModel.findByIdAndUpdate(hospitalId, { $set: { isVerified: false, verificationStatus: VerificationStatus.REJECTED } });
    this.auditService.log(adminId, adminEmail, 'HOSPITAL_REJECTED', 'hospital', hospitalId, (hospital as any).name, { status: prevStatus }, { status: 'REJECTED' });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────────

  async getDashboardStats() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalSeekers,
      totalRecruiters,
      totalHospitals,
      activeJobs,
      sosActiveJobs,
      fullTimeActiveJobs,
      pendingHospitals,
      filledJobs,
      revenueAll,
      revenueMonthly,
    ] = await Promise.all([
      this.userModel.countDocuments({ deletedAt: null }),
      this.userModel.countDocuments({ role: Role.JOB_SEEKER, deletedAt: null }),
      this.userModel.countDocuments({ role: Role.RECRUITER, deletedAt: null }),
      this.hospitalModel.countDocuments({ deletedAt: null }),
      this.jobModel.countDocuments({ status: JobStatus.ACTIVE }),
      this.jobModel.countDocuments({ status: JobStatus.ACTIVE, type: JobType.SOS }),
      this.jobModel.countDocuments({ status: JobStatus.ACTIVE, type: JobType.FULL_TIME }),
      this.hospitalModel.countDocuments({ verificationStatus: VerificationStatus.PENDING, deletedAt: null }),
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
      totalHospitals,
      activeJobs,
      sosActiveJobs,
      fullTimeActiveJobs,
      pendingHospitals,
      filledJobs,
      totalRevenuePaise,
      monthlyRevenuePaise,
    };
  }
}
