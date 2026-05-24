import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ApplicationState,
  JobStatus,
  JobType,
  Role,
  SubscriptionStatus,
} from '../../shared/enums';
import { FULL_TIME_TTL_MS, SOS_TTL_MS } from '../../shared/constants/pricing';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { Hospital, HospitalDocument } from '../hospitals/schemas/hospital.schema';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { AuditService } from '../audit/audit.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsQueryDto } from './dto/jobs-query.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, JobDocument } from './schemas/job.schema';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Application.name) private appModel: Model<ApplicationDocument>,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────────

  async create(currentUser: JwtPayload, dto: CreateJobDto): Promise<JobDocument> {
    if (currentUser.role !== Role.RECRUITER) {
      throw new ForbiddenException('Only recruiters can post jobs');
    }

    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!hospital) {
      throw new BadRequestException('Complete your hospital profile before posting jobs');
    }

    const ttl = dto.type === JobType.SOS ? SOS_TTL_MS : FULL_TIME_TTL_MS;
    const expiresAt = new Date(Date.now() + ttl);

    // SOS: needs active subscription; go ACTIVE immediately if sub valid, else PENDING_SUBSCRIPTION
    // Full-time: needs ₹299 payment; go PENDING_PAYMENT
    let initialStatus: JobStatus;
    if (dto.type === JobType.SOS) {
      const activeSub = await this.subscriptionModel
        .findOne({
          hospitalId: hospital._id,
          status: SubscriptionStatus.ACTIVE,
          expiresAt: { $gt: new Date() },
          deletedAt: null,
        })
        .lean()
        .exec();
      initialStatus = activeSub ? JobStatus.ACTIVE : JobStatus.PENDING_SUBSCRIPTION;
    } else {
      initialStatus = JobStatus.PENDING_PAYMENT;
    }

    const location =
      dto.longitude !== undefined && dto.latitude !== undefined
        ? { type: 'Point' as const, coordinates: [dto.longitude, dto.latitude] as [number, number] }
        : null;

    const job = await this.jobModel.create({
      type: dto.type,
      status: initialStatus,
      hospitalId: hospital._id,
      title: dto.title,
      description: dto.description,
      requirements: dto.requirements ?? [],
      city: dto.city.trim(),
      state: dto.state.trim(),
      location,
      department: dto.department,
      role: dto.role,
      experienceMin: dto.experienceMin,
      experienceMax: dto.experienceMax,
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      expiresAt,
      jobTimingStart: dto.jobTimingStart ?? null,
      jobTimingEnd: dto.jobTimingEnd ?? null,
      noOfCasesPerMonth: dto.noOfCasesPerMonth ?? null,
      departmentRequirements: dto.departmentRequirements ?? [],
      specializations: dto.specializations ?? [],
      requiredDegree: dto.requiredDegree ?? null,
      jobDocumentUrl: dto.jobDocumentUrl ?? null,
      openPositions: dto.openPositions ?? 1,
    });

    if (initialStatus === JobStatus.ACTIVE) {
      this.eventEmitter.emit('job.activated', {
        jobId: job._id.toString(),
        type: job.type,
        city: job.city,
        title: job.title,
        department: job.department,
        jobLocation: (job.location as { coordinates?: [number, number] } | null | undefined)?.coordinates ?? null,
      });
    }

    return job;
  }

  // ── Public list (seekers + public) ───────────────────────────────────────────

  async findAll(query: JobsQueryDto) {
    const match: Record<string, unknown> = {
      status: JobStatus.ACTIVE,
      deletedAt: null,
    };
    if (query.type) match['type'] = query.type;
    if (query.city) match['city'] = { $regex: new RegExp(query.city, 'i') };
    if (query.department) match['department'] = { $regex: new RegExp(query.department, 'i') };
    if (query.role) match['role'] = { $regex: new RegExp(query.role, 'i') };
    if (query.expertise) match['departmentRequirements'] = { $in: [new RegExp(query.expertise, 'i')] };
    if (query.search) {
      match['$or'] = [
        { title: { $regex: new RegExp(query.search, 'i') } },
        { description: { $regex: new RegExp(query.search, 'i') } },
        { role: { $regex: new RegExp(query.search, 'i') } },
        { department: { $regex: new RegExp(query.search, 'i') } },
      ];
    }

    const skip = (query.page - 1) * query.limit;

    const [results, total] = await Promise.all([
      this.jobModel.aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'hospitals',
            localField: 'hospitalId',
            foreignField: '_id',
            as: 'hospital',
            pipeline: [{ $project: { name: 1, city: 1, logoUrl: 1, isVerified: 1 } }],
          },
        },
        { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: query.limit },
        // Don't expose salary for full-time until PAID — strip fields for public list
        {
          $project: {
            type: 1, status: 1, title: 1, description: 1, requirements: 1,
            city: 1, state: 1, department: 1, role: 1, experienceMin: 1, experienceMax: 1,
            expiresAt: 1, createdAt: 1, hospital: 1,
            salaryMin: 1, salaryMax: 1,
          },
        },
      ]),
      this.jobModel.countDocuments(match),
    ]);

    return {
      data: results,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  // ── Single job (public) ───────────────────────────────────────────────────────

  async findOne(id: string) {
    const [result] = await this.jobModel.aggregate([
      { $match: { _id: new Types.ObjectId(id), status: JobStatus.ACTIVE, deletedAt: null } },
      {
        $lookup: {
          from: 'hospitals',
          localField: 'hospitalId',
          foreignField: '_id',
          as: 'hospital',
          pipeline: [{ $project: { name: 1, city: 1, state: 1, logoUrl: 1, isVerified: 1, address: 1 } }],
        },
      },
      { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } },
    ]);

    if (!result) throw new NotFoundException('Job not found or no longer active');
    return result;
  }

  // ── Recruiter: single job by id (any status) ─────────────────────────────────

  async findMyJobById(currentUser: JwtPayload, jobId: string): Promise<JobDocument> {
    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();
    if (!hospital) throw new NotFoundException('Hospital profile not found');

    const job = await this.jobModel
      .findOne({ _id: new Types.ObjectId(jobId), hospitalId: hospital._id, deletedAt: null })
      .exec();
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  // ── Recruiter: my jobs ────────────────────────────────────────────────────────

  async findMyJobs(currentUser: JwtPayload, query: JobsQueryDto) {
    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!hospital) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    const match: Record<string, unknown> = {
      hospitalId: hospital._id,
      deletedAt: null,
    };
    if (query.type) match['type'] = query.type;

    const skip = (query.page - 1) * query.limit;
    const [results, total] = await Promise.all([
      this.jobModel
        .find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(query.limit)
        .lean()
        .exec(),
      this.jobModel.countDocuments(match),
    ]);

    return {
      data: results,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  // ── Recruiter: update ─────────────────────────────────────────────────────────

  async update(currentUser: JwtPayload, jobId: string, dto: UpdateJobDto): Promise<JobDocument> {
    const job = await this.jobModel.findOne({ _id: jobId, deletedAt: null }).exec();
    if (!job) throw new NotFoundException('Job not found');

    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!hospital || job.hospitalId.toString() !== (hospital._id as Types.ObjectId).toString()) {
      throw new ForbiddenException('Not authorised to update this job');
    }

    const update: Record<string, unknown> = { ...dto };
    if (dto.longitude !== undefined && dto.latitude !== undefined) {
      update['location'] = { type: 'Point', coordinates: [dto.longitude, dto.latitude] };
    }
    delete update['longitude'];
    delete update['latitude'];
    delete update['type']; // type is immutable once created

    const updated = await this.jobModel
      .findByIdAndUpdate(jobId, { $set: update }, { returnDocument: 'after' })
      .exec();

    if (!updated) throw new NotFoundException('Job not found');
    return updated;
  }

  // ── Recruiter: soft delete ────────────────────────────────────────────────────

  async remove(currentUser: JwtPayload, jobId: string): Promise<void> {
    const job = await this.jobModel.findOne({ _id: jobId, deletedAt: null }).exec();
    if (!job) throw new NotFoundException('Job not found');

    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!hospital || job.hospitalId.toString() !== (hospital._id as Types.ObjectId).toString()) {
      throw new ForbiddenException('Not authorised to delete this job');
    }

    const now = new Date();
    await this.jobModel.findByIdAndUpdate(jobId, { $set: { deletedAt: now } }).exec();

    // Close all active applications and notify seekers
    const ACTIVE_STATES = [ApplicationState.INTERESTED, ApplicationState.SHORTLISTED, ApplicationState.PAID];
    await this.appModel.updateMany(
      { jobId: new Types.ObjectId(jobId), state: { $in: ACTIVE_STATES } },
      { $set: { state: ApplicationState.CLOSED, decisionReason: 'Job was removed by the recruiter', decisionAt: now } },
    );
    const affected = await this.appModel.find({ jobId: new Types.ObjectId(jobId), state: ApplicationState.CLOSED, decisionReason: 'Job was removed by the recruiter' }).select('seekerId').lean().exec();
    for (const a of affected) {
      this.eventEmitter.emit('application.closed', { seekerId: a.seekerId.toString(), jobId, jobTitle: job.title, reason: 'Job was removed' });
    }
  }

  // ── Admin: all jobs ───────────────────────────────────────────────────────────

  async adminFindAll(query: JobsQueryDto) {
    const match: Record<string, unknown> = { deletedAt: null };
    if (query.type) match['type'] = query.type;
    if (query.status) match['status'] = query.status;
    if (query.city) match['city'] = { $regex: new RegExp(query.city, 'i') };
    if (query.dateFrom || query.dateTo) {
      const dateRange: Record<string, Date> = {};
      if (query.dateFrom) dateRange['$gte'] = new Date(query.dateFrom);
      if (query.dateTo) {
        const to = new Date(query.dateTo);
        to.setHours(23, 59, 59, 999);
        dateRange['$lte'] = to;
      }
      match['createdAt'] = dateRange;
    }

    const skip = (query.page - 1) * query.limit;
    const [results, total] = await Promise.all([
      this.jobModel.aggregate([
        { $match: match },
        {
          $lookup: {
            from: 'hospitals',
            localField: 'hospitalId',
            foreignField: '_id',
            as: 'hospital',
            pipeline: [{ $project: { name: 1, city: 1 } }],
          },
        },
        { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: query.limit },
      ]),
      this.jobModel.countDocuments(match),
    ]);

    return {
      data: results,
      meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
    };
  }

  async adminDisableJob(jobId: string, adminId?: string, adminEmail?: string): Promise<void> {
    const job = await this.jobModel.findOne({ _id: jobId, deletedAt: null }).exec();
    if (!job) throw new NotFoundException('Job not found');
    const prevStatus = (job as any).status;
    const now = new Date();
    await this.jobModel
      .findByIdAndUpdate(jobId, { $set: { status: JobStatus.DISABLED_BY_ADMIN } })
      .exec();
    if (adminId && adminEmail) {
      this.auditService.log(adminId, adminEmail, 'JOB_DISABLED', 'job', jobId, (job as any).title ?? jobId,
        { status: prevStatus },
        { status: JobStatus.DISABLED_BY_ADMIN },
      );
    }

    // Close active applications and notify seekers
    const ACTIVE_STATES = [ApplicationState.INTERESTED, ApplicationState.SHORTLISTED, ApplicationState.PAID];
    await this.appModel.updateMany(
      { jobId: new Types.ObjectId(jobId), state: { $in: ACTIVE_STATES } },
      { $set: { state: ApplicationState.CLOSED, decisionReason: 'Job was disabled by admin', decisionAt: now } },
    );
    const affected = await this.appModel.find({ jobId: new Types.ObjectId(jobId), state: ApplicationState.CLOSED, decisionReason: 'Job was disabled by admin' }).select('seekerId').lean().exec();
    for (const a of affected) {
      this.eventEmitter.emit('application.closed', { seekerId: a.seekerId.toString(), jobId, jobTitle: job.title, reason: 'Job was taken down' });
    }
  }

  // ── Expiry sweep (called by scheduler) ───────────────────────────────────────

  async runExpirySweep(): Promise<{ sosDisabled: number; fullTimeExpired: number }> {
    const now = new Date();

    const [sosResult, ftResult] = await Promise.all([
      this.jobModel.updateMany(
        { type: JobType.SOS, status: JobStatus.ACTIVE, expiresAt: { $lte: now }, deletedAt: null },
        { $set: { status: JobStatus.AUTO_DISABLED } },
      ),
      this.jobModel.updateMany(
        { type: JobType.FULL_TIME, status: JobStatus.ACTIVE, expiresAt: { $lte: now }, deletedAt: null },
        { $set: { status: JobStatus.EXPIRED } },
      ),
    ]);

    return {
      sosDisabled: sosResult.modifiedCount,
      fullTimeExpired: ftResult.modifiedCount,
    };
  }

  // ── Activate SOS jobs for newly subscribed hospital ──────────────────────────

  async activatePendingSosJobs(hospitalId: Types.ObjectId): Promise<number> {
    const result = await this.jobModel.updateMany(
      { hospitalId, type: JobType.SOS, status: JobStatus.PENDING_SUBSCRIPTION, deletedAt: null },
      { $set: { status: JobStatus.ACTIVE, expiresAt: new Date(Date.now() + SOS_TTL_MS) } },
    );
    return result.modifiedCount;
  }

  // ── Activate full-time job after payment ─────────────────────────────────────

  async activateAfterPayment(jobId: string, paymentId: string): Promise<void> {
    await this.jobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: JobStatus.ACTIVE,
        postPaymentId: paymentId,
        expiresAt: new Date(Date.now() + FULL_TIME_TTL_MS),
      },
    });
  }

  // ── Boost (re-activate expired full-time) ────────────────────────────────────

  async boostJob(jobId: string): Promise<void> {
    const job = await this.jobModel.findOne({ _id: jobId, deletedAt: null }).exec();
    if (!job) throw new NotFoundException('Job not found');
    if (job.type !== JobType.FULL_TIME) throw new BadRequestException('Only full-time jobs can be boosted');

    await this.jobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: JobStatus.ACTIVE,
        isBoosted: true,
        expiresAt: new Date(Date.now() + FULL_TIME_TTL_MS),
      },
    });
  }

  // ── Fill job (mark WON from applications module) ─────────────────────────────

  async markFilled(jobId: Types.ObjectId): Promise<void> {
    await this.jobModel.findByIdAndUpdate(jobId, { $set: { status: JobStatus.FILLED } });
  }
}
