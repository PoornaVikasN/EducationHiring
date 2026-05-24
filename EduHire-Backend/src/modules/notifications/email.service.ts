import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemConfigService } from '../system-config/system-config.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(
    private config: ConfigService,
    private systemConfig: SystemConfigService,
  ) {
    this.senderEmail = this.config.get<string>('SMTP_SENDER_EMAIL', 'noreply@eduhire.in');
    this.senderName = this.config.get<string>('SMTP_SENDER_NAME', 'EduHire');
  }

  async sendRegistrationOtpEmail(to: string, name: string, otp: string): Promise<void> {
    await this.send(to, 'Welcome to EduHire — verify your email', `
      <p>Hi ${name},</p>
      <p>Welcome to <strong>EduHire</strong>! To activate your account, enter the verification code below:</p>
      <div style="text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;font-family:monospace;color:#3949ab">${otp}</span>
      </div>
      <p style="color:#888;font-size:13px">This code expires in 5 minutes. Do not share it with anyone.</p>
      <br><p>— The EduHire Team</p>
    `);
  }

  async sendOnboardingEmail(to: string, name: string, role: string): Promise<void> {
    const profileHint = role === 'RECRUITER'
      ? 'Set up your school profile to start posting jobs.'
      : 'Complete your profile to get noticed by top schools.';
    await this.send(to, '🎉 You\'re in! Next step: complete your profile', `
      <p>Hi ${name},</p>
      <p>Your email is verified and your <strong>EduHire</strong> account is now active.</p>
      <p>${profileHint}</p>
      <p>It only takes a few minutes and makes a big difference.</p>
      <br><p>— The EduHire Team</p>
    `);
  }

  async sendOtpEmail(to: string, otp: string): Promise<void> {
    await this.send(to, 'Your EduHire OTP', `
      <p>Your one-time password is:</p>
      <h2 style="letter-spacing:4px;font-family:monospace">${otp}</h2>
      <p>This OTP expires in 5 minutes. Do not share it with anyone.</p>
    `);
  }

  async sendShortlistNotification(to: string, seekerName: string, jobTitle: string, paymentDueBy: Date): Promise<void> {
    const deadline = paymentDueBy.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    await this.send(to, `You've been shortlisted for ${jobTitle}`, `
      <p>Hi ${seekerName},</p>
      <p>You have been shortlisted for <strong>${jobTitle}</strong>.</p>
      <p>Pay ₹99 to unlock the school's contact details. Payment deadline: <strong>${deadline}</strong>.</p>
      <br><p>— The EduHire Team</p>
    `);
  }

  async sendApplicationWonEmail(to: string, seekerName: string, jobTitle: string): Promise<void> {
    await this.send(to, `Congratulations! You got the job — ${jobTitle}`, `
      <p>Hi ${seekerName},</p>
      <p>Congratulations! You have been selected for <strong>${jobTitle}</strong>.</p>
      <p>The school will contact you shortly.</p>
      <br><p>— The EduHire Team</p>
    `);
  }

  async sendApplicationReceivedEmail(to: string, seekerName: string, jobTitle: string): Promise<void> {
    await this.send(to, 'Your interest has been registered — EduHire', `
      <p>Hi ${seekerName},</p>
      <p>We have registered your interest for <strong>${jobTitle}</strong>.</p>
      <p>The school will review your profile and shortlist you if there is a match. No action is needed from your side right now.</p>
      <p>You will be notified once they review your application.</p>
      <br><p>— The EduHire Team</p>
    `);
  }

  async sendPaymentConfirmationEmail(to: string, seekerName: string, jobTitle: string, hospitalName: string): Promise<void> {
    await this.send(to, 'Payment confirmed — contact details unlocked', `
      <p>Hi ${seekerName},</p>
      <p>Your payment has been confirmed for <strong>${jobTitle}</strong> at <strong>${hospitalName}</strong>.</p>
      <p>The school's contact details are now visible in your applications page. You can now connect with them directly.</p>
      <br><p>— The EduHire Team</p>
    `);
  }

  async sendApplicationClosedEmail(to: string, seekerName: string, jobTitle: string, reason?: string): Promise<void> {
    const reasonText = reason ? `<p>Reason: ${reason}</p>` : '';
    await this.send(to, 'Update on your application — EduHire', `
      <p>Hi ${seekerName},</p>
      <p>Your application for <strong>${jobTitle}</strong> has been closed.</p>
      ${reasonText}
      <p>Don't be discouraged — there are many other opportunities waiting for you. Keep browsing jobs on EduHire.</p>
      <br><p>— The EduHire Team</p>
    `);
  }

  async sendSosJobAlertEmail(to: string, name: string, jobTitle: string, city: string, jobLink: string): Promise<void> {
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
      <br><p>— The EduHire Team</p>
    `);
  }

  async sendPasswordResetOtpEmail(to: string, otp: string): Promise<void> {
    await this.send(to, 'Reset your EduHire password', `
      <p>You requested a password reset. Use the code below to set a new password:</p>
      <div style="text-align:center;margin:24px 0">
        <span style="font-size:36px;font-weight:700;letter-spacing:8px;font-family:monospace;color:#3949ab">${otp}</span>
      </div>
      <p style="color:#888;font-size:13px">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
    `);
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    const apiKey = await this.systemConfig.getSecret('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn(`Email skipped (no BREVO_API_KEY) — to: ${to}, subject: ${subject}`);
      return;
    }
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: to }],
          subject,
          htmlContent: html,
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Brevo API ${res.status}: ${body}`);
      }
      this.logger.log(`Email sent → ${to}`);
    } catch (err: unknown) {
      this.logger.error(`Email send failed to ${to}: ${String(err)}`);
      throw err;
    }
  }
}
