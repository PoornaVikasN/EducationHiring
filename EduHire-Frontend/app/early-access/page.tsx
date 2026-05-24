'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CheckCircle, Loader2 } from 'lucide-react';
import { SiteHeader } from '../../common-components/site-header';
import { Button } from '../../common-components/ui/button';
import { Input } from '../../common-components/ui/input';
import { Label } from '../../common-components/ui/label';

const PERKS = [
  '3 months free Unlimited Plan (₹1,500 value)',
  'Priority onboarding and school profile verification',
  'Early access to analytics and bulk job posting',
  'Founder-level support channel',
];

export default function EarlyAccessPage() {
  const [form, setForm] = useState({ name: '', email: '', role: 'school' as 'school' | 'teacher', city: '' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate submission — replace with real API call when waitlist endpoint exists
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-bg-page">
      <SiteHeader />
      <div className="h-16" />

      {/* Hero */}
      <section className="py-20 px-6 text-center" style={{ background: 'linear-gradient(160deg, #1e3a8a, #1d4ed8)' }}>
        <div className="max-w-3xl mx-auto">
          <span className="inline-block text-xs font-bold text-blue-200 bg-blue-900/40 px-3 py-1 rounded-full mb-4 uppercase tracking-widest">
            Limited Spots
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-5 leading-tight">
            Get Early Access to EduHire
          </h1>
          <p className="text-blue-100 text-lg max-w-xl mx-auto leading-relaxed">
            Be among the first 100 schools or teachers on the platform. Early members get exclusive perks and help shape the product.
          </p>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-start">

          {/* Perks */}
          <div>
            <h2 className="text-2xl font-bold text-text-primary mb-6">What early members get</h2>
            <ul className="space-y-4">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-brand-secondary shrink-0 mt-0.5" />
                  <span className="text-text-muted">{perk}</span>
                </li>
              ))}
            </ul>
            <div className="mt-10 bg-blue-50 border border-blue-100 rounded-2xl p-6">
              <p className="text-sm font-semibold text-brand-secondary mb-1">Currently in beta</p>
              <p className="text-sm text-text-muted">
                We&apos;re onboarding schools and teachers in batches across Hyderabad, Bangalore, and Chennai first. Sign up to reserve your spot.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-white rounded-2xl border border-border-default p-8 shadow-sm">
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-brand-secondary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-text-primary mb-2">You&apos;re on the list!</h3>
                <p className="text-text-muted text-sm mb-6">We&apos;ll reach out to you personally within 2 business days.</p>
                <Link href="/" className="text-sm font-medium text-brand-secondary hover:underline">Back to home →</Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h3 className="text-lg font-bold text-text-primary mb-1">Request early access</h3>
                <p className="text-sm text-text-muted mb-4">We&apos;ll review your request within 2 business days.</p>

                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    className="mt-1"
                    placeholder="Priya Sharma"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    className="mt-1"
                    placeholder="ravi@example.com"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label>I am a</Label>
                  <div className="mt-2 flex gap-3">
                    {(['school', 'teacher'] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, role: r }))}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-colors ${
                          form.role === r
                            ? 'border-brand-secondary bg-blue-50 text-brand-secondary'
                            : 'border-border-default bg-white text-text-muted hover:bg-bg-page'
                        }`}
                      >
                        {r === 'school' ? 'School / Recruiter' : 'Teacher'}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    className="mt-1"
                    placeholder="Bangalore"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  {loading ? 'Submitting...' : 'Request early access →'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>

      <footer className="py-8 px-6 border-t border-border-default bg-white text-center text-sm text-text-muted mt-auto">
        <p>© 2026 EduHire · <Link href="/about" className="hover:text-text-primary transition-colors">About</Link> · <Link href="/help" className="hover:text-text-primary transition-colors">Help</Link></p>
      </footer>
    </div>
  );
}
