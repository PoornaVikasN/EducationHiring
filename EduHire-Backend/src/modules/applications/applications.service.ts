import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApplicationState, JobStatus, JobType, Role } from '../../shared/enums';
import { SHORTLIST_PAY_WINDOW_MS } from '../../shared/constants/pricing';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Hospital, HospitalDocument } from '../hospitals/schemas/hospital.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Application, ApplicationDocument } from './schemas/application.schema';
import { DecisionDto, ShowInterestDto } from './dto/application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name) private appModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  // ── Seeker: show interest ─────────────────────────────────────────────────────

  async showInterest(currentUser: JwtPayload, jobId: string, dto: ShowInterestDto): Promise<ApplicationDocument> {
    if (currentUser.role !== Role.JOB_SEEKER) {
      throw new ForbiddenException('Only job seekers can apply');
    }

    const job = await this.jobModel
      .findOne({ _id: jobId, status: JobStatus.ACTIVE, deletedAt: null })
      .lean()
      .exec();

    if (!job) throw new NotFoundException('Job not found or no longer active');

    const existing = await this.appModel
      .findOne({ jobId: new Types.ObjectId(jobId), seekerId: new Types.ObjectId(currentUser.sub) })
      .lean()
      .exec();

    if (existing) throw new ConflictException('You have already shown interest in this job');

    const application = await this.appModel.create({
      jobId: new Types.ObjectId(jobId),
      hospitalId: job.hospitalId,
      seekerId: new Types.ObjectId(currentUser.sub),
      state: ApplicationState.INTERESTED,
      coverNote: dto.coverNote ?? null,
    });

    this.eventEmitter.emit('application.new', {
      hospitalId: job.hospitalId.toString(),
      seekerId: currentUser.sub,
      jobId,
      applicationId: application._id.toString(),
      jobTitle: job.title,
    });

    return application;
  }

  // ── Seeker: my applications ───────────────────────────────────────────────────

  async myApplications(currentUser: JwtPayload) {
    return this.appModel.aggregate([
      {
        $match: {
          seekerId: new Types.ObjectId(currentUser.sub),
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'job',
          pipeline: [{ $project: { title: 1, type: 1, city: 1, state: 1, department: 1, role: 1, status: 1 } }],
        },
      },
      { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'hospitals',
          localField: 'hospitalId',
          foreignField: '_id',
          as: 'hospital',
          pipeline: [{
            $project: {
              name: 1, city: 1, state: 1, logoUrl: 1, address: 1, pincode: 1,
              description: 1, website: 1, isVerified: 1,
              hospitalInfra: 1, noOfOperationTheatres: 1, noOfCabinsAndBeds: 1,
              email: '$contactEmail',
              phone: '$contactPhone',
            },
          }],
        },
      },
      { $unwind: { path: '$hospital', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
      {
        $project: {
          jobId: 1, hospitalId: 1,
          state: 1, coverNote: 1, shortlistedAt: 1, paymentDueBy: 1, paidAt: 1,
          hospitalRevealed: 1, decisionReason: 1, decisionAt: 1, createdAt: 1,
          job: 1,
          // Hospital name + basic info always visible (Option B: only contact details hidden until payment)
          hospital: {
            $cond: {
              if: { $or: [{ $eq: ['$hospitalRevealed', true] }, { $eq: ['$job.type', JobType.SOS] }] },
              then: '$hospital',
              else: {
                name: '$hospital.name',
                city: '$hospital.city',
                state: '$hospital.state',
                logoUrl: '$hospital.logoUrl',
                isVerified: '$hospital.isVerified',
              },
            },
          },
        },
      },
    ]);
  }

  // ── Recruiter: list applicants for a job ──────────────────────────────────────

  async jobApplicants(currentUser: JwtPayload, jobId: string) {
    // Verify recruiter owns the job's hospital
    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!hospital) throw new ForbiddenException('Hospital profile not found');

    const job = await this.jobModel
      .findOne({ _id: jobId, hospitalId: hospital._id, deletedAt: null })
      .lean()
      .exec();

    if (!job) throw new NotFoundException('Job not found');

    return this.appModel.aggregate([
      { $match: { jobId: new Types.ObjectId(jobId), deletedAt: null } },
      {
        $lookup: {
          from: 'users',
          localField: 'seekerId',
          foreignField: '_id',
          as: 'seeker',
          pipeline: [{
            $project: {
              'seekerProfile.fullName': 1,
              'seekerProfile.headline': 1,
              'seekerProfile.bio': 1,
              'seekerProfile.skills': 1,
              'seekerProfile.experienceYears': 1,
              'seekerProfile.city': 1,
              'seekerProfile.state': 1,
              'seekerProfile.resumeUrl': 1,
              'seekerProfile.expertise': 1,
              'seekerProfile.degrees': 1,
              'seekerProfile.availability': 1,
              'seekerProfile.age': 1,
              'seekerProfile.gender': 1,
              'seekerProfile.maritalStatus': 1,
              'seekerProfile.whatsappNumber': 1,
              'seekerProfile.pincode': 1,
              'seekerProfile.placeOfPractice': 1,
              'seekerProfile.typeOfPractice': 1,
              'seekerProfile.academics': 1,
              'seekerProfile.expectedSalaryLakhs': 1,
              'seekerProfile.availableTimings': 1,
              'seekerProfile.interestedToCover': 1,
              'seekerProfile.indemnityInsurance': 1,
              email: 1,
              phone: 1,
            },
          }],
        },
      },
      { $unwind: { path: '$seeker', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
    ]);
  }

  // ── Recruiter: shortlist ──────────────────────────────────────────────────────

  async shortlist(currentUser: JwtPayload, jobId: string, applicationId: string): Promise<ApplicationDocument> {
    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!hospital) throw new ForbiddenException('Hospital profile not found');

    const job = await this.jobModel
      .findOne({ _id: jobId, hospitalId: hospital._id, status: JobStatus.ACTIVE, deletedAt: null })
      .lean()
      .exec();

    if (!job) throw new NotFoundException('Job not found or not active');

    const app = await this.appModel
      .findOne({ _id: applicationId, jobId: new Types.ObjectId(jobId), state: ApplicationState.INTERESTED })
      .exec();

    if (!app) throw new NotFoundException('Application not found or already actioned');

    // SOS: no payment — shortlist goes straight to WON logic? No — for SOS shortlist → WON separately
    // Actually for SOS we just allow the recruiter to mark WON directly (no payment step)
    if (job.type === JobType.SOS) {
      throw new BadRequestException('Use mark-won for SOS jobs directly');
    }

    const paymentDueBy = new Date(Date.now() + SHORTLIST_PAY_WINDOW_MS);
    const updated = await this.appModel
      .findByIdAndUpdate(
        applicationId,
        {
          $set: {
            state: ApplicationState.SHORTLISTED,
            shortlistedAt: new Date(),
            shortlistedByUserId: new Types.ObjectId(currentUser.sub),
            paymentDueBy,
          },
        },
        { returnDocument: 'after' },
      )
      .exec();

    if (!updated) throw new NotFoundException('Application not found');

    this.eventEmitter.emit('application.shortlisted', {
      seekerId: app.seekerId.toString(),
      jobId,
      applicationId,
      paymentDueBy,
    });

    return updated;
  }

  // ── Recruiter: mark WON ───────────────────────────────────────────────────────

  async markWon(currentUser: JwtPayload, jobId: string, applicationId: string, dto: DecisionDto): Promise<void> {
    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!hospital) throw new ForbiddenException('Hospital profile not found');

    const job = await this.jobModel
      .findOne({ _id: jobId, hospitalId: hospital._id, deletedAt: null })
      .lean()
      .exec();

    if (!job) throw new NotFoundException('Job not found');

    const app = await this.appModel
      .findOne({ _id: applicationId, jobId: new Types.ObjectId(jobId) })
      .exec();

    if (!app) throw new NotFoundException('Application not found');

    // For full-time: must be PAID. For SOS: must be INTERESTED or SHORTLISTED.
    const allowedStates =
      job.type === JobType.SOS
        ? [ApplicationState.INTERESTED, ApplicationState.SHORTLISTED]
        : [ApplicationState.PAID];

    if (!allowedStates.includes(app.state)) {
      throw new BadRequestException(`Application must be in ${allowedStates.join(' or ')} state`);
    }

    const now = new Date();

    // Mark this application WON
    await this.appModel.findByIdAndUpdate(applicationId, {
      $set: { state: ApplicationState.WON, decisionAt: now, decisionReason: dto.reason ?? null },
    });

    // Increment filledPositions and decide whether job is fully filled
    const updatedJob = await this.jobModel.findByIdAndUpdate(
      jobId,
      { $inc: { filledPositions: 1 } },
      { new: true },
    ).lean().exec();

    const remaining = (updatedJob?.openPositions ?? 1) - (updatedJob?.filledPositions ?? 1);

    if (remaining <= 0) {
      // All positions filled — close job and remaining open applications
      await this.jobModel.findByIdAndUpdate(jobId, { $set: { status: JobStatus.FILLED } });
      await this.appModel.updateMany(
        {
          jobId: new Types.ObjectId(jobId),
          _id: { $ne: new Types.ObjectId(applicationId) },
          state: { $in: [ApplicationState.INTERESTED, ApplicationState.SHORTLISTED, ApplicationState.PAID] },
        },
        { $set: { state: ApplicationState.CLOSED, decisionReason: 'All positions filled', decisionAt: now } },
      );
    }

    this.eventEmitter.emit('application.won', {
      seekerId: app.seekerId.toString(),
      hospitalId: hospital._id.toString(),
      jobId,
      applicationId,
      jobTitle: job.title,
    });
  }

  // ── Recruiter: mark CLOSED (decline) ─────────────────────────────────────────

  async markClosed(currentUser: JwtPayload, jobId: string, applicationId: string, dto: DecisionDto): Promise<void> {
    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!hospital) throw new ForbiddenException('Hospital profile not found');

    const app = await this.appModel
      .findOne({ _id: applicationId, jobId: new Types.ObjectId(jobId) })
      .exec();

    if (!app) throw new NotFoundException('Application not found');

    if ([ApplicationState.WON, ApplicationState.CLOSED].includes(app.state)) {
      throw new BadRequestException('Application is already finalised');
    }

    await this.appModel.findByIdAndUpdate(applicationId, {
      $set: {
        state: ApplicationState.CLOSED,
        decisionReason: dto.reason ?? 'Declined by hospital',
        decisionAt: new Date(),
      },
    });

    const closedJob = await this.jobModel.findById(jobId).select('title').lean().exec();
    this.eventEmitter.emit('application.closed', {
      seekerId: app.seekerId.toString(),
      jobId,
      applicationId,
      reason: dto.reason,
      jobTitle: closedJob?.title,
    });
  }

  // ── Recruiter: all PAID/WON applications (for chat list) ─────────────────────

  async paidForHospital(currentUser: JwtPayload) {
    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(currentUser.sub), deletedAt: null })
      .lean()
      .exec();

    if (!hospital) throw new ForbiddenException('Hospital profile not found');

    return this.appModel.aggregate([
      {
        $match: {
          hospitalId: hospital._id,
          state: { $in: [ApplicationState.PAID, ApplicationState.WON] },
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'jobs',
          localField: 'jobId',
          foreignField: '_id',
          as: 'job',
          pipeline: [{ $project: { title: 1, city: 1, state: 1, department: 1, role: 1 } }],
        },
      },
      { $unwind: { path: '$job', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'seekerId',
          foreignField: '_id',
          as: 'seeker',
          pipeline: [{ $project: { 'seekerProfile.fullName': 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$seeker', preserveNullAndEmptyArrays: true } },
      { $sort: { createdAt: -1 } },
    ]);
  }

  // ── Shortlist pay-window sweep (called by scheduler) ─────────────────────────

  async runPayWindowSweep(): Promise<number> {
    const result = await this.appModel.updateMany(
      {
        state: ApplicationState.SHORTLISTED,
        paymentDueBy: { $lte: new Date() },
        deletedAt: null,
      },
      {
        $set: {
          state: ApplicationState.CLOSED,
          decisionReason: 'PAY_WINDOW_EXPIRED',
          decisionAt: new Date(),
        },
      },
    );
    return result.modifiedCount;
  }

  // ── Mark application PAID (called by payments webhook) ───────────────────────

  async markPaid(applicationId: string, paymentId: string): Promise<void> {
    const app = await this.appModel
      .findOne({ _id: applicationId, state: ApplicationState.SHORTLISTED })
      .exec();

    if (!app) throw new NotFoundException('Application not found or not in SHORTLISTED state');

    await this.appModel.findByIdAndUpdate(applicationId, {
      $set: {
        state: ApplicationState.PAID,
        paidAt: new Date(),
        razorpayPaymentId: paymentId,
        hospitalRevealed: true,
      },
    });

    this.eventEmitter.emit('application.paid', {
      seekerId: app.seekerId.toString(),
      hospitalId: app.hospitalId.toString(),
      jobId: app.jobId.toString(),
      applicationId,
    });
  }
}
