import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';
import {
  shell, hi, para, smallNote,
  jobCard, infoCard, greenCard, feeCard, subscriptionCard,
  otpBox, ctaBtn, stepsBlock, featureList, tip,
} from './email-shell';
import { EmailTemplate, EmailTemplateDocument, TemplateChannels } from './schemas/email-template.schema';

const SEEDS: Array<{
  key: string; name: string; trigger: string; description: string;
  subject: string; body: string; variables: string[]; channels: TemplateChannels;
  inAppSeekerTitle: string | null; inAppSeekerBody: string | null;
  inAppRecruiterTitle: string | null; inAppRecruiterBody: string | null;
}> = [
  // ── 1. Registration OTP ───────────────────────────────────────────────────
  {
    key: 'REGISTRATION_OTP',
    name: 'Registration OTP',
    trigger: 'User signup',
    description: "Sends a one-time password to verify the user's email during registration.",
    subject: 'Welcome to School Teacher — verify your email',
    variables: ['name', 'otp'],
    channels: { seekerEmail: true, seekerInApp: false, recruiterEmail: false, recruiterInApp: false },
    body: shell({
      preheader: 'Your School Teacher verification code is ready — expires in 5 minutes.',
      badge: '🔐',
      badgeBg: '#1e3a8a',
      badgeGradEnd: '#3b82f6',
      headline: 'Verify your email address',
      tagline: 'Enter the code below to activate your School Teacher account.',
      headerLabel: 'Email Verification',
      content:
        hi('{{name}}') +
        para('Welcome to <strong>School Teacher</strong>! You\'re one step away from connecting with schools and teaching opportunities across the country.') +
        otpBox('{{otp}}', 5) +
        tip('💡 <strong>Security note:</strong> School Teacher will never call or ask you for this code. If you didn\'t sign up, you can safely ignore this email.'),
    }),
    inAppSeekerTitle: null, inAppSeekerBody: null,
    inAppRecruiterTitle: null, inAppRecruiterBody: null,
  },

  // ── 2. Onboarding ─────────────────────────────────────────────────────────
  {
    key: 'ONBOARDING',
    name: 'Onboarding',
    trigger: 'Post-verification',
    description: 'Welcome email sent after account verification; content varies by role (teacher vs school).',
    subject: "🎉 You're in! Next step: complete your profile",
    variables: ['name', 'profileHint'],
    channels: { seekerEmail: true, seekerInApp: false, recruiterEmail: false, recruiterInApp: false },
    body: shell({
      preheader: 'Your account is live! Complete your profile to stand out to schools.',
      badge: '🎉',
      headline: 'Welcome to School Teacher!',
      tagline: 'Your account is verified and active. Let\'s help you hit the ground running.',
      headerLabel: 'Welcome',
      content:
        hi('{{name}}') +
        para('Great news — your email is verified and your <strong>School Teacher</strong> account is now fully active.') +
        greenCard('Your Next Step', '{{profileHint}}') +
        para('It only takes a few minutes and makes a big difference in getting noticed by top schools.', '24px') +
        ctaBtn('Complete My Profile →', 'https://schoolteacher.in/profile') +
        tip('💡 <strong>Pro tip:</strong> Profiles with a photo and complete details get significantly more attention from schools.'),
    }),
    inAppSeekerTitle: null, inAppSeekerBody: null,
    inAppRecruiterTitle: null, inAppRecruiterBody: null,
  },

  // ── 3. Generic OTP ────────────────────────────────────────────────────────
  {
    key: 'GENERIC_OTP',
    name: 'Generic OTP',
    trigger: 'Re-authentication / reauth prompts',
    description: 'OTP for actions requiring identity confirmation other than signup.',
    subject: 'Your School Teacher OTP',
    variables: ['otp'],
    channels: { seekerEmail: true, seekerInApp: false, recruiterEmail: false, recruiterInApp: false },
    body: shell({
      preheader: 'Your School Teacher one-time code — expires in 5 minutes.',
      badge: '🔑',
      badgeBg: '#374151',
      badgeGradEnd: '#6b7280',
      headline: 'Your one-time password',
      tagline: 'Use this code to confirm your identity. It expires in 5 minutes.',
      headerLabel: 'Security',
      content:
        para('Use the code below to complete your action on School Teacher. Do not share it with anyone.') +
        otpBox('{{otp}}', 5) +
        tip('🛡️ <strong>Stay safe:</strong> School Teacher staff will never ask you for this code. If you didn\'t request it, ignore this email.'),
    }),
    inAppSeekerTitle: null, inAppSeekerBody: null,
    inAppRecruiterTitle: null, inAppRecruiterBody: null,
  },

  // ── 4. Shortlist Notification ─────────────────────────────────────────────
  {
    key: 'SHORTLIST_NOTIFICATION',
    name: 'Shortlist Notification',
    trigger: 'Application shortlisted',
    description: 'Notifies the teacher that their application has been shortlisted by the school.',
    subject: "You've been shortlisted for {{jobTitle}}",
    variables: ['seekerName', 'jobTitle', 'fee', 'deadline'],
    channels: { seekerEmail: true, seekerInApp: true, recruiterEmail: false, recruiterInApp: false },
    body: shell({
      preheader: "You've been shortlisted! Pay {{fee}} to unlock the school's contact details.",
      badge: '⭐',
      headline: "You've been shortlisted!",
      tagline: 'A school reviewed your profile and selected you for a position. Act now!',
      headerLabel: 'Teacher Alert',
      content:
        hi('{{seekerName}}') +
        para('Exciting news — you have been <strong>shortlisted</strong> for the position below. Pay a small fee to unlock the school\'s contact details and proceed to the interview stage.') +
        jobCard('{{jobTitle}}') +
        feeCard('{{fee}}', '{{deadline}}') +
        ctaBtn('View & Pay Now →', 'https://schoolteacher.in/applications') +
        stepsBlock('What happens after you pay', [
          { title: 'School details unlocked', body: 'You\'ll see the school\'s name, phone number, and email address instantly.' },
          { title: 'Reach out directly', body: 'Contact the school to schedule your interview at a convenient time.' },
          { title: 'Land the role', body: 'Walk in confident — you\'re already on their shortlist.' },
        ]) +
        tip('⚡ <strong>Act fast:</strong> Payment deadlines are strict. Missing the deadline may close your application automatically.'),
    }),
    inAppSeekerTitle: 'You have been shortlisted! 🎉',
    inAppSeekerBody: 'Pay {{fee}} within 48 hours to confirm your interview and reveal school details.',
    inAppRecruiterTitle: null, inAppRecruiterBody: null,
  },

  // ── 5. Application Won ────────────────────────────────────────────────────
  {
    key: 'APPLICATION_WON',
    name: 'Application Won',
    trigger: 'Offer confirmed',
    description: 'Sent to the teacher when the school confirms the offer and contact details are unlocked.',
    subject: 'Congratulations! You got the job — {{jobTitle}}',
    variables: ['seekerName', 'jobTitle'],
    channels: { seekerEmail: true, seekerInApp: true, recruiterEmail: false, recruiterInApp: true },
    body: shell({
      preheader: "Congratulations! You've been selected for {{jobTitle}}. The school will reach out soon.",
      badge: '🏆',
      headline: 'Congratulations — you got it!',
      tagline: 'The school has confirmed your selection. Your hard work paid off.',
      headerLabel: 'Teacher Alert',
      content:
        hi('{{seekerName}}') +
        para('We\'re thrilled to share that you have been <strong>selected</strong> for the position below. The school has confirmed their interest and will reach out to you very soon.') +
        jobCard('{{jobTitle}}') +
        stepsBlock('What to expect next', [
          { title: 'School will contact you', body: 'They have your details and will reach out to schedule a conversation.' },
          { title: 'Prepare well', body: 'Review the role requirements and prepare your questions for the school.' },
          { title: 'Start your new journey', body: 'Congratulations again — you absolutely deserve this opportunity!' },
        ]) +
        ctaBtn('View My Applications →', 'https://schoolteacher.in/applications') +
        tip('🎉 <strong>Well done!</strong> Keep your profile updated on School Teacher for even more opportunities in the future.'),
    }),
    inAppSeekerTitle: 'Congratulations! You got the job! 🎊',
    inAppSeekerBody: 'The school has confirmed your hire. Check your applications for details.',
    inAppRecruiterTitle: 'Hire confirmed ✅',
    inAppRecruiterBody: 'You marked a candidate as hired for {{jobTitle}}. Contact details are now visible to both parties.',
  },

  // ── 6. Application Received ───────────────────────────────────────────────
  {
    key: 'APPLICATION_RECEIVED',
    name: 'Application Received',
    trigger: 'Application submitted',
    description: 'Confirms to the teacher that their application was successfully received.',
    subject: 'Your interest has been registered — School Teacher',
    variables: ['seekerName', 'jobTitle'],
    channels: { seekerEmail: true, seekerInApp: true, recruiterEmail: false, recruiterInApp: true },
    body: shell({
      preheader: 'Application received! The school will review your profile and notify you shortly.',
      badge: '✅',
      headline: 'Application received!',
      tagline: "We've registered your interest and sent it to the school for review.",
      headerLabel: 'Teacher Alert',
      content:
        hi('{{seekerName}}') +
        para('Your application for the position below has been <strong>successfully submitted</strong>. The school will review all applicants and get back to you if there\'s a match — no action needed from your side.') +
        jobCard('{{jobTitle}}') +
        stepsBlock('What happens next', [
          { title: 'School review', body: 'The hiring team will review all applicants and create a shortlist.' },
          { title: 'Shortlist notification', body: 'If selected, you\'ll receive an email with a link to pay a small fee and proceed.' },
          { title: 'Interview stage', body: 'After payment, the school\'s contact details are unlocked and interviews begin.' },
        ]) +
        tip('💡 <strong>Sit tight:</strong> We\'ll notify you the moment the school reviews your profile. Good luck!'),
    }),
    inAppSeekerTitle: 'Application submitted',
    inAppSeekerBody: 'Your interest in {{jobTitle}} has been registered. The school will review your profile.',
    inAppRecruiterTitle: 'New interest in your job posting',
    inAppRecruiterBody: 'A teacher has expressed interest. Review their profile in Applicants.',
  },

  // ── 7. Payment Confirmation ───────────────────────────────────────────────
  {
    key: 'PAYMENT_CONFIRMATION',
    name: 'Payment Confirmation',
    trigger: 'Payment success',
    description: 'Confirms payment and unlocks contact details for the relevant application.',
    subject: 'Payment confirmed — contact details unlocked',
    variables: ['seekerName', 'jobTitle', 'hospitalName'],
    channels: { seekerEmail: true, seekerInApp: true, recruiterEmail: false, recruiterInApp: false },
    body: shell({
      preheader: 'Payment confirmed! School contact details are now unlocked and ready for you.',
      badge: '💳',
      headline: 'Payment confirmed!',
      tagline: 'Your payment was processed and contact details are now visible in your applications.',
      headerLabel: 'Teacher Alert',
      content:
        hi('{{seekerName}}') +
        para('Your payment has been confirmed and the school\'s contact details are now <strong>unlocked</strong>. Head to your applications to see them and start the conversation.') +
        jobCard('{{jobTitle}}') +
        infoCard('School', '{{hospitalName}}') +
        ctaBtn('View Contact Details →', 'https://schoolteacher.in/applications') +
        smallNote('🧾 This email serves as your payment receipt. Keep it for your records.'),
    }),
    inAppSeekerTitle: 'Payment successful! 💳',
    inAppSeekerBody: 'School contact details are now revealed. Check your applications.',
    inAppRecruiterTitle: null, inAppRecruiterBody: null,
  },

  // ── 8. Application Closed ─────────────────────────────────────────────────
  {
    key: 'APPLICATION_CLOSED',
    name: 'Application Closed',
    trigger: 'Application rejected / closed',
    description: 'Notifies the teacher that their application has been closed or rejected.',
    subject: 'Update on your application — School Teacher',
    variables: ['seekerName', 'jobTitle', 'reason'],
    channels: { seekerEmail: true, seekerInApp: true, recruiterEmail: false, recruiterInApp: false },
    body: shell({
      preheader: 'An update on your application for {{jobTitle}}.',
      badge: '💙',
      badgeBg: '#1e40af',
      badgeGradEnd: '#3b82f6',
      headline: 'Update on your application',
      tagline: "We're sorry it didn't work out this time — but don't give up!",
      headerLabel: 'Teacher Alert',
      content:
        hi('{{seekerName}}') +
        para('Your application for the position below has been closed by the school.') +
        jobCard('{{jobTitle}}') +
        '{{reason}}' +
        para('Don\'t be discouraged — the right opportunity is out there waiting for you. New teaching jobs are posted on School Teacher every week.', '24px') +
        ctaBtn('Browse More Jobs →', 'https://schoolteacher.in/jobs') +
        tip('💡 <strong>Keep going:</strong> Top teachers apply to multiple roles. Update your profile and keep exploring.'),
    }),
    inAppSeekerTitle: 'Application closed',
    inAppSeekerBody: 'Your application has been closed by the school.',
    inAppRecruiterTitle: null, inAppRecruiterBody: null,
  },

  // ── 9. Password Reset OTP ────────────────────────────────────────────────
  {
    key: 'PASSWORD_RESET_OTP',
    name: 'Password Reset OTP',
    trigger: 'Password reset request',
    description: 'Delivers a one-time password to allow the user to reset their account password.',
    subject: 'Reset your School Teacher password',
    variables: ['otp'],
    channels: { seekerEmail: true, seekerInApp: false, recruiterEmail: false, recruiterInApp: false },
    body: shell({
      preheader: 'Your School Teacher password reset code — expires in 10 minutes.',
      badge: '🛡️',
      badgeBg: '#374151',
      badgeGradEnd: '#4b5563',
      headline: 'Reset your password',
      tagline: 'Use the code below to set a new password for your account.',
      headerLabel: 'Security',
      content:
        para('You requested a password reset for your School Teacher account. Enter the code below on the reset page to create a new password.') +
        otpBox('{{otp}}', 10) +
        tip('🛡️ <strong>Security reminder:</strong> If you did not request a password reset, someone may have entered your email address by mistake. Your account is safe — simply ignore this email and your password will remain unchanged.'),
    }),
    inAppSeekerTitle: null, inAppSeekerBody: null,
    inAppRecruiterTitle: null, inAppRecruiterBody: null,
  },

  // ── 10. Applicant Paid (Recruiter) ────────────────────────────────────────
  {
    key: 'APPLICANT_PAID',
    name: 'Applicant Paid (Recruiter)',
    trigger: 'Application payment received',
    description: 'Notifies the recruiter when a shortlisted teacher pays the application fee — confirms genuine interest.',
    subject: 'A candidate confirmed interest — {{jobTitle}}',
    variables: ['jobTitle'],
    channels: { seekerEmail: false, seekerInApp: false, recruiterEmail: true, recruiterInApp: true },
    body: shell({
      preheader: 'A shortlisted candidate just paid for {{jobTitle}} — their contact details are now available.',
      badge: '💰',
      headline: 'A candidate confirmed interest!',
      tagline: 'Great news — they\'ve paid and their contact details are now unlocked for you.',
      headerLabel: 'Recruiter Alert',
      content:
        hi('') +
        para('A shortlisted candidate has <strong>completed payment</strong> for the position below — this confirms their genuine interest. Their contact details are now visible in your Applicants section.') +
        jobCard('{{jobTitle}}') +
        stepsBlock('What to do now', [
          { title: 'View their profile', body: 'Head to the Applicants section to see the candidate\'s full contact details.' },
          { title: 'Reach out directly', body: 'Call or message them using their unlocked phone number and email address.' },
          { title: 'Schedule an interview', body: 'Move quickly — great teaching talent is in high demand.' },
        ]) +
        ctaBtn('View Applicants →', 'https://schoolteacher.in/recruiter/applicants') +
        tip('💡 <strong>Pro tip:</strong> Candidates who pay are serious and motivated. Reaching out within 24 hours significantly improves your hire rate.'),
    }),
    inAppSeekerTitle: null, inAppSeekerBody: null,
    inAppRecruiterTitle: 'An applicant has confirmed interest 💳',
    inAppRecruiterBody: 'A shortlisted teacher paid the fee. Their contact details are now visible to you in Applicants.',
  },

  // ── 11. School Verified (Recruiter) ───────────────────────────────────────
  {
    key: 'SCHOOL_VERIFIED',
    name: 'School Verified (Recruiter)',
    trigger: 'School account verified by admin',
    description: 'Notifies the recruiter that their school profile has been verified and the account is now fully active.',
    subject: 'Your school is verified — you can now post jobs ✅',
    variables: ['recruiterName'],
    channels: { seekerEmail: false, seekerInApp: false, recruiterEmail: true, recruiterInApp: true },
    body: shell({
      preheader: 'Your school profile is verified! You can now post teaching jobs on School Teacher.',
      badge: '✅',
      headline: 'Your school is verified!',
      tagline: 'Our admin team has approved your profile — you\'re fully unlocked and ready to hire.',
      headerLabel: 'Recruiter Alert',
      content:
        hi('{{recruiterName}}') +
        para('Great news! Your school profile has been reviewed and <strong>verified</strong> by our admin team. Here\'s everything that\'s now available to you:') +
        featureList([
          { icon: '💼', text: '<strong>Job postings</strong> — attract qualified teachers for open roles at your school.' },
          { icon: '👥', text: '<strong>Browse teacher profiles</strong> — discover and shortlist the right candidates faster.' },
          { icon: '📈', text: '<strong>Manage applicants</strong> — track applications through shortlisting, payment, and hire.' },
        ]) +
        ctaBtn('Post Your First Job →', 'https://schoolteacher.in/recruiter/jobs/new') +
        tip('🚀 <strong>Get started:</strong> The first job post is the hardest — after that, it only takes a few minutes. Your next great hire is waiting!'),
    }),
    inAppSeekerTitle: null, inAppSeekerBody: null,
    inAppRecruiterTitle: 'Your school is verified! ✅',
    inAppRecruiterBody: 'Admin has approved your school profile. You can now post jobs and view applicants.',
  },

  // ── 12. Subscription Activated ────────────────────────────────────────────
  {
    key: 'SUBSCRIPTION_ACTIVATED',
    name: 'Subscription Activated',
    trigger: 'School unlimited-posting subscription payment success',
    description: 'Receipt email sent to a school confirming its unlimited job-posting subscription activation, and expiry date.',
    subject: 'Subscription activated — School Teacher',
    variables: ['name', 'subscriptionBody', 'amountLine'],
    channels: { seekerEmail: true, seekerInApp: true, recruiterEmail: true, recruiterInApp: true },
    body: shell({
      preheader: 'Your School Teacher subscription is now active. Here is your payment confirmation.',
      badge: '🚀',
      headline: 'Subscription activated!',
      tagline: "You're all set — here's a summary of your new subscription.",
      headerLabel: 'Receipt',
      content:
        hi('{{name}}') +
        para('Your subscription on School Teacher has been successfully activated. Here\'s your confirmation:') +
        subscriptionCard() +
        smallNote('🧾 This is your payment receipt. Keep it for your records.'),
    }),
    inAppSeekerTitle: null, inAppSeekerBody: null,
    inAppRecruiterTitle: 'Subscription activated ✅',
    inAppRecruiterBody: 'Your unlimited job-posting subscription is now active. Post as many jobs as you need until it expires.',
  },

  // ── 13. Dispute Resolved ──────────────────────────────────────────────────
  {
    key: 'DISPUTE_RESOLVED',
    name: 'Dispute Resolved',
    trigger: 'Admin resolves a dispute',
    description: 'Notifies the user that their dispute has been reviewed and resolved in their favour.',
    subject: 'Your dispute has been resolved — School Teacher',
    variables: ['name', 'subject', 'adminNote'],
    channels: { seekerEmail: true, seekerInApp: true, recruiterEmail: true, recruiterInApp: true },
    body: shell({
      preheader: 'Great news — your dispute has been reviewed and resolved.',
      badge: '✅',
      headline: 'Your dispute has been resolved',
      tagline: 'The School Teacher admin team has reviewed your case and taken action.',
      headerLabel: 'Dispute Update',
      content:
        hi('{{name}}') +
        para('We have reviewed your dispute and are pleased to let you know it has been <strong>resolved</strong>.') +
        greenCard('Dispute', '{{subject}}') +
        greenCard('Admin Note', '{{adminNote}}') +
        para('Thank you for bringing this to our attention. We\'re committed to maintaining a fair and transparent platform for all our users.', '24px') +
        ctaBtn('View My Disputes →', 'https://schoolteacher.in/disputes') +
        tip('💡 <strong>Questions?</strong> If you have any follow-up concerns, you can raise a new dispute or contact our support team.'),
    }),
    inAppSeekerTitle: 'Dispute resolved ✅',
    inAppSeekerBody: 'Your dispute "{{subject}}" has been resolved. Check your email for details.',
    inAppRecruiterTitle: 'Dispute resolved ✅',
    inAppRecruiterBody: 'Your dispute "{{subject}}" has been resolved. Check your email for details.',
  },

  // ── 14. Dispute Rejected ──────────────────────────────────────────────────
  {
    key: 'DISPUTE_REJECTED',
    name: 'Dispute Rejected',
    trigger: 'Admin rejects a dispute',
    description: 'Notifies the user that their dispute was reviewed but not upheld.',
    subject: 'Update on your dispute — School Teacher',
    variables: ['name', 'subject', 'adminNote'],
    channels: { seekerEmail: true, seekerInApp: true, recruiterEmail: true, recruiterInApp: true },
    body: shell({
      preheader: 'An update on your dispute submission.',
      badge: '💙',
      badgeBg: '#1e40af',
      badgeGradEnd: '#3b82f6',
      headline: 'Update on your dispute',
      tagline: 'The School Teacher admin team has reviewed your submission.',
      headerLabel: 'Dispute Update',
      content:
        hi('{{name}}') +
        para('We have reviewed your dispute and, after careful consideration, we were unable to uphold it at this time.') +
        infoCard('Dispute', '{{subject}}') +
        infoCard('Admin Note', '{{adminNote}}') +
        para('If you believe this decision was made in error or you have additional information to share, you are welcome to raise a new dispute with supporting details.', '24px') +
        ctaBtn('View My Disputes →', 'https://schoolteacher.in/disputes') +
        tip('💡 <strong>Need help?</strong> Contact our support team if you\'d like to discuss this decision further.'),
    }),
    inAppSeekerTitle: 'Dispute update received',
    inAppSeekerBody: 'Your dispute "{{subject}}" was reviewed. Check your email for the decision.',
    inAppRecruiterTitle: 'Dispute update received',
    inAppRecruiterBody: 'Your dispute "{{subject}}" was reviewed. Check your email for the decision.',
  },
];

@Injectable()
export class EmailTemplatesService implements OnModuleInit {
  private readonly logger = new Logger(EmailTemplatesService.name);

  constructor(
    @InjectModel(EmailTemplate.name) private readonly model: Model<EmailTemplateDocument>,
    private readonly auditService: AuditService,
  ) {}

  async onModuleInit() {
    let seededCount = 0;
    for (const seed of SEEDS) {
      const exists = await this.model.findOne({ key: seed.key }).lean().exec();
      if (!exists) {
        await this.model.create({
          ...seed,
          isSystem: true,
          isActive: true,
          updatedByAdminId: null,
        });
        seededCount++;
        this.logger.log(`Seeded email template: ${seed.key}`);
      } else if (!(exists as unknown as Record<string, unknown>).channels) {
        // Migration: patch existing docs that pre-date the channels field
        await this.model.updateOne(
          { key: seed.key },
          { $set: { channels: seed.channels } },
        );
        this.logger.log(`Migrated channels for email template: ${seed.key}`);
      } else if (!exists.updatedByAdminId) {
        // Auto-refresh all seed content for templates the admin has never customised.
        await this.model.updateOne(
          { key: seed.key },
          {
            $set: {
              body: seed.body,
              subject: seed.subject,
              inAppSeekerTitle: seed.inAppSeekerTitle,
              inAppSeekerBody: seed.inAppSeekerBody,
              inAppRecruiterTitle: seed.inAppRecruiterTitle,
              inAppRecruiterBody: seed.inAppRecruiterBody,
            },
          },
        );
        this.logger.log(`Auto-refreshed template: ${seed.key}`);
      }
    }
    this.logger.log(`Email templates ready — ${SEEDS.length} seed definitions, ${seededCount} newly seeded this boot.`);
  }

  findAll(): Promise<EmailTemplateDocument[]> {
    return this.model.find().sort({ name: 1 }).lean().exec() as Promise<EmailTemplateDocument[]>;
  }

  async findByKey(key: string): Promise<EmailTemplateDocument | null> {
    return this.model.findOne({ key }).lean().exec() as Promise<EmailTemplateDocument | null>;
  }

  async update(key: string, dto: UpdateEmailTemplateDto, adminId: string, adminEmail: string): Promise<EmailTemplateDocument> {
    const doc = await this.model.findOne({ key }).exec();
    if (!doc) throw new BadRequestException(`Email template "${key}" not found`);

    const before = { subject: doc.subject, body: doc.body, description: doc.description, isActive: doc.isActive };
    // Only assign keys the caller actually sent — NestJS's ValidationPipe (class-transformer)
    // sets every declared DTO property as an own key, including undefined ones, for fields the
    // caller omitted. A blind `{...dto}` spread would overwrite required fields (subject/body/
    // description) with `undefined` on a partial update (e.g. just toggling isActive) and fail
    // Mongoose's required-field validation on save.
    const patch = Object.fromEntries(Object.entries(dto).filter(([, v]) => v !== undefined));
    Object.assign(doc, { ...patch, updatedByAdminId: new Types.ObjectId(adminId) });
    await doc.save();

    this.auditService.log(adminId, adminEmail, 'EMAIL_TEMPLATE_UPDATED', 'email_template', key, doc.name, before, dto as Record<string, unknown>);
    return doc;
  }

  async create(dto: CreateEmailTemplateDto, adminId: string, adminEmail: string): Promise<EmailTemplateDocument> {
    const exists = await this.model.findOne({ key: dto.key }).lean().exec();
    if (exists) throw new BadRequestException(`Template key "${dto.key}" already exists`);

    const doc = await this.model.create({
      ...dto,
      isSystem: false,
      isActive: true,
      updatedByAdminId: new Types.ObjectId(adminId),
    });

    this.auditService.log(adminId, adminEmail, 'EMAIL_TEMPLATE_CREATED', 'email_template', dto.key, dto.name, {}, dto as unknown as Record<string, unknown>);
    return doc;
  }

  async remove(key: string, adminId: string, adminEmail: string): Promise<void> {
    const doc = await this.model.findOne({ key }).lean().exec();
    if (!doc) throw new BadRequestException(`Email template "${key}" not found`);
    if (doc.isSystem) throw new BadRequestException('System templates cannot be deleted');

    await this.model.deleteOne({ key });
    this.auditService.log(adminId, adminEmail, 'EMAIL_TEMPLATE_DELETED', 'email_template', key, doc.name, {}, {});
  }
}
