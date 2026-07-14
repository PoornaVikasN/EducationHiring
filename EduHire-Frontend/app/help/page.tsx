'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SiteHeader } from '../../common-components/site-header';
import { usePublicPricing, formatRupees } from '../../hooks/use-public-pricing';

function buildFaqSections(appFee: string, subMo: string) {
  return [
    {
      title: 'For Teachers',
      faqs: [
        {
          q: 'Is registering as a teacher free?',
          a: `Yes — creating an account and browsing jobs is completely free. You only pay ${appFee} when a school shortlists you and you choose to accept their interest.`,
        },
        {
          q: `What is the ${appFee} application fee for?`,
          a: `When a school shortlists you, paying ${appFee} unlocks the school's full contact details and confirms your serious interest. If you don't pay within 48 hours, the shortlist expires.`,
        },
        {
          q: 'How do I complete my profile?',
          a: 'Go to My Profile from the top menu. Add your qualifications, subjects, availability, and upload your resume. A complete profile significantly increases your visibility to schools.',
        },
        {
          q: "What happens after I'm hired (WON status)?",
          a: "You'll see your application marked as WON and receive a notification. The school will have your contact details — coordinate directly with them for onboarding.",
        },
        {
          q: 'Can I apply to multiple schools at once?',
          a: `Yes. You can apply to as many teaching jobs as you like. The school contact is revealed only after shortlisting and your ${appFee} confirmation.`,
        },
        {
          q: 'What types of teaching roles are listed?',
          a: 'SchoolTeacher lists full-time teaching positions across all levels — Pre-Primary, Primary, Secondary, Senior Secondary — as well as administrative roles like HM, Principal, and Counselor.',
        },
      ],
    },
    {
      title: 'For Schools & Recruiters',
      faqs: [
        {
          q: 'How do I post a teaching job?',
          a: `Go to My Jobs → Post New Job and fill in the details. You get 2 free job posts per month. For unlimited posts, subscribe to the Unlimited Plan at ${subMo}/month.`,
        },
        {
          q: 'How do I verify my school?',
          a: 'Go to School Profile and complete your school details. Our team reviews within 1 business day. Verified schools appear with a trust badge, attracting more applicants.',
        },
        {
          q: "When is a candidate's contact revealed?",
          a: `After you shortlist a candidate and they pay ${appFee}, both parties receive full contact details. This ensures only serious candidates reach you.`,
        },
        {
          q: 'What is the Unlimited Plan?',
          a: `The Unlimited Plan at ${subMo}/month lets you post as many jobs as you need with no per-post limit. It auto-renews monthly and can be cancelled anytime.`,
        },
        {
          q: 'Is the subscription auto-renewed?',
          a: `Yes, the ${subMo}/month Unlimited Plan auto-renews via Razorpay. You can cancel anytime from the Subscription page.`,
        },
        {
          q: 'Can I search for teachers directly?',
          a: 'Yes. Use the Teachers/Applicants section to browse candidate profiles and filter by subject, experience, city, and availability.',
        },
      ],
    },
    {
      title: 'Payments & Refunds',
      faqs: [
        {
          q: 'What payment methods are supported?',
          a: 'All major payment modes are supported via Razorpay: UPI, cards (debit/credit), net banking, and wallets.',
        },
        {
          q: 'Can I get a refund?',
          a: `Application fees (${appFee}) are non-refundable once contact details are revealed. Subscription fees are non-refundable for the current billing period. If you believe you have a case, raise a dispute from Settings → Disputes.`,
        },
        {
          q: 'How do I cancel my subscription?',
          a: 'Go to School → Subscription and click Cancel Subscription. Your plan stays active until the end of the current billing period.',
        },
      ],
    },
    {
      title: 'Account & Technical',
      faqs: [
        {
          q: 'How do I change my password?',
          a: 'Go to Settings (accessible from your profile dropdown) and use the Change Password section.',
        },
        {
          q: 'Can I delete my account?',
          a: 'Yes. Go to Settings → Danger Zone → Delete Account. This is irreversible and will deactivate all your active jobs and applications.',
        },
        {
          q: "I'm not receiving email notifications. What should I do?",
          a: 'Check your spam folder first. Add noreply@schoolteacher.in to your contacts. You can also toggle notification preferences in Settings.',
        },
        {
          q: 'How do I contact support?',
          a: 'Email us at schoolteachermarketing@gmail.com or raise a dispute ticket from the Settings page. We respond within 1 business day.',
        },
      ],
    },
  ];
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border-default rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-white hover:bg-bg-page transition-colors"
      >
        <span className="font-medium text-text-primary text-sm pr-4">{q}</span>
        <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 pt-0 bg-white border-t border-border-default">
          <p className="text-sm text-text-muted leading-relaxed">{a}</p>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const { pricing } = usePublicPricing();
  const appFee = pricing.APPLICATION_FEE_PAISE != null ? formatRupees(pricing.APPLICATION_FEE_PAISE) : 'the applicable fee';
  const subMo  = pricing.RECRUITER_MONTHLY_PAISE != null ? formatRupees(pricing.RECRUITER_MONTHLY_PAISE) : 'the subscription fee';
  const FAQ_SECTIONS = buildFaqSections(appFee, subMo);

  return (
    <div className="min-h-screen flex flex-col bg-bg-page">
      <SiteHeader forceSolid />
      <div className="h-16" />

      {/* Hero */}
      <section className="py-16 px-6 text-center bg-white border-b border-border-default">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-extrabold text-text-primary mb-3">Help & FAQs</h1>
          <p className="text-text-muted text-lg">Everything you need to know about SchoolTeacher.</p>
        </div>
      </section>

      {/* FAQ sections */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto space-y-12">
          {FAQ_SECTIONS.map(({ title, faqs }) => (
            <div key={title}>
              <h2 className="text-xl font-bold text-text-primary mb-5">{title}</h2>
              <div className="space-y-3">
                {faqs.map(({ q, a }) => <FaqItem key={q} q={q} a={a} />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact block */}
      <section className="py-16 px-6 bg-white border-t border-border-default">
        <div className="max-w-xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-text-primary mb-3">Still have questions?</h2>
          <p className="text-text-muted mb-6">Our support team responds within 1 business day.</p>
          <a
            href="mailto:schoolteachermarketing@gmail.com"
            className="inline-block px-8 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: '#3949ab' }}
          >
            Email Support →
          </a>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-border-default bg-bg-page text-center text-sm text-text-muted">
        <p>© 2026 SchoolTeacher · <Link href="/about" className="hover:text-text-primary transition-colors">About</Link> · <Link href="/pricing" className="hover:text-text-primary transition-colors">Pricing</Link></p>
      </footer>
    </div>
  );
}
