import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { LegalPage, LegalPageDocument } from './schemas/legal-page.schema';
import { UpdateLegalPageDto } from './dto/update-legal-page.dto';

type SeedSection = { heading: string; body: string };
type SeedPage = { key: string; title: string; lastUpdatedLabel: string; sections: SeedSection[] };

const SUPPORT_EMAIL = 'schoolteachermarketing@gmail.com';

const SEEDS: SeedPage[] = [
  {
    key: 'terms',
    title: 'Terms & Conditions',
    lastUpdatedLabel: 'Last updated: July 2026',
    sections: [
      { heading: '1. Acceptance of Terms', body: `<p>By creating an account or using School Teacher in any capacity, you agree to these Terms &amp; Conditions. If you do not agree, you must not access or use the platform. These terms apply to all users — teachers, schools/recruiters, and visitors.</p>` },
      { heading: '2. User Eligibility', body: `<ul><li>You must be 18 years of age or older to register.</li><li>Teachers must hold valid qualifications relevant to the role they apply for.</li><li>Schools registering as recruiter accounts must be legally operating educational institutions.</li><li>Any misrepresentation of qualifications, credentials, or entity status is grounds for immediate account suspension.</li></ul>` },
      { heading: '3. Job Listings', body: `<ul><li>Schools may post teaching vacancies after account verification by our admin team.</li><li>Job listings must accurately describe the role, compensation, location, and requirements.</li><li>Fraudulent, misleading, or discriminatory listings are prohibited and will be removed.</li><li>School Teacher reserves the right to remove any listing at our discretion without prior notice.</li></ul>` },
      { heading: '4. Payments & Fees', body: `<ul><li><strong>Teachers:</strong> Free, always. Creating a profile, applying to jobs, and chatting with shortlisting schools costs nothing.</li><li><strong>School job posting:</strong> A limited number of posts each month are free; posting beyond the free tier requires a paid plan, billed via Razorpay.</li><li><strong>Application fee:</strong> Where applicable (admin-configurable), a flat fee is charged to teachers after being shortlisted for a role, confirming genuine interest.</li></ul><p><strong>Refund Policy</strong></p><p>All fees are non-refundable except in cases of demonstrable platform error or technical failure on our end. Subscription fees are charged monthly; cancellation stops future billing but does not entitle you to a partial-month refund. Dispute a charge within 7 days of billing via Settings → Raise Dispute.</p>` },
      { heading: '5. Account Conduct & Suspension', body: `<p>School Teacher may suspend or permanently deactivate accounts for the following:</p><ul><li>Uploading false credentials, degrees, or identity documents.</li><li>Posting jobs without intent to hire (ghost listings).</li><li>Harassment, discrimination, or abusive communication with other users.</li><li>Circumventing payment processes or exploiting platform features.</li><li>Any activity that violates applicable law in the user's jurisdiction.</li></ul>` },
      { heading: '6. Intellectual Property', body: `<p>All platform content, design, trademarks, and software are the intellectual property of School Teacher and its operators. You may not copy, scrape, reproduce, or redistribute any part of the platform without written permission. User-uploaded content (resumes, intro videos, school logos, photos) remains owned by the uploading user; you grant School Teacher a non-exclusive licence to display and process this content solely for platform operation.</p>` },
      { heading: '7. Limitation of Liability', body: `<p>School Teacher is a marketplace platform — we facilitate connections between schools and teachers. We are not an employer, staffing agency, or party to any employment agreement. We are not liable for any employment decisions, workplace incidents, credential misrepresentation by users, or outcomes arising from matches made on the platform. Our aggregate liability to any user is limited to the fees paid by that user in the 30 days preceding a claim.</p>` },
      { heading: '8. Governing Law', body: `<p>These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Hyderabad, Telangana.</p>` },
      { heading: '9. Changes to Terms', body: `<p>We may update these Terms from time to time. Material changes will be communicated via email or an in-app notice. Continued use of the platform after changes take effect constitutes acceptance.</p>` },
      { heading: '10. Contact', body: `<p>For any questions regarding these Terms, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>` },
    ],
  },
  {
    key: 'privacy-policy',
    title: 'Privacy Policy',
    lastUpdatedLabel: 'Last updated: July 2026',
    sections: [
      { heading: '1. Who We Are', body: `<p>School Teacher is a global teacher hiring platform. We connect verified schools with qualified teachers — subject teachers, coaching faculty, administrators, and related roles. Our registered contact email is <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>` },
      { heading: '2. Information We Collect', body: `<p>We collect the following categories of data when you use the platform:</p><ul><li><strong>Account information:</strong> Name, email address, phone/WhatsApp number, and password (hashed — never stored in plain text).</li><li><strong>Teacher profile:</strong> Qualifications, degrees, work history, availability, preferred cities/countries, salary range, intro video, and uploaded resume (stored on AWS S3).</li><li><strong>School profile:</strong> School name, address, description, logo, photos, board/affiliation details, and verification documents (stored on AWS S3).</li><li><strong>Job posting data:</strong> Job title, subject, role, location, and compensation details.</li><li><strong>Payment information:</strong> Transaction IDs from Razorpay. We do not store card numbers, CVV, or bank details — all payment processing is handled by Razorpay.</li><li><strong>Communication data:</strong> Transactional emails and SMS/WhatsApp alerts.</li><li><strong>Usage data:</strong> Pages visited, search queries, and job interactions — used for platform improvement only.</li></ul>` },
      { heading: '3. How We Use Your Information', body: `<ul><li>To operate and display your teacher or school profile on the platform.</li><li>To match job postings with candidates based on location, subject, and availability.</li><li>To send job alert emails and SMS/WhatsApp notifications (opt-out available in Settings).</li><li>To process subscription and application fee payments via Razorpay.</li><li>To verify school accounts and maintain platform integrity.</li><li>To respond to disputes, support requests, and legal obligations.</li></ul>` },
      { heading: '4. Third-Party Services', body: `<p>We integrate with the following third-party services:</p><ul><li><strong>Razorpay</strong> — payment gateway. Governed by Razorpay's Privacy Policy.</li><li><strong>Google Sign-In (OAuth2)</strong> — when you choose "Continue with Google", we receive your name, email address, and Google account ID solely to create or link your School Teacher account. We do not receive access to your Gmail, contacts, or any other Google service data.</li><li><strong>AWS S3</strong> — secure file storage for resumes, intro videos, and school documents.</li><li><strong>SMS/WhatsApp providers</strong> — alert delivery.</li></ul><p>We do not sell, rent, or share your personal data with any third party for marketing purposes.</p>` },
      { heading: '5. Google API Services', body: `<p>School Teacher uses Google APIs for the following purpose:</p><ul><li><strong>User authentication:</strong> Google Sign-In (OAuth2) to let users log in without a password.</li></ul><p>Our use of information received from Google APIs adheres to the <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>, including the Limited Use requirements. We do not use Google user data for advertising, profiling, or any purpose beyond operating the platform features described in this policy.</p>` },
      { heading: '6. Cookies & Similar Technologies', body: `<p>School Teacher uses a small number of cookies and browser storage items to run the platform:</p><ul><li><strong>Essential/functional:</strong> A secure, HttpOnly session cookie that keeps you signed in. The platform cannot function without this — it is not optional and does not track you across other sites.</li><li><strong>Third-party service cookies:</strong> Google Maps (location/city autocomplete), Google reCAPTCHA (spam and bot protection), and Google Sign-In each set their own cookies when those features are used, governed by Google's own privacy policy.</li><li><strong>Local storage:</strong> A flag remembering that you've seen our cookie notice, and (if you choose Google Sign-In) short-lived session data — nothing here is used for advertising or cross-site tracking.</li></ul><p>We do not use third-party advertising or analytics cookies. You can clear cookies and local storage at any time via your browser settings; doing so will simply sign you out and reset the cookie notice.</p>` },
      { heading: '7. Data Retention', body: `<p>We retain your account data for as long as your account is active. If you request account deletion, your personal profile data is deactivated within 30 days. Job posting records and payment transaction references may be retained for up to 7 years for legal and accounting compliance.</p>` },
      { heading: '8. Your Rights', body: `<p>You have the right to:</p><ul><li>Access and download the personal data we hold about you.</li><li>Correct inaccurate data via your profile settings.</li><li>Request deletion of your account and associated data.</li><li>Opt out of non-essential communications via Settings.</li></ul><p>To exercise any of these rights, contact us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>` },
      { heading: '9. Security', body: `<p>We use industry-standard security practices — HTTPS encryption, hashed passwords (bcrypt), and role-based access controls. However, no internet transmission is 100% secure. Please use a strong, unique password and notify us immediately if you suspect unauthorized account access.</p>` },
      { heading: '10. Changes to This Policy', body: `<p>We may update this Privacy Policy as the platform evolves. Significant changes will be communicated via email. Continued use of the platform after updates constitutes acceptance of the revised policy.</p>` },
      { heading: '11. Contact', body: `<p>For privacy-related queries, write to us at <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>` },
    ],
  },
];

@Injectable()
export class LegalContentService implements OnModuleInit {
  private readonly logger = new Logger(LegalContentService.name);

  constructor(
    @InjectModel(LegalPage.name) private legalPageModel: Model<LegalPageDocument>,
    private auditService: AuditService,
  ) {}

  async onModuleInit() {
    for (const seed of SEEDS) {
      const exists = await this.legalPageModel.findOne({ key: seed.key }).lean().exec();
      if (!exists) {
        await this.legalPageModel.create({ ...seed, updatedByAdminId: null });
        this.logger.log(`Seeded legal page: ${seed.key}`);
      } else if (!exists.updatedByAdminId) {
        // Auto-refresh content for pages an admin has never customised, same
        // pattern as EmailTemplatesService — keeps un-edited pages in sync
        // with code changes without clobbering admin edits.
        await this.legalPageModel.updateOne(
          { key: seed.key },
          { $set: { title: seed.title, lastUpdatedLabel: seed.lastUpdatedLabel, sections: seed.sections } },
        );
      }
    }
  }

  async findByKey(key: string): Promise<LegalPageDocument | null> {
    return this.legalPageModel.findOne({ key }).lean().exec();
  }

  async findAll(): Promise<LegalPageDocument[]> {
    return this.legalPageModel.find().sort({ key: 1 }).lean().exec();
  }

  async update(key: string, dto: UpdateLegalPageDto, adminId: string, adminEmail: string): Promise<LegalPageDocument> {
    const doc = await this.legalPageModel.findOne({ key }).exec();
    if (!doc) throw new BadRequestException(`Legal page "${key}" not found`);
    const before = { title: doc.title, lastUpdatedLabel: doc.lastUpdatedLabel, sections: doc.sections };
    Object.assign(doc, {
      ...(dto.title !== undefined ? { title: dto.title } : {}),
      ...(dto.lastUpdatedLabel !== undefined ? { lastUpdatedLabel: dto.lastUpdatedLabel } : {}),
      ...(dto.sections !== undefined ? { sections: dto.sections } : {}),
      updatedByAdminId: new Types.ObjectId(adminId),
    });
    await doc.save();
    this.auditService.log(adminId, adminEmail, 'LEGAL_PAGE_UPDATED', 'legal_page', key, doc.title, before, dto as unknown as Record<string, unknown>);
    return doc;
  }
}
