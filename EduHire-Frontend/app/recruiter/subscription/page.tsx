'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Clock, Infinity } from 'lucide-react';
import { subscriptionsApi } from '../../../lib/api/subscriptions';
import { schoolsApi } from '../../../lib/api/schools';
import { Button } from '../../../common-components/ui/button';
import { useToast } from '../../../hooks/use-toast';
import { useRazorpay } from '../../../hooks/use-razorpay';
import { PaymentKind, SubscriptionStatus } from '../../../lib/shared/enums';
import { usePublicPricing, formatRupees } from '../../../hooks/use-public-pricing';
import { usePublicSettings } from '../../../hooks/use-public-settings';

export default function RecruiterSubscriptionPage() {
  const { toast } = useToast();
  const { pay } = useRazorpay();
  const qc = useQueryClient();
  const { pricing } = usePublicPricing();
  const { settings } = usePublicSettings();
  const subPaise = pricing.RECRUITER_MONTHLY_PAISE;
  const freeLimit = settings.FREE_TIER_JOB_LIMIT;

  const { data: school } = useQuery({
    queryKey: ['my-school'],
    queryFn: () => schoolsApi.getMine().then((r) => r.data).catch(() => null),
  });

  const { data: subscription, isLoading } = useQuery({
    queryKey: ['my-subscription'],
    queryFn: () => subscriptionsApi.getMine().then((r) => r.data),
  });

  const isActive = subscription?.status === SubscriptionStatus.ACTIVE
    && new Date(subscription.expiresAt) > new Date();

  const daysLeft = subscription?.expiresAt
    ? Math.max(0, Math.ceil((new Date(subscription.expiresAt).getTime() - Date.now()) / 86_400_000))
    : 0;

  const isExpiringSoon = isActive && daysLeft <= 7;

  const handleSubscribe = () => {
    if (!school) {
      toast({ title: 'Set up your school profile first', variant: 'destructive' });
      return;
    }
    pay(
      PaymentKind.SUBSCRIPTION,
      school._id,
      `Unlimited school subscription — 30 days`,
      () => {
        toast({ title: 'Subscription activated!', description: 'You can now post unlimited teaching jobs for 30 days.' });
        qc.invalidateQueries({ queryKey: ['my-subscription'] });
        qc.invalidateQueries({ queryKey: ['recruiter-jobs-summary'] });
        qc.invalidateQueries({ queryKey: ['recruiter-jobs-list'] });
      },
      () => toast({ title: 'Payment failed', variant: 'destructive' }),
    );
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-text-primary flex items-center gap-2"><Infinity className="w-5 h-5 text-brand-primary" /> Unlimited Plan</h1>
        <p className="text-sm text-text-muted mt-0.5">Post unlimited teaching jobs for 30 days</p>
      </div>

      {/* Subscription status */}
      {isLoading ? (
        <div className="h-40 bg-bg-card border border-border-default rounded-2xl animate-pulse" />
      ) : isActive ? (
        <div className={`rounded-2xl p-6 ${isExpiringSoon ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isExpiringSoon ? 'bg-amber-100' : 'bg-green-100'}`}>
              {isExpiringSoon
                ? <Clock className="w-5 h-5 text-amber-600" />
                : <CheckCircle className="w-5 h-5 text-green-600" />}
            </div>
            <div>
              <p className={`text-sm font-bold ${isExpiringSoon ? 'text-amber-800' : 'text-green-800'}`}>
                {isExpiringSoon ? `Expiring in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — renew to avoid downtime` : 'Subscription Active'}
              </p>
              <p className={`text-xs ${isExpiringSoon ? 'text-amber-700' : 'text-green-700'}`}>
                Expires {new Date(subscription!.expiresAt).toLocaleDateString('en-IN')}
              </p>
            </div>
          </div>
          {!isExpiringSoon && (
            <div className="text-xs text-green-700 space-y-1">
              <p>✓ Post unlimited teaching jobs this month</p>
              <p>✓ Priority listing in teacher search results</p>
            </div>
          )}
        </div>
      ) : subscription ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <p className="text-sm font-semibold text-amber-800">Subscription Expired</p>
          </div>
          <p className="text-xs text-amber-700">Your subscription expired on {new Date(subscription.expiresAt).toLocaleDateString('en-IN')}. Renew to post unlimited jobs again.</p>
        </div>
      ) : (
        <div className="bg-slate-50 border border-border-default rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-text-muted" />
            <p className="text-sm font-semibold text-text-primary">No active subscription</p>
          </div>
          <p className="text-xs text-text-muted">Subscribe to post unlimited teaching jobs{freeLimit != null ? ` beyond the ${freeLimit} free/month limit` : ''}.</p>
        </div>
      )}

      {/* Plan card */}
      <div className="bg-bg-card border-2 border-brand-primary/30 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary opacity-5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-brand-primary-light flex items-center justify-center">
              <Infinity className="w-5 h-5 text-brand-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-text-primary">School Unlimited Plan</p>
              <p className="text-2xl font-black text-brand-primary">{subPaise != null ? formatRupees(subPaise) : '—'}<span className="text-sm font-medium text-text-muted">/month</span></p>
            </div>
          </div>

          <ul className="space-y-2 mb-5">
            {[
              'Unlimited teaching job postings for 30 days',
              'Priority placement in teacher search results',
              'Direct chat with shortlisted teachers',
              'All roles: SGT, PGT, TGT, HM, Principal & more',
              'Auto-renews with a simple payment — no contracts',
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-text-muted">
                <CheckCircle className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          {!school && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              ⚠️ Complete your school profile before subscribing.
            </p>
          )}

          {(!isActive || isExpiringSoon) && (
            <Button
              className={`w-full ${isExpiringSoon ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
              onClick={handleSubscribe}
              disabled={!school}
            >
              {isExpiringSoon
                ? `Renew Now — ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
                : subPaise != null ? `Subscribe Now — ${formatRupees(subPaise)}/month` : 'Subscribe Now'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
