'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../common-components/ui/button';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
import { authApi } from '../../../lib/api/auth';
import { useAuth } from '../../../lib/auth-context';
import { getRoleHome } from '../../../lib/auth-redirect';
import { verifyOtpSchema, type VerifyOtpInput } from '../../../lib/validations/auth';

const RESEND_COOLDOWN = 60;

const emailOnlySchema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type EmailOnlyInput = z.infer<typeof emailOnlySchema>;

function OtpVerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const prefillEmail = searchParams.get('email') ?? '';
  const alreadySent = searchParams.get('sent') === '1';
  const prefillDevOtp = searchParams.get('devOtp') ?? '';

  // Step 1 = collect email; step 2 = enter OTP code
  const [step, setStep] = useState<1 | 2>(prefillEmail ? 2 : 1);
  const [email, setEmail] = useState(prefillEmail);
  const [serverError, setServerError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState(prefillDevOtp);

  const autoSentRef = useRef(false);

  // Step 1 form — email collection
  const emailForm = useForm<EmailOnlyInput>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: prefillEmail },
  });

  // Step 2 form — OTP code
  const otpForm = useForm<VerifyOtpInput>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { email, code: '' },
  });

  // Auto-send OTP when arriving with ?email= (from registration flow, skip ?sent=1)
  useEffect(() => {
    if (!prefillEmail || alreadySent || autoSentRef.current) return;
    autoSentRef.current = true;
    authApi.sendOtp(prefillEmail)
      .then((r) => { startCooldown(); if (r.data.devOtp) setDevOtp(r.data.devOtp); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startCooldown() {
    setResendCooldown(RESEND_COOLDOWN);
    const id = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) { clearInterval(id); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  // Step 1 submit: send OTP then advance to step 2
  const onSendOtp = async (data: EmailOnlyInput) => {
    setServerError('');
    try {
      const r = await authApi.sendOtp(data.email);
      setEmail(data.email);
      otpForm.setValue('email', data.email);
      startCooldown();
      if (r.data.devOtp) setDevOtp(r.data.devOtp);
      setStep(2);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not send OTP. Please try again.';
      emailForm.setError('email', { message: typeof msg === 'string' ? msg : 'Could not send OTP.' });
    }
  };

  const handleResend = async () => {
    setServerError('');
    try {
      const r = await authApi.sendOtp(email);
      startCooldown();
      if (r.data.devOtp) setDevOtp(r.data.devOtp);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Could not resend OTP. Please try again.';
      setServerError(typeof msg === 'string' ? msg : 'Could not resend OTP.');
    }
  };

  // Step 2 submit: verify OTP
  const onVerify = async (data: VerifyOtpInput) => {
    setServerError('');
    try {
      const res = await authApi.verifyOtp(data);
      login(res.data.accessToken, res.data.user);
      router.replace(getRoleHome(res.data.user.role));
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Invalid or expired OTP. Please try again.';
      setServerError(typeof msg === 'string' ? msg : 'Invalid OTP. Please try again.');
    }
  };

  /* ── Step 1: Email input ── */
  if (step === 1) {
    return (
      <>
        <h1 className="text-xl font-bold text-text-primary mb-1">Login with OTP</h1>
        <p className="text-sm text-text-muted mb-6">
          Enter your registered email and we&apos;ll send you a one-time code to sign in.
        </p>

        <form onSubmit={emailForm.handleSubmit(onSendOtp)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              autoFocus
              {...emailForm.register('email')}
            />
            {emailForm.formState.errors.email && (
              <p className="text-xs text-red-500">{emailForm.formState.errors.email.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={emailForm.formState.isSubmitting}
          >
            {emailForm.formState.isSubmitting ? 'Sending…' : 'Send OTP →'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          <Link href="/login" className="text-brand-primary hover:underline font-medium">
            ← Back to Sign in
          </Link>
        </p>
      </>
    );
  }

  /* ── Step 2: OTP code entry ── */
  return (
    <>
      <h1 className="text-xl font-bold text-text-primary mb-1">Verify your email</h1>
      <p className="text-sm text-text-muted mb-6">
        We sent a 6-digit code to your email. Enter it below to sign in.
      </p>

      {/* Dev OTP hint — only visible when NODE_ENV !== production */}
      {devOtp && (
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 mb-4">
          <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide shrink-0">DEV</span>
          <span className="text-sm text-amber-800">OTP code: <span className="font-mono font-bold tracking-widest">{devOtp}</span></span>
        </div>
      )}

      {/* Email display */}
      <div className="flex items-center gap-3 bg-brand-primary-light border border-brand-primary/20 rounded-xl px-4 py-3 mb-5">
        <svg className="w-4 h-4 text-brand-primary shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="text-sm font-medium text-brand-primary truncate flex-1">{email}</span>
        {!prefillEmail && (
          <button
            type="button"
            onClick={() => setStep(1)}
            className="text-xs text-text-muted hover:text-brand-primary underline underline-offset-2 shrink-0"
          >
            Change
          </button>
        )}
      </div>

      <form onSubmit={otpForm.handleSubmit(onVerify)} className="space-y-4">
        <input type="hidden" {...otpForm.register('email')} />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="code">Verification code</Label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="text-xs text-brand-primary hover:text-brand-primary-dark h-auto p-0"
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </Button>
          </div>
          <Input
            id="code"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            maxLength={6}
            autoFocus
            className="tracking-[0.4em] text-center text-xl font-mono h-12"
            {...otpForm.register('code')}
          />
          {otpForm.formState.errors.code && (
            <p className="text-xs text-red-500">{otpForm.formState.errors.code.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={otpForm.formState.isSubmitting}>
          {otpForm.formState.isSubmitting ? 'Verifying…' : 'Verify & sign in'}
        </Button>
      </form>

      <p className="mt-4 text-xs text-center text-text-muted">
        Didn&apos;t get the email? Check your spam folder or{' '}
        <Button
          variant="link"
          className="h-auto p-0 text-brand-primary font-medium"
          onClick={handleResend}
          disabled={resendCooldown > 0}
        >
          resend the code
        </Button>
        .
      </p>

      <p className="mt-4 text-center text-sm text-text-muted">
        <Link href="/login" className="text-brand-primary hover:underline font-medium">
          ← Back to Sign in
        </Link>
      </p>
    </>
  );
}

export default function OtpVerifyPage() {
  return (
    <Suspense>
      <OtpVerifyForm />
    </Suspense>
  );
}
