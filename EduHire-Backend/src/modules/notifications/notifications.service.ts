import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import * as webpush from 'web-push';
import { Role, NotificationKind } from '../../shared/enums';
import { School, SchoolDocument } from '../schools/schemas/school.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { SystemConfigService } from '../system-config/system-config.service';
import { EmailService } from './email.service';
import { NotificationsGateway } from './notifications.gateway';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { WhatsAppService } from './whatsapp.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name) private notifModel: Model<NotificationDocument>,
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private gateway: NotificationsGateway,
    private emailService: EmailService,
    private configService: ConfigService,
    private whatsAppService: WhatsAppService,
    private systemConfigService: SystemConfigService,
  ) {
    const publicKey = this.configService.get<string>('VAPID_PUBLIC_KEY');
    const privateKey = this.configService.get<string>('VAPID_PRIVATE_KEY');
    const subject = this.configService.get<string>('VAPID_SUBJECT');
    if (publicKey && privateKey && subject) {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    }
  }

  // ── Core: persist + emit ──────────────────────────────────────────────────────

  async notify(
    userId: string,
    kind: NotificationKind,
    title: string,
    body: string,
    link?: string,
  ): Promise<void> {
    const doc = await this.notifModel.create({
      userId: new Types.ObjectId(userId),
      kind,
      title,
      body,
      link: link ?? null,
    });

    // Real-time push via Socket.IO
    this.gateway.sendToUser(userId, {
      id: doc._id.toString(),
      kind,
      title,
      body,
      link: link ?? null,
      createdAt: (doc as unknown as { createdAt: Date }).createdAt,
    });

    // Browser push notification (Web Push / VAPID) — fire-and-forget
    this.sendWebPush(userId, title, body, link).catch(() => {});
  }

  private async sendWebPush(userId: string, title: string, body: string, link?: string | null): Promise<void> {
    const vapidConfigured = !!this.configService.get('VAPID_PUBLIC_KEY');
    if (!vapidConfigured) return;

    const user = await this.userModel.findById(userId).select('pushSubscription').lean().exec();
    if (!user?.pushSubscription) return;

    try {
      const subscription = JSON.parse(user.pushSubscription);
      await webpush.sendNotification(
        subscription,
        JSON.stringify({ title, body, link: link ?? '/' }),
      );
    } catch (err: unknown) {
      // Subscription expired or invalid — clear it
      const status = (err as { statusCode?: number })?.statusCode;
      if (status === 410 || status === 404) {
        await this.userModel.updateOne({ _id: userId }, { $set: { pushSubscription: null } });
      }
    }
  }

  // ── List for current user ─────────────────────────────────────────────────────

  async listForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [data, total, unread] = await Promise.all([
      this.notifModel
        .find({ userId: new Types.ObjectId(userId), deletedAt: null })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notifModel.countDocuments({ userId: new Types.ObjectId(userId), deletedAt: null }),
      this.notifModel.countDocuments({ userId: new Types.ObjectId(userId), read: false, deletedAt: null }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit), unread } };
  }

  async markAllRead(userId: string): Promise<void> {
    await this.notifModel.updateMany(
      { userId: new Types.ObjectId(userId), read: false },
      { $set: { read: true } },
    );
  }

  async markOneRead(notificationId: string, userId: string): Promise<void> {
    await this.notifModel.updateOne(
      { _id: notificationId, userId: new Types.ObjectId(userId) },
      { $set: { read: true } },
    );
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async getRecruiterIdForSchool(schoolId: string): Promise<string | null> {
    const school = await this.schoolModel
      .findById(schoolId)
      .select('adminUserId')
      .lean()
      .exec();
    return school?.adminUserId?.toString() ?? null;
  }

  // ── Event listeners ───────────────────────────────────────────────────────────

  @OnEvent('application.new')
  async onApplicationNew(payload: { schoolId: string; seekerId: string; jobId: string; applicationId: string; jobTitle?: string }) {
    const recruiterId = await this.getRecruiterIdForSchool(payload.schoolId);
    if (recruiterId) {
      await this.notify(
        recruiterId,
        NotificationKind.NEW_INTEREST,
        'New interest in your job posting',
        'A teacher has expressed interest. Review their profile in Applicants.',
        `/recruiter/applicants?job=${payload.jobId}`,
      );
    }

    // Confirmation email to seeker
    const seeker = await this.userModel.findById(payload.seekerId).select('email seekerProfile').lean().exec();
    if (seeker?.email) {
      this.emailService.sendApplicationReceivedEmail(
        seeker.email,
        (seeker.seekerProfile as { fullName?: string } | null)?.fullName ?? 'Teacher',
        payload.jobTitle ?? 'the position',
      ).catch(() => {});
    }
  }

  @OnEvent('application.shortlisted')
  async onShortlisted(payload: {
    seekerId: string;
    jobId: string;
    applicationId: string;
    paymentDueBy: Date | null;
  }) {
    // Message must match the actual gating — under the default config (TEACHER_PAID_ENABLED
    // off) there is no payment step at all. The fee itself is never hardcoded — always
    // read live from SystemConfig (D29) so this copy can never drift from the real amount.
    const teacherPaidEnabled = await this.systemConfigService.getSettingBoolean('TEACHER_PAID_ENABLED', false);
    let body = 'The school will be in touch soon. Check your chat for updates.';
    if (teacherPaidEnabled) {
      try {
        const feePaise = await this.systemConfigService.getPricePaise('APPLICATION_FEE_PAISE');
        body = `Pay ₹${(feePaise / 100).toLocaleString('en-IN')} within 48 hours to confirm your interview and reveal school details.`;
      } catch {
        body = 'Payment is required within 48 hours to confirm your interview and reveal school details — check your applications.';
      }
    }
    await this.notify(
      payload.seekerId,
      NotificationKind.APPLICATION_SHORTLISTED,
      'You have been shortlisted! 🎉',
      body,
      `/applications`,
    );
  }

  @OnEvent('application.paid')
  async onApplicationPaid(payload: {
    seekerId: string;
    schoolId: string;
    jobId: string;
    applicationId: string;
    jobTitle?: string;
  }) {
    // Notify seeker
    await this.notify(
      payload.seekerId,
      NotificationKind.PAYMENT_SUCCESS,
      'Payment successful!',
      'School contact details are now revealed. Check your applications.',
      '/applications',
    );

    // Notify recruiter
    const recruiterId = await this.getRecruiterIdForSchool(payload.schoolId);
    if (recruiterId) {
      let feeLabel = 'the application fee';
      try {
        const feePaise = await this.systemConfigService.getPricePaise('APPLICATION_FEE_PAISE');
        feeLabel = `₹${(feePaise / 100).toLocaleString('en-IN')}`;
      } catch {
        // No fallback number — the price is unset, so we say it generically rather than
        // inventing an amount (D29: no hardcoded pricing, ever, not even as a fallback).
      }

      await this.notify(
        recruiterId,
        NotificationKind.APPLICANT_PAID,
        'An applicant has confirmed interest 💳',
        `A shortlisted teacher paid ${feeLabel}. Their contact details are now visible to you in Applicants.`,
        `/recruiter/applicants?job=${payload.jobId}`,
      );

      const recruiter = await this.userModel.findById(recruiterId).select('email').lean().exec();
      if (recruiter?.email) {
        this.emailService.sendApplicantPaidEmail(recruiter.email, payload.jobTitle ?? 'the position', feeLabel).catch(() => {});
      }
    }

    // Payment confirmation email to seeker
    const seeker = await this.userModel.findById(payload.seekerId).select('email seekerProfile').lean().exec();
    const school = await this.schoolModel.findById(payload.schoolId).select('name').lean().exec();
    if (seeker?.email) {
      this.emailService.sendPaymentConfirmationEmail(
        seeker.email,
        (seeker.seekerProfile as { fullName?: string } | null)?.fullName ?? 'Teacher',
        payload.jobTitle ?? 'the position',
        school?.name ?? 'the school',
      ).catch(() => {});
    }
  }

  @OnEvent('application.won')
  async onApplicationWon(payload: { seekerId: string; jobId: string; applicationId: string; jobTitle?: string }) {
    await this.notify(
      payload.seekerId,
      NotificationKind.APPLICATION_WON,
      'Congratulations! You got the job! 🎊',
      'The school has confirmed your hire. Check your applications for details.',
      '/applications',
    );

    // Email to seeker
    const seeker = await this.userModel.findById(payload.seekerId).select('email seekerProfile').lean().exec();
    if (seeker?.email) {
      this.emailService.sendApplicationWonEmail(
        seeker.email,
        (seeker.seekerProfile as { fullName?: string } | null)?.fullName ?? 'Teacher',
        payload.jobTitle ?? 'the position',
      ).catch(() => {});
    }

    // Admin in-app notification for hire confirmation
    const admins = await this.userModel.find({ role: Role.ADMIN, isActive: true, deletedAt: null }).select('_id').lean().exec();
    await Promise.all(admins.map((a) =>
      this.notify(
        a._id.toString(),
        NotificationKind.SYSTEM_ALERT,
        'Hire confirmed',
        `A seeker was hired for job ${payload.jobTitle ?? payload.jobId}. Review vacancies if needed.`,
        '/admin/jobs',
      ),
    ));
  }

  @OnEvent('application.closed')
  async onApplicationClosed(payload: { seekerId: string; jobId: string; reason?: string; jobTitle?: string }) {
    await this.notify(
      payload.seekerId,
      NotificationKind.APPLICATION_CLOSED,
      'Application closed',
      payload.reason ?? 'Your application has been closed by the school.',
      '/applications',
    );

    // Closure email to seeker
    const seeker = await this.userModel.findById(payload.seekerId).select('email seekerProfile').lean().exec();
    if (seeker?.email) {
      this.emailService.sendApplicationClosedEmail(
        seeker.email,
        (seeker.seekerProfile as { fullName?: string } | null)?.fullName ?? 'Teacher',
        payload.jobTitle ?? 'the position',
        payload.reason,
      ).catch(() => {});
    }
  }

  @OnEvent('school.verified')
  async onSchoolVerified(payload: { schoolId: string; recruiterId: string }) {
    await this.notify(
      payload.recruiterId,
      NotificationKind.SCHOOL_VERIFIED,
      'Your school is verified! ✅',
      'Admin has approved your school profile. You can now post jobs and view applicants.',
      '/recruiter/jobs',
    );

    const recruiter = await this.userModel.findById(payload.recruiterId).select('email recruiterProfile').lean().exec();
    if (recruiter?.email) {
      this.emailService.sendSchoolVerifiedEmail(
        recruiter.email,
        (recruiter.recruiterProfile as { fullName?: string } | null)?.fullName ?? 'there',
      ).catch(() => {});
    }
  }

  @OnEvent('school.registered')
  async onSchoolRegistered(payload: { schoolId: string; schoolName: string }) {
    // Notify all active admins
    const admins = await this.userModel
      .find({ role: Role.ADMIN, isActive: true, deletedAt: null })
      .select('_id')
      .lean()
      .exec();

    await Promise.all(
      admins.map((admin) =>
        this.notify(
          admin._id.toString(),
          NotificationKind.SCHOOL_REGISTERED,
          'New school registration',
          `"${payload.schoolName}" has registered and is awaiting verification.`,
          '/admin/schools',
        ),
      ),
    );
  }

  @OnEvent('subscription.activated')
  async onSubscriptionActivated(payload: { schoolId: string; amountPaise?: number; expiresAt?: Date }) {
    this.logger.log(`Subscription activated for school ${payload.schoolId}`);

    const school = await this.schoolModel.findById(payload.schoolId).select('adminUserId').lean().exec();
    if (!school?.adminUserId) return;
    const recruiter = await this.userModel.findById(school.adminUserId).select('email recruiterProfile').lean().exec();
    if (!recruiter?.email) return;

    this.emailService.sendSubscriptionActivatedEmail(
      recruiter.email,
      (recruiter.recruiterProfile as { fullName?: string } | null)?.fullName ?? 'there',
      payload.expiresAt ?? new Date(),
      payload.amountPaise,
    ).catch(() => {});
  }

  @OnEvent('job.activated')
  async onJobActivated(payload: { jobId: string; city: string; title: string; department?: string; jobLocation?: [number, number] | null }) {
    // Build base filter — all active teachers who opted into new-job alerts
    const seekerFilter: Record<string, unknown> = {
      role: Role.TEACHER,
      'seekerProfile.desiredCities': { $in: [payload.city] },
      alertNewJobs: true,
      deletedAt: null,
      isActive: true,
    };

    // ── In-app + web push notifications (all matching seekers) ───────────────
    // Note: pushSubscription filter removed — notify() → sendWebPush() handles
    // the subscription check internally; seekers without push still get in-app.
    const BATCH = 50;
    let skip = 0;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const seekers = await this.userModel
        .find(seekerFilter)
        .select('_id email seekerProfile.fullName')
        .lean()
        .skip(skip)
        .limit(BATCH)
        .exec();

      if (seekers.length === 0) break;

      await Promise.allSettled(
        seekers.map((seeker) =>
          this.notify(
            seeker._id.toString(),
            NotificationKind.NEW_JOB_IN_LOCATION,
            `New job in ${payload.city}`,
            `${payload.title} — a new opportunity matching your location preference.`,
            `/jobs/${payload.jobId}`,
          ),
        ),
      );

      if (seekers.length < BATCH) break;
      skip += BATCH;
    }

    // ── Radius-based alerts (seekers near the job, not already matched by city name) ──
    if (payload.jobLocation) {
      const radiusKm = await this.systemConfigService.getSettingNumber('JOB_ALERT_RADIUS_KM', 30);
      const radiusM = radiusKm * 1_000;

      const radiusFilter: Record<string, unknown> = {
        role: Role.TEACHER,
        'seekerProfile.location': {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: payload.jobLocation },
            $maxDistance: radiusM,
          },
        },
        'seekerProfile.desiredCities': { $nin: [payload.city] }, // skip already-notified by city match
        alertNewJobs: true,
        deletedAt: null,
        isActive: true,
      };

      let rSkip = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const rSeekers = await this.userModel
          .find(radiusFilter)
          .select('_id seekerProfile.fullName')
          .lean()
          .skip(rSkip)
          .limit(BATCH)
          .exec();

        if (rSeekers.length === 0) break;

        await Promise.allSettled(
          rSeekers.map((seeker) =>
            this.notify(
              seeker._id.toString(),
              NotificationKind.NEW_JOB_IN_LOCATION,
              `New job near you`,
              `${payload.title} in ${payload.city} — within ${radiusKm} km of your saved location.`,
              `/jobs/${payload.jobId}`,
            ),
          ),
        );

        if (rSeekers.length < BATCH) break;
        rSkip += BATCH;
      }
    }
  }
}
