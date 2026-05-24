import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { Model, Types } from 'mongoose';
import * as webpush from 'web-push';
import { JobType, Role, NotificationKind } from '../../shared/enums';
import { Hospital, HospitalDocument } from '../hospitals/schemas/hospital.schema';
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
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
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

  private async getRecruiterIdForHospital(hospitalId: string): Promise<string | null> {
    const hospital = await this.hospitalModel
      .findById(hospitalId)
      .select('adminUserId')
      .lean()
      .exec();
    return hospital?.adminUserId?.toString() ?? null;
  }

  // ── Event listeners ───────────────────────────────────────────────────────────

  @OnEvent('application.new')
  async onApplicationNew(payload: { hospitalId: string; seekerId: string; jobId: string; applicationId: string; jobTitle?: string }) {
    const recruiterId = await this.getRecruiterIdForHospital(payload.hospitalId);
    if (recruiterId) {
      await this.notify(
        recruiterId,
        NotificationKind.NEW_INTEREST,
        'New interest in your job posting',
        'A doctor has expressed interest. Review their profile in Applicants.',
        `/recruiter/applicants?job=${payload.jobId}`,
      );
    }

    // Confirmation email to seeker
    const seeker = await this.userModel.findById(payload.seekerId).select('email seekerProfile').lean().exec();
    if (seeker?.email) {
      this.emailService.sendApplicationReceivedEmail(
        seeker.email,
        (seeker.seekerProfile as { fullName?: string } | null)?.fullName ?? 'Doctor',
        payload.jobTitle ?? 'the position',
      ).catch(() => {});
    }
  }

  @OnEvent('application.shortlisted')
  async onShortlisted(payload: {
    seekerId: string;
    jobId: string;
    applicationId: string;
    paymentDueBy: Date;
  }) {
    await this.notify(
      payload.seekerId,
      NotificationKind.APPLICATION_SHORTLISTED,
      'You have been shortlisted! 🎉',
      'Pay ₹99 within 48 hours to confirm your interview and reveal hospital details.',
      `/applications`,
    );
  }

  @OnEvent('application.paid')
  async onApplicationPaid(payload: {
    seekerId: string;
    hospitalId: string;
    jobId: string;
    applicationId: string;
    jobTitle?: string;
  }) {
    // Notify seeker
    await this.notify(
      payload.seekerId,
      NotificationKind.PAYMENT_SUCCESS,
      'Payment successful!',
      'Hospital contact details are now revealed. Check your applications.',
      '/applications',
    );

    // Notify recruiter
    const recruiterId = await this.getRecruiterIdForHospital(payload.hospitalId);
    if (recruiterId) {
      await this.notify(
        recruiterId,
        NotificationKind.APPLICANT_PAID,
        'An applicant has confirmed interest 💳',
        'A shortlisted doctor paid ₹99. Their contact details are now visible to you in Applicants.',
        `/recruiter/applicants?job=${payload.jobId}`,
      );
    }

    // Payment confirmation email to seeker
    const seeker = await this.userModel.findById(payload.seekerId).select('email seekerProfile').lean().exec();
    const hospital = await this.hospitalModel.findById(payload.hospitalId).select('name').lean().exec();
    if (seeker?.email) {
      this.emailService.sendPaymentConfirmationEmail(
        seeker.email,
        (seeker.seekerProfile as { fullName?: string } | null)?.fullName ?? 'Doctor',
        payload.jobTitle ?? 'the position',
        hospital?.name ?? 'the hospital',
      ).catch(() => {});
    }
  }

  @OnEvent('application.won')
  async onApplicationWon(payload: { seekerId: string; jobId: string; applicationId: string; jobTitle?: string }) {
    await this.notify(
      payload.seekerId,
      NotificationKind.APPLICATION_WON,
      'Congratulations! You got the job! 🎊',
      'The hospital has confirmed your hire. Check your applications for details.',
      '/applications',
    );

    // Email to seeker
    const seeker = await this.userModel.findById(payload.seekerId).select('email seekerProfile').lean().exec();
    if (seeker?.email) {
      this.emailService.sendApplicationWonEmail(
        seeker.email,
        (seeker.seekerProfile as { fullName?: string } | null)?.fullName ?? 'Doctor',
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
      payload.reason ?? 'Your application has been closed by the hospital.',
      '/applications',
    );

    // Closure email to seeker
    const seeker = await this.userModel.findById(payload.seekerId).select('email seekerProfile').lean().exec();
    if (seeker?.email) {
      this.emailService.sendApplicationClosedEmail(
        seeker.email,
        (seeker.seekerProfile as { fullName?: string } | null)?.fullName ?? 'Doctor',
        payload.jobTitle ?? 'the position',
        payload.reason,
      ).catch(() => {});
    }
  }

  @OnEvent('hospital.verified')
  async onHospitalVerified(payload: { hospitalId: string; recruiterId: string }) {
    await this.notify(
      payload.recruiterId,
      NotificationKind.HOSPITAL_VERIFIED,
      'Your hospital is verified! ✅',
      'Admin has approved your hospital profile. You can now post jobs and view applicants.',
      '/recruiter/jobs',
    );
  }

  @OnEvent('hospital.registered')
  async onHospitalRegistered(payload: { hospitalId: string; hospitalName: string }) {
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
          NotificationKind.HOSPITAL_REGISTERED,
          'New hospital registration',
          `"${payload.hospitalName}" has registered and is awaiting verification.`,
          '/admin/hospitals',
        ),
      ),
    );
  }

  @OnEvent('subscription.activated')
  onSubscriptionActivated(payload: { hospitalId: string }) {
    this.logger.log(`Subscription activated for hospital ${payload.hospitalId}`);
  }

  @OnEvent('job.activated')
  async onJobActivated(payload: { jobId: string; type: JobType; city: string; title: string; department?: string; jobLocation?: [number, number] | null }) {
    const alertField = payload.type === JobType.SOS ? 'alertSosJobs' : 'alertFtJobs';
    const isSos = payload.type === JobType.SOS;

    // Build base filter — for SOS, only notify seekers with an active subscription
    const seekerFilter: Record<string, unknown> = {
      role: Role.JOB_SEEKER,
      'seekerProfile.desiredCities': { $in: [payload.city] },
      [alertField]: true,
      deletedAt: null,
      isActive: true,
    };
    if (isSos) {
      seekerFilter['seekerSosSubscribedUntil'] = { $gt: new Date() };
    }

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
            `New ${isSos ? 'SOS ' : ''}job in ${payload.city}`,
            `${payload.title} — a new opportunity matching your location preference.`,
            `/jobs/${payload.jobId}`,
          ),
        ),
      );

      // Email alert for SOS jobs only — fire-and-forget per seeker
      if (isSos) {
        for (const seeker of seekers) {
          const email = (seeker as { email?: string }).email;
          const name = (seeker.seekerProfile as { fullName?: string } | null)?.fullName ?? 'there';
          if (email) {
            this.emailService.sendSosJobAlertEmail(
              email,
              name,
              payload.title,
              payload.city,
              `https://rxjobs4u.in/jobs/${payload.jobId}`,
            ).catch((err: unknown) => this.logger.error(`SOS job alert email failed for ${email}: ${String(err)}`));
          }
        }
      }

      if (seekers.length < BATCH) break;
      skip += BATCH;
    }

    // ── WhatsApp SOS alerts (SOS only, verified WhatsApp numbers) ────────────
    if (payload.type === JobType.SOS) {
      let waSkip = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const waSeek = await this.userModel
          .find({
            role: Role.JOB_SEEKER,
            'seekerProfile.desiredCities': { $in: [payload.city] },
            'seekerProfile.whatsappVerified': true,
            'seekerProfile.whatsappNumber': { $ne: null },
            alertSosJobs: true,
            seekerSosSubscribedUntil: { $gt: new Date() },
            deletedAt: null,
            isActive: true,
          })
          .select('seekerProfile.whatsappNumber')
          .lean()
          .skip(waSkip)
          .limit(BATCH)
          .exec();

        if (waSeek.length === 0) break;

        await Promise.allSettled(
          waSeek.map((s) => {
            const num = (s.seekerProfile as { whatsappNumber?: string } | null)?.whatsappNumber;
            if (!num) return Promise.resolve();
            return this.whatsAppService.sendSosAlert(num, {
              jobId: payload.jobId,
              title: payload.title,
              city: payload.city,
              department: payload.department ?? '',
            }).catch((err: unknown) => this.logger.error(`WhatsApp SOS alert failed: ${String(err)}`));
          }),
        );

        if (waSeek.length < BATCH) break;
        waSkip += BATCH;
      }
    }

    // ── Radius-based alerts (seekers near the job, not already matched by city name) ──
    if (payload.jobLocation) {
      const radiusKm = await this.systemConfigService.getSettingNumber('JOB_ALERT_RADIUS_KM', 30);
      const radiusM = radiusKm * 1_000;

      const radiusFilter: Record<string, unknown> = {
        role: Role.JOB_SEEKER,
        'seekerProfile.location': {
          $nearSphere: {
            $geometry: { type: 'Point', coordinates: payload.jobLocation },
            $maxDistance: radiusM,
          },
        },
        'seekerProfile.desiredCities': { $nin: [payload.city] }, // skip already-notified by city match
        [alertField]: true,
        deletedAt: null,
        isActive: true,
      };
      if (isSos) {
        radiusFilter['seekerSosSubscribedUntil'] = { $gt: new Date() };
      }

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
              `New ${isSos ? 'SOS ' : ''}job near you`,
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
