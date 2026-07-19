import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private config: ConfigService,
    private systemConfig: SystemConfigService,
    private emailTemplates: EmailTemplatesService,
  ) {}

  // Gmail creds are admin-editable via Config → API Keys (no redeploy) — same pattern
  // Razorpay already uses. Built fresh per-send (cheap; nodemailer only touches the
  // network on sendMail, not on createTransport) rather than cached at boot, so an
  // admin's saved change takes effect on the very next email, not after a restart.
  private async getTransporter(): Promise<nodemailer.Transporter> {
    const [user, clientId, clientSecret, refreshToken] = await Promise.all([
      this.systemConfig.getSecret('GMAIL_USER'),
      this.systemConfig.getSecret('GMAIL_CLIENT_ID'),
      this.systemConfig.getSecret('GMAIL_CLIENT_SECRET'),
      this.systemConfig.getSecret('GMAIL_REFRESH_TOKEN'),
    ]);
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { type: 'OAuth2', user, clientId, clientSecret, refreshToken },
    });
  }

  async sendRegistrationOtpEmail(to: string, name: string, otp: string): Promise<void> {
    const db = await this.renderFromDb('REGISTRATION_OTP', { name, otp });
    await this.send(to, db?.subject ?? 'Welcome to SchoolTeacher — verify your email', db?.html ?? `
      <p>Hi ${name},</p>
      <p>Welcome to <strong>SchoolTeacher</strong>! To activate your account, enter the verification code below:</p>
      <div style="text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;font-family:monospace;color:#3949ab">${otp}</span>
      </div>
      <p style="color:#888;font-size:13px">This code expires in 5 minutes. Do not share it with anyone.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendOnboardingEmail(to: string, name: string, role: string): Promise<void> {
    const profileHint = role === 'RECRUITER'
      ? 'Set up your school profile to start posting jobs.'
      : 'Complete your profile to get noticed by top schools.';
    const db = await this.renderFromDb('ONBOARDING', { name, profileHint });
    await this.send(to, db?.subject ?? '🎉 You\'re in! Next step: complete your profile', db?.html ?? `
      <p>Hi ${name},</p>
      <p>Your email is verified and your <strong>SchoolTeacher</strong> account is now active.</p>
      <p>${profileHint}</p>
      <p>It only takes a few minutes and makes a big difference.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    const db = await this.renderFromDb('GENERIC_OTP', { otp });
    await this.send(to, db?.subject ?? 'Your SchoolTeacher OTP', db?.html ?? `
      <p>Your one-time password is:</p>
      <h2 style="letter-spacing:4px;font-family:monospace">${otp}</h2>
      <p>This OTP expires in 5 minutes. Do not share it with anyone.</p>
    `);
  }

  async sendShortlistNotification(to: string, seekerName: string, jobTitle: string, paymentDueBy: Date, feeLabel: string): Promise<void> {
    const deadline = paymentDueBy.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const db = await this.renderFromDb('SHORTLIST_NOTIFICATION', { seekerName, jobTitle, fee: feeLabel, deadline });
    await this.send(to, db?.subject ?? `You've been shortlisted for ${jobTitle}`, db?.html ?? `
      <p>Hi ${seekerName},</p>
      <p>You have been shortlisted for <strong>${jobTitle}</strong>.</p>
      <p>Pay ${feeLabel} to unlock the school's contact details. Payment deadline: <strong>${deadline}</strong>.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendApplicationWonEmail(to: string, seekerName: string, jobTitle: string): Promise<void> {
    const db = await this.renderFromDb('APPLICATION_WON', { seekerName, jobTitle });
    await this.send(to, db?.subject ?? `Congratulations! You got the job — ${jobTitle}`, db?.html ?? `
      <p>Hi ${seekerName},</p>
      <p>Congratulations! You have been selected for <strong>${jobTitle}</strong>.</p>
      <p>The school will contact you shortly.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendApplicationReceivedEmail(to: string, seekerName: string, jobTitle: string): Promise<void> {
    const db = await this.renderFromDb('APPLICATION_RECEIVED', { seekerName, jobTitle });
    await this.send(to, db?.subject ?? 'Your interest has been registered — SchoolTeacher', db?.html ?? `
      <p>Hi ${seekerName},</p>
      <p>We have registered your interest for <strong>${jobTitle}</strong>.</p>
      <p>The school will review your profile and shortlist you if there is a match. No action is needed from your side right now.</p>
      <p>You will be notified once they review your application.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendPaymentConfirmationEmail(to: string, seekerName: string, jobTitle: string, schoolName: string): Promise<void> {
    const db = await this.renderFromDb('PAYMENT_CONFIRMATION', { seekerName, jobTitle, hospitalName: schoolName });
    await this.send(to, db?.subject ?? 'Payment confirmed — contact details unlocked', db?.html ?? `
      <p>Hi ${seekerName},</p>
      <p>Your payment has been confirmed for <strong>${jobTitle}</strong> at <strong>${schoolName}</strong>.</p>
      <p>The school's contact details are now visible in your applications page. You can now connect with them directly.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendApplicationClosedEmail(to: string, seekerName: string, jobTitle: string, reason?: string): Promise<void> {
    const reasonText = reason ? `<p>Reason: ${reason}</p>` : '';
    const db = await this.renderFromDb('APPLICATION_CLOSED', { seekerName, jobTitle, reason: reasonText });
    await this.send(to, db?.subject ?? 'Update on your application — SchoolTeacher', db?.html ?? `
      <p>Hi ${seekerName},</p>
      <p>Your application for <strong>${jobTitle}</strong> has been closed.</p>
      ${reasonText}
      <p>Don't be discouraged — there are many other opportunities waiting for you. Keep browsing jobs on SchoolTeacher.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendApplicantPaidEmail(to: string, jobTitle: string, feeLabel: string): Promise<void> {
    const db = await this.renderFromDb('APPLICANT_PAID', { jobTitle, fee: feeLabel }, 'recruiterEmail');
    await this.send(to, db?.subject ?? `A candidate confirmed interest — ${jobTitle}`, db?.html ?? `
      <p>Hi,</p>
      <p>A shortlisted candidate has paid ${feeLabel} for <strong>${jobTitle}</strong>.</p>
      <p>Their contact details are now visible to you in the Applicants section. Reach out to schedule an interview.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendSchoolVerifiedEmail(to: string, recruiterName: string): Promise<void> {
    const db = await this.renderFromDb('SCHOOL_VERIFIED', { recruiterName }, 'recruiterEmail');
    await this.send(to, db?.subject ?? 'Your school is verified — you can now post jobs ✅', db?.html ?? `
      <p>Hi ${recruiterName},</p>
      <p>Great news! Your school profile has been verified by our admin team.</p>
      <p>You can now post teaching jobs on School Teacher.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendSubscriptionActivatedEmail(to: string, name: string, expiresAt: Date, amountPaise?: number): Promise<void> {
    const expiry = expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const amountLine = amountPaise != null
      ? `<p style="font-size:13px;color:#555">Amount charged: <strong>₹${(amountPaise / 100).toLocaleString('en-IN')}</strong></p>`
      : '';
    const subscriptionBody = `<p>Your school's <strong>unlimited job-posting subscription</strong> is now active until <strong>${expiry}</strong>. You can post as many teaching jobs as you need.</p>`;
    const db = await this.renderFromDb('SUBSCRIPTION_ACTIVATED', { name, subscriptionBody, amountLine }, 'recruiterEmail');
    await this.send(to, db?.subject ?? 'Subscription activated — School Teacher', db?.html ?? `
      <p>Hi ${name},</p>
      ${subscriptionBody}
      ${amountLine}
      <p style="color:#888;font-size:12px">This is your payment receipt. Keep it for your records.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendDisputeResolvedEmail(to: string, name: string, subject: string, adminNote: string, channel: 'seekerEmail' | 'recruiterEmail' = 'seekerEmail'): Promise<void> {
    const db = await this.renderFromDb('DISPUTE_RESOLVED', { name, subject, adminNote }, channel);
    await this.send(to, db?.subject ?? 'Your dispute has been resolved — School Teacher', db?.html ?? `
      <p>Hi ${name},</p>
      <p>Your dispute regarding <strong>${subject}</strong> has been <strong>resolved</strong>.</p>
      <p>Admin note: ${adminNote}</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendDisputeRejectedEmail(to: string, name: string, subject: string, adminNote: string, channel: 'seekerEmail' | 'recruiterEmail' = 'seekerEmail'): Promise<void> {
    const db = await this.renderFromDb('DISPUTE_REJECTED', { name, subject, adminNote }, channel);
    await this.send(to, db?.subject ?? 'Update on your dispute — School Teacher', db?.html ?? `
      <p>Hi ${name},</p>
      <p>We have reviewed your dispute regarding <strong>${subject}</strong> and were unable to uphold it at this time.</p>
      <p>Admin note: ${adminNote}</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendNewJobAlertEmail(to: string, name: string, jobTitle: string, city: string, jobLink: string): Promise<void> {
    await this.send(to, `New Teaching Job in ${city} — ${jobTitle}`, `
      <p>Hi ${name},</p>
      <p>A new teaching job matching your location preference has been posted:</p>
      <div style="background:#eef0fb;border:1px solid #c5caf0;border-radius:8px;padding:16px 20px;margin:20px 0">
        <p style="margin:0 0 6px 0;font-size:16px;font-weight:700;color:#0f172a">${jobTitle}</p>
        <p style="margin:0;color:#3949ab;font-size:13px">📍 ${city}</p>
      </div>
      <p>
        <a href="${jobLink}" style="display:inline-block;background:#3949ab;color:#fff;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px">
          View &amp; Apply Now →
        </a>
      </p>
      <p style="color:#888;font-size:12px;margin-top:20px">You're receiving this because you have job alerts enabled. To update your preferences, visit your profile settings.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendAccountActivationEmail(to: string, name: string, role: string, activationLink: string): Promise<void> {
    const roleLabel = role === 'RECRUITER' ? 'School' : role === 'TEACHER' ? 'Teacher' : 'Admin';
    const db = await this.renderFromDb(
      'ACCOUNT_ACTIVATION',
      { name, roleLabel, activationLink },
      role === 'RECRUITER' ? 'recruiterEmail' : 'seekerEmail',
    );
    await this.send(to, db?.subject ?? 'Your School Teacher account is ready — set your password', db?.html ?? `
      <p>Hi ${name},</p>
      <p>An administrator has created your <strong>School Teacher</strong> account as a <strong>${roleLabel}</strong>.</p>
      <p>Set a password to activate your account:</p>
      <p><a href="${activationLink}" style="display:inline-block;background:#3949ab;color:#fff;font-weight:600;padding:10px 24px;border-radius:8px;text-decoration:none">Set My Password →</a></p>
      <p style="color:#888;font-size:13px">This link expires in 72 hours.</p>
      <br><p>— The SchoolTeacher Team</p>
    `);
  }

  async sendPasswordResetOtpEmail(to: string, otp: string): Promise<void> {
    const db = await this.renderFromDb('PASSWORD_RESET_OTP', { otp });
    await this.send(to, db?.subject ?? 'Reset your SchoolTeacher password', db?.html ?? `
      <p>You requested a password reset. Use the code below to set a new password:</p>
      <div style="text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;font-family:monospace;color:#3949ab">${otp}</span>
      </div>
      <p style="color:#888;font-size:13px">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
    `);
  }

  private async renderFromDb(
    key: string,
    vars: Record<string, string>,
    channel: 'seekerEmail' | 'recruiterEmail' = 'seekerEmail',
  ): Promise<{ subject: string; html: string } | null> {
    try {
      const tpl = await this.emailTemplates.findByKey(key);
      if (!tpl || !tpl.isActive) {
        if (tpl && !tpl.isActive) this.logger.warn(`Email skipped (template inactive): ${key}`);
        return null;
      }
      if (tpl.channels && !tpl.channels[channel]) {
        this.logger.log(`Email channel '${channel}' disabled for template ${key}`);
        return null;
      }
      const render = (s: string) => s.replace(/\{\{(\w+)\}\}/g, (_, k: string) => vars[k] ?? '');
      return { subject: render(tpl.subject), html: render(tpl.body) };
    } catch {
      return null;
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const refreshToken = await this.systemConfig.getSecret('GMAIL_REFRESH_TOKEN');
    if (!refreshToken) {
      this.logger.warn(`Email skipped (no GMAIL_REFRESH_TOKEN) — to: ${to}, subject: ${subject}`);
      return;
    }
    const senderEmail = (await this.systemConfig.getSecret('GMAIL_USER')) ?? 'noreply@schoolteacher.in';
    const senderName = this.config.get<string>('SMTP_SENDER_NAME', 'SchoolTeacher');
    try {
      const transporter = await this.getTransporter();
      await transporter.sendMail({
        from: `"${senderName}" <${senderEmail}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent → ${to} subject="${subject}"`);
    } catch (err: unknown) {
      this.logger.error(`Email send failed to ${to}: ${String(err)}`);
      throw err;
    }
  }
}
