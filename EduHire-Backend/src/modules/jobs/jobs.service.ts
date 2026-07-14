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
  Role,
  SubscriptionStatus,
} from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { School, SchoolDocument } from '../schools/schemas/school.schema';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { AuditService } from '../audit/audit.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsQueryDto } from './dto/jobs-query.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, JobDocument } from './schemas/job.schema';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(Application.name) private appModel: Model<ApplicationDocument>,
    private eventEmitter: EventEmitter2,
    private auditService: AuditService,
    private systemConfigService: SystemConfigService,
  ) {}

  // ── Create ────────────────────────────────────────────────────────────────────

  async create(currentUser: JwtPayload, dto: CreateJobDto): Promise<JobDocument> {
    if (currentUser.role !== Role.RECRUITER) {
      throw new ForbiddenException('Only recruiters can post jobs');
    }

    const school = await this.schoolModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!school) {
      throw new BadRequestException('Complete your school profile before posting jobs');
    }

    const jobTtlMs = await this.systemConfigService.getJobListingDurationMs();
    const expiresAt = new Date(Date.now() + jobTtlMs);

    // Determine whether this posting goes live immediately: paid gating can be
    // switched off entirely, or the school can have an active subscription, or
    // still be within its free-tier monthly quota.
    const paidEnabled = await this.systemConfigService.getSettingBoolean('SCHOOL_PAID_ENABLED', true);

    if (paidEnabled) {
      const activeSub = await this.subscriptionModel
        .findOne({
          schoolId: school._id,
          status: SubscriptionStatus.ACTIVE,
          expiresAt: { $gt: new Date() },
          deletedAt: null,
        })
        .lean()
        .exec();

      if (!activeSub) {
        const freeTierLimit = await this.systemConfigService.getSettingNumber('FREE_TIER_JOB_LIMIT', 2);
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const jobsThisMonth = await this.jobModel.countDocuments({
          schoolId: school._id,
          createdAt: { $gte: monthStart },
          deletedAt: null,
        });

        if (jobsThisMonth >= freeTierLimit) {
          throw new BadRequestException(
            'Free posting limit reached this month — subscribe for unlimited job posts',
          );
        }
      }
    }

    const location =
      dto.longitude !== undefined && dto.latitude !== undefined
        ? { type: 'Point' as const, coordinates: [dto.longitude, dto.latitude] as [number, number] }
        : null;

    const job = await this.jobModel.create({
      status: JobStatus.ACTIVE,
      schoolId: school._id,
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

    this.eventEmitter.emit('job.activated', {
      jobId: job._id.toString(),
      city: job.city,
      title: job.title,
      department: job.department,
      jobLocation: (job.location as { coordinates?: [number, number] } | null | undefined)?.coordinates ?? null,
    });

    return job;
  }

  // ── Public list (seekers + public) ───────────────────────────────────────────

  async findAll(query: JobsQueryDto) {
    const match: Record<string, unknown> = {
      status: JobStatus.ACTIVE,
      deletedAt: null,
    };
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
            from: 'schools',
            localField: 'schoolId',
            foreignField: '_id',
            as: 'school',
            pipeline: [{ $project: { name: 1, city: 1, logoUrl: 1, isVerified: 1 } }],
          },
        },
        { $unwind: { path: '$school', preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: query.limit },
        {
          $project: {
            status: 1, title: 1, description: 1, requirements: 1,
            city: 1, state: 1, department: 1, role: 1, experienceMin: 1, experienceMax: 1,
            expiresAt: 1, createdAt: 1, school: 1,
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
          from: 'schools',
          localField: 'schoolId',
          foreignField: '_id',
          as: 'school',
          pipeline: [{ $project: { name: 1, city: 1, state: 1, logoUrl: 1, isVerified: 1, address: 1 } }],
        },
      },
      { $unwind: { path: '$school', preserveNullAndEmptyArrays: true } },
    ]);

    if (!result) throw new NotFoundException('Job not found or no longer active');
    return result;
  }

  // ── Recruiter: single job by id (any status) ─────────────────────────────────

  async findMyJobById(currentUser: JwtPayload, jobId: string): Promise<JobDocument> {
    const school = await this.schoolModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();
    if (!school) throw new NotFoundException('School profile not found');

    const job = await this.jobModel
      .findOne({ _id: new Types.ObjectId(jobId), schoolId: school._id, deletedAt: null })
      .exec();
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  // ── Recruiter: my jobs ────────────────────────────────────────────────────────

  async findMyJobs(currentUser: JwtPayload, query: JobsQueryDto) {
    const school = await this.schoolModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!school) return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };

    const match: Record<string, unknown> = {
      schoolId: school._id,
      deletedAt: null,
    };

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

    const school = await this.schoolModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!school || job.schoolId.toString() !== (school._id as Types.ObjectId).toString()) {
      throw new ForbiddenException('Not authorised to update this job');
    }

    const update: Record<string, unknown> = { ...dto };
    if (dto.longitude !== undefined && dto.latitude !== undefined) {
      update['location'] = { type: 'Point', coordinates: [dto.longitude, dto.latitude] };
    }
    delete update['longitude'];
    delete update['latitude'];

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

    const school = await this.schoolModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!school || job.schoolId.toString() !== (school._id as Types.ObjectId).toString()) {
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
            from: 'schools',
            localField: 'schoolId',
            foreignField: '_id',
            as: 'school',
            pipeline: [{ $project: { name: 1, city: 1 } }],
          },
        },
        { $unwind: { path: '$school', preserveNullAndEmptyArrays: true } },
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

  // Admin: delete job (soft delete — same cascade as recruiter's own remove(), plus audit log)
  async adminRemoveJob(jobId: string, adminId: string, adminEmail: string): Promise<void> {
    const job = await this.jobModel.findOne({ _id: jobId, deletedAt: null }).exec();
    if (!job) throw new NotFoundException('Job not found');

    const now = new Date();
    await this.jobModel.findByIdAndUpdate(jobId, { $set: { deletedAt: now } }).exec();

    this.auditService.log(adminId, adminEmail, 'JOB_DELETED', 'job', jobId, job.title ?? jobId,
      { deletedAt: null },
      { deletedAt: now },
    );

    // Close all active applications and notify seekers
    const ACTIVE_STATES = [ApplicationState.INTERESTED, ApplicationState.SHORTLISTED, ApplicationState.PAID];
    await this.appModel.updateMany(
      { jobId: new Types.ObjectId(jobId), state: { $in: ACTIVE_STATES } },
      { $set: { state: ApplicationState.CLOSED, decisionReason: 'Job was removed by admin', decisionAt: now } },
    );
    const affected = await this.appModel.find({ jobId: new Types.ObjectId(jobId), state: ApplicationState.CLOSED, decisionReason: 'Job was removed by admin' }).select('seekerId').lean().exec();
    for (const a of affected) {
      this.eventEmitter.emit('application.closed', { seekerId: a.seekerId.toString(), jobId, jobTitle: job.title, reason: 'Job was removed' });
    }
  }

  // ── Expiry sweep (called by scheduler) ───────────────────────────────────────

  async runExpirySweep(): Promise<{ expired: number }> {
    const now = new Date();

    const result = await this.jobModel.updateMany(
      { status: JobStatus.ACTIVE, expiresAt: { $lte: now }, deletedAt: null },
      { $set: { status: JobStatus.EXPIRED } },
    );

    return { expired: result.modifiedCount };
  }

  // ── Boost (re-activate an expired job) ────────────────────────────────────────

  async boostJob(jobId: string): Promise<void> {
    const job = await this.jobModel.findOne({ _id: jobId, deletedAt: null }).exec();
    if (!job) throw new NotFoundException('Job not found');

    const jobTtlMs = await this.systemConfigService.getJobListingDurationMs();
    await this.jobModel.findByIdAndUpdate(jobId, {
      $set: {
        status: JobStatus.ACTIVE,
        isBoosted: true,
        expiresAt: new Date(Date.now() + jobTtlMs),
      },
    });
  }

  // ── Fill job (mark WON from applications module) ─────────────────────────────

  async markFilled(jobId: Types.ObjectId): Promise<void> {
    await this.jobModel.findByIdAndUpdate(jobId, { $set: { status: JobStatus.FILLED } });
  }
}
