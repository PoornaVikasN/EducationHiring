import Link from 'next/link';
import { Shield } from 'lucide-react';

export const metadata = { title: 'Privacy Policy — SchoolTeacher' };

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid #e8edf5' }}>
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-0.5">
            <span className="text-lg font-black" style={{ color: '#7986cb' }}>School</span>
            <span className="text-lg font-black" style={{ color: '#0d1b2a' }}>Teacher</span>
          </Link>
          <Link href="/" className="text-sm font-medium" style={{ color: '#3949ab' }}>← Back to Home</Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
               style={{ background: '#dcfce7', border: '1px solid #bbf7d0' }}>
            <Shield className="w-5 h-5" style={{ color: '#16a34a' }} />
          </div>
          <h1 className="text-3xl font-black" style={{ color: '#0d1b2a' }}>Privacy Policy</h1>
        </div>
        <p className="text-sm mb-12" style={{ color: '#64748b' }}>Last updated: July 2026</p>

        <div className="prose-content space-y-10" style={{ color: '#334155', lineHeight: 1.8, fontSize: '0.9375rem' }}>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>1. Who We Are</h2>
            <p>
              SchoolTeacher is a global teacher hiring platform. We connect verified schools with qualified
              teachers — subject teachers, coaching faculty, administrators, and related roles. Our registered
              contact email is{' '}
              <a href="mailto:support@schoolteacher.co.in" style={{ color: '#3949ab' }}>support@schoolteacher.co.in</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>2. Information We Collect</h2>
            <p className="mb-3">We collect the following categories of data when you use the platform:</p>
            <ul className="space-y-2 pl-5 list-disc">
              <li><strong>Account information:</strong> Name, email address, phone/WhatsApp number, and password (hashed — never stored in plain text).</li>
              <li><strong>Teacher profile:</strong> Qualifications, degrees, work history, availability, preferred cities/countries, salary range, intro video, and uploaded resume (stored on AWS S3).</li>
              <li><strong>School profile:</strong> School name, address, description, logo, photos, board/affiliation details, and verification documents (stored on AWS S3).</li>
              <li><strong>Job posting data:</strong> Job title, subject, role, location, and compensation details.</li>
              <li><strong>Payment information:</strong> Transaction IDs from Razorpay. We do not store card numbers, CVV, or bank details — all payment processing is handled by Razorpay.</li>
              <li><strong>Communication data:</strong> Transactional emails and SMS/WhatsApp alerts.</li>
              <li><strong>Usage data:</strong> Pages visited, search queries, and job interactions — used for platform improvement only.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>3. How We Use Your Information</h2>
            <ul className="space-y-2 pl-5 list-disc">
              <li>To operate and display your teacher or school profile on the platform.</li>
              <li>To match job postings with candidates based on location, subject, and availability.</li>
              <li>To send job alert emails and SMS/WhatsApp notifications (opt-out available in Settings → Job Alerts).</li>
              <li>To process subscription and application fee payments via Razorpay.</li>
              <li>To verify school accounts and maintain platform integrity.</li>
              <li>To respond to disputes, support requests, and legal obligations.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>4. Third-Party Services</h2>
            <p className="mb-3">We integrate with the following third-party services:</p>
            <ul className="space-y-2 pl-5 list-disc">
              <li><strong>Razorpay</strong> — payment gateway. Governed by Razorpay&apos;s Privacy Policy.</li>
              <li><strong>Google Sign-In (OAuth2)</strong> — when you choose &ldquo;Continue with Google&rdquo;, we receive your name, email address, and Google account ID solely to create or link your SchoolTeacher account. We do not receive access to your Gmail, contacts, or any other Google service data.</li>
              <li><strong>AWS S3</strong> — secure file storage for resumes, intro videos, and school documents.</li>
              <li><strong>SMS/WhatsApp providers</strong> — alert delivery.</li>
            </ul>
            <p className="mt-3">We do not sell, rent, or share your personal data with any third party for marketing purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>5. Google API Services</h2>
            <p className="mb-3">SchoolTeacher uses Google APIs for the following purpose:</p>
            <ul className="space-y-2 pl-5 list-disc mb-3">
              <li><strong>User authentication:</strong> Google Sign-In (OAuth2) to let users log in without a password.</li>
            </ul>
            <p>
              Our use of information received from Google APIs adheres to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#3949ab' }}>
                Google API Services User Data Policy
              </a>
              , including the Limited Use requirements. We do not use Google user data for advertising,
              profiling, or any purpose beyond operating the platform features described in this policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>6. Data Retention</h2>
            <p>
              We retain your account data for as long as your account is active. If you request account deletion,
              your personal profile data is deactivated within 30 days. Job posting records and payment transaction
              references may be retained for up to 7 years for legal and accounting compliance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>7. Your Rights</h2>
            <p className="mb-3">You have the right to:</p>
            <ul className="space-y-2 pl-5 list-disc">
              <li>Access and download the personal data we hold about you.</li>
              <li>Correct inaccurate data via your profile settings.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Opt out of non-essential communications via Settings → Job Alerts.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these rights, contact us at{' '}
              <a href="mailto:support@schoolteacher.co.in" style={{ color: '#3949ab' }}>support@schoolteacher.co.in</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>8. Security</h2>
            <p>
              We use industry-standard security practices — HTTPS encryption, hashed passwords (bcrypt), and
              role-based access controls. However, no internet transmission is 100% secure. Please use a strong,
              unique password and notify us immediately if you suspect unauthorized account access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy as the platform evolves. Significant changes will be communicated
              via email. Continued use of the platform after updates constitutes acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold mb-3" style={{ color: '#0d1b2a' }}>10. Contact</h2>
            <p>
              For privacy-related queries, write to us at{' '}
              <a href="mailto:support@schoolteacher.co.in" style={{ color: '#3949ab' }}>support@schoolteacher.co.in</a>.
            </p>
          </section>
        </div>

        <div className="mt-16 pt-8 flex gap-6" style={{ borderTop: '1px solid #e8edf5' }}>
          <Link href="/terms" className="text-sm font-medium" style={{ color: '#3949ab' }}>Terms &amp; Conditions →</Link>
          <Link href="/" className="text-sm" style={{ color: '#64748b' }}>← Back to Home</Link>
        </div>
      </div>
    </div>
  );
}
