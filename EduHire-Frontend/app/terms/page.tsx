import Link from 'next/link';
import { FileText } from 'lucide-react';
import { SiteHeader } from '../../common-components/site-header';

export const metadata = { title: 'Terms & Conditions — SchoolTeacher' };

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-bg-page">
      <SiteHeader forceSolid />
      <div className="h-16" />

      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
            <FileText className="w-5 h-5" style={{ color: '#2563eb' }} />
          </div>
          <h1 className="text-2xl md:text-3xl font-black" style={{ color: '#0d1b2a' }}>Terms &amp; Conditions</h1>
        </div>
        <p className="text-sm mb-12" style={{ color: '#64748b' }}>Last updated: July 2026</p>

        <div className="space-y-10" style={{ color: '#334155', lineHeight: 1.8, fontSize: '0.9375rem' }}>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>1. Acceptance of Terms</h2>
            <p>
              By creating an account or using SchoolTeacher in any capacity, you agree to these Terms &amp; Conditions.
              If you do not agree, you must not access or use the platform. These terms apply to all users —
              teachers/job seekers, school/recruiter accounts, and visitors.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>2. User Eligibility</h2>
            <ul className="space-y-2 pl-5 list-disc">
              <li>You must be 18 years of age or older to register.</li>
              <li>Teachers must hold valid qualifications relevant to the role they apply for.</li>
              <li>Schools registering as recruiter accounts must be legally operating educational institutions.</li>
              <li>Any misrepresentation of qualifications, credentials, or entity status is grounds for immediate account suspension.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>3. Job Listings</h2>
            <ul className="space-y-2 pl-5 list-disc">
              <li>Schools may post teaching vacancies after account verification by our admin team.</li>
              <li>Job listings must accurately describe the role, compensation, location, and requirements.</li>
              <li>Fraudulent, misleading, or discriminatory listings are prohibited and will be removed.</li>
              <li>SchoolTeacher reserves the right to remove any listing at our discretion without prior notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>4. Payments &amp; Fees</h2>
            <ul className="space-y-2 pl-5 list-disc">
              <li><strong>Teachers:</strong> Free, always. Creating a profile, applying to jobs, and chatting with shortlisting schools costs nothing.</li>
              <li><strong>School job posting:</strong> The first posts each month are free; posting beyond the free tier requires a paid plan, billed via Razorpay.</li>
              <li><strong>Application fee:</strong> Where applicable, a flat fee is charged to teachers after being shortlisted for a role, confirming genuine interest.</li>
            </ul>
            <p className="mt-4 font-medium" style={{ color: '#0d1b2a' }}>Refund Policy</p>
            <p className="mt-2">
              All fees are non-refundable except in cases of demonstrable platform error or technical failure on our end.
              Subscription fees are charged monthly; cancellation stops future billing but does not entitle you to a
              partial-month refund. Dispute a charge within 7 days of billing via Settings → Raise Dispute.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>5. Account Conduct &amp; Suspension</h2>
            <p className="mb-3">SchoolTeacher may suspend or permanently deactivate accounts for the following:</p>
            <ul className="space-y-2 pl-5 list-disc">
              <li>Uploading false credentials, degrees, or identity documents.</li>
              <li>Posting jobs without intent to hire (ghost listings).</li>
              <li>Harassment, discrimination, or abusive communication with other users.</li>
              <li>Circumventing payment processes or exploiting platform features.</li>
              <li>Any activity that violates applicable law in the user's jurisdiction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>6. Intellectual Property</h2>
            <p>
              All platform content, design, trademarks, and software are the intellectual property of SchoolTeacher
              and its operators. You may not copy, scrape, reproduce, or redistribute any part of the platform
              without written permission. User-uploaded content (resumes, intro videos, school logos, photos) remains
              owned by the uploading user; you grant SchoolTeacher a non-exclusive licence to display and process this
              content solely for platform operation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>7. Limitation of Liability</h2>
            <p>
              SchoolTeacher is a marketplace platform — we facilitate connections between schools and teachers. We are
              not an employer, staffing agency, or party to any employment agreement. We are not liable for any
              employment decisions, workplace incidents, credential misrepresentation by users, or outcomes arising
              from matches made on the platform. Our aggregate liability to any user is limited to the fees paid by
              that user in the 30 days preceding a claim.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>8. Governing Law</h2>
            <p>
              These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive
              jurisdiction of the courts in Hyderabad, Telangana.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>9. Changes to Terms</h2>
            <p>
              We may update these Terms from time to time. Material changes will be communicated via email or
              an in-app notice. Continued use of the platform after changes take effect constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>10. Contact</h2>
            <p>
              For any questions regarding these Terms, contact us at{' '}
              <a href="mailto:support@schoolteacher.co.in" style={{ color: '#3949ab' }}>support@schoolteacher.co.in</a>.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 flex gap-6" style={{ borderTop: '1px solid #e8edf5' }}>
          <Link href="/privacy-policy" className="text-sm font-medium" style={{ color: '#3949ab' }}>Privacy Policy →</Link>
          <Link href="/" className="text-sm" style={{ color: '#64748b' }}>← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
