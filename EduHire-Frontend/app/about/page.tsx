import Link from 'next/link';
import { Heart, Shield, MapPin, Star, Users, BookOpen } from 'lucide-react';
import { SiteHeader } from '../../common-components/site-header';

export const metadata = {
  title: 'About — SchoolTeacher',
  description: 'SchoolTeacher is Telangana & AP\'s teacher hiring platform, connecting verified schools with qualified teachers across India.',
};

const values = [
  { icon: Heart, title: 'Teachers First', body: 'Every feature is designed around the unique needs of India\'s teaching workforce — from SGT to Principal.' },
  { icon: MapPin, title: 'Regional Roots', body: 'Born in Hyderabad. We match by area, not just city. A school in Banjara Hills shouldn\'t be showing jobs to teachers in Secunderabad.' },
  { icon: Shield, title: 'Trust & Verification', body: 'Every school is manually verified by our admin team. Teachers pay only after shortlisting — no money lost on speculative applications.' },
  { icon: Users, title: 'Fair to All Sides', body: 'Schools pay to post beyond the free tier; teachers pay only when they\'re shortlisted. Neither side is exploited.' },
  { icon: BookOpen, title: 'Education Focused', body: 'CBSE, ICSE, Telugu-medium, State Board — we understand the nuances of Indian school education and hiring.' },
  { icon: Star, title: 'No Middlemen', body: 'Direct connections. Once a hire is made, there are no recurring commissions or agency fees.' },
];

const team = [
  { name: 'Poorna Vikas', role: 'Co-Founder & CEO', note: 'Former education operations lead with 8+ years in school administration across Telangana.' },
  { name: 'Engineering Team', role: 'Product & Engineering', note: 'Ex-startup engineers focused on building reliable, simple tools for India\'s education sector.' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-page">
      <SiteHeader />
      <div className="h-16" />

      {/* Hero */}
      <section className="py-20 px-6 text-center" style={{ background: 'linear-gradient(160deg, #1e3a8a, #3949ab)' }}>
        <div className="max-w-3xl mx-auto">
          <p className="text-blue-200 text-sm font-semibold uppercase tracking-widest mb-3">Our Story</p>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
            Built for India&apos;s Teaching Heroes
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed">
            SchoolTeacher was born out of frustration — schools struggling to find qualified teachers, educators
            scrolling irrelevant listings. We built the platform we wished existed, starting from Hyderabad.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-6">Our Mission</h2>
          <p className="text-text-muted text-lg leading-relaxed max-w-2xl mx-auto">
            To eliminate the gap between teaching talent and opportunity in India — making every job search
            faster, every hire more reliable, and every teaching career more rewarding.
          </p>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Schools', value: 'Growing' },
              { label: 'Teachers', value: 'Free forever' },
              { label: 'Cities', value: 'TS + AP + Beyond' },
              { label: 'Free posts', value: '2/month' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-bg-page rounded-2xl p-6 border border-border-default">
                <div className="text-2xl font-extrabold text-brand-primary mb-1">{value}</div>
                <div className="text-sm text-text-muted font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-20 px-6 bg-bg-page">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-text-primary mb-3 text-center">What We Stand For</h2>
          <p className="text-text-muted text-center mb-12">Principles that guide every product decision.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-white rounded-2xl p-6 border border-border-default shadow-sm hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-brand-primary" />
                </div>
                <h3 className="font-bold text-text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-text-primary mb-3">The Team</h2>
          <p className="text-text-muted mb-12">People who care deeply about getting education hiring right.</p>
          <div className="grid md:grid-cols-2 gap-6">
            {team.map(({ name, role, note }) => (
              <div key={name} className="bg-bg-page rounded-2xl p-6 border border-border-default text-left">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-teal-500 flex items-center justify-center text-white font-bold text-lg mb-4">
                  {name[0]}
                </div>
                <div className="font-bold text-text-primary">{name}</div>
                <div className="text-sm text-brand-primary font-medium mb-2">{role}</div>
                <p className="text-sm text-text-muted">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 text-center bg-bg-page">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-text-primary mb-4">Join the Movement</h2>
          <p className="text-text-muted mb-8">Whether you&apos;re a school or a teacher, SchoolTeacher is built for you.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="px-8 py-3 rounded-xl text-sm font-bold text-white"
              style={{ background: '#3949ab', boxShadow: '0 4px 12px rgba(57,73,171,0.28)' }}
            >
              Create free account →
            </Link>
            <Link
              href="/pricing"
              className="px-8 py-3 rounded-xl text-sm font-medium border border-border-default bg-white text-text-primary hover:bg-bg-page transition-colors"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border-default bg-white text-center text-sm text-text-muted">
        <p>© {new Date().getFullYear()} SchoolTeacher. All rights reserved. · <Link href="/pricing" className="hover:text-text-primary transition-colors">Pricing</Link> · <Link href="/about" className="hover:text-text-primary transition-colors">About</Link></p>
      </footer>
    </div>
  );
}
