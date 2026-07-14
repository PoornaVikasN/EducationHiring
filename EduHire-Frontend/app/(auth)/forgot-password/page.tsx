'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../../common-components/ui/button';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
import { PasswordField } from '../../../common-components/auth/password-field';
import { OtpCodeInput } from '../../../common-components/auth/otp-code-input';
import { RecaptchaNotice } from '../../../common-components/auth/recaptcha-notice';
import { authApi } from '../../../lib/api/auth';

const emailSchema = z.object({
  email: z.string().email('Enter a valid email address'),
});

const resetSchema = z
  .object({
    otp: z.string().length(6, 'Enter the 6-digit code'),
    password: z.string().min(10, 'Password must be at least 10 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type EmailInput = z.infer<typeof emailSchema>;
type ResetInput = z.infer<typeof resetSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [sentEmail, setSentEmail] = useState('');
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const emailForm = useForm<EmailInput>({ resolver: zodResolver(emailSchema) });
  const resetForm = useForm<ResetInput>({ resolver: zodResolver(resetSchema) });

  const onSendOtp = async (data: EmailInput) => {
    setServerError('');
    try {
      const recaptchaToken = executeRecaptcha ? await executeRecaptcha('forgot_password') : undefined;
      await authApi.forgotPassword(data.email, recaptchaToken);
      setSentEmail(data.email);
      setStep('reset');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Something went wrong. Please try again.';
      setServerError(typeof msg === 'string' ? msg : 'Something went wrong.');
    }
  };

  const onReset = async (data: ResetInput) => {
    setServerError('');
    try {
      await authApi.resetPassword({ email: sentEmail, otp: data.otp, password: data.password });
      setDone(true);
      setTimeout(() => router.replace('/login'), 2500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Reset failed. Please check the code and try again.';
      setServerError(typeof msg === 'string' ? msg : 'Reset failed.');
    }
  };

  if (done) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 rounded-full bg-brand-primary-light flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">Password reset!</h2>
        <p className="text-sm text-text-muted">Redirecting you to sign in…</p>
      </div>
    );
  }

  if (step === 'reset') {
    return (
      <>
        <h1 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Set new password</h1>
        <p className="text-xs sm:text-sm text-text-muted mb-1">
          We sent a 6-digit code to
        </p>
        <p className="text-xs sm:text-sm font-semibold text-text-primary mb-4 sm:mb-5">{sentEmail}</p>

        <form onSubmit={resetForm.handleSubmit(onReset)} className="space-y-3 sm:space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="otp">Verification code</Label>
            <OtpCodeInput
              value={resetForm.watch('otp') ?? ''}
              onChange={(val) => resetForm.setValue('otp', val, { shouldValidate: true })}
            />
            {resetForm.formState.errors.otp && (
              <p className="text-xs text-red-500">{resetForm.formState.errors.otp.message}</p>
            )}
          </div>

          <PasswordField
            id="password"
            label="New password"
            placeholder="At least 10 characters"
            autoComplete="new-password"
            registration={resetForm.register('password')}
            error={resetForm.formState.errors.password?.message}
          />

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat your new password"
              autoComplete="new-password"
              {...resetForm.register('confirmPassword')}
            />
            {resetForm.formState.errors.confirmPassword && (
              <p className="text-xs text-red-500">{resetForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {serverError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
              {serverError}
            </div>
          )}

          <Button type="submit" className="w-full" size="lg" disabled={resetForm.formState.isSubmitting}>
            {resetForm.formState.isSubmitting ? 'Resetting…' : 'Reset password'}
          </Button>
        </form>

        <p className="mt-4 text-xs text-center text-text-muted">
          Didn&apos;t get the code?{' '}
          <Button
            variant="link"
            className="h-auto p-0 text-brand-primary font-medium"
            onClick={() => { setStep('email'); setServerError(''); }}
          >
            Try again
          </Button>
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Forgot password?</h1>
      <p className="text-xs sm:text-sm text-text-muted mb-4 sm:mb-6">
        Enter your account email and we&apos;ll send you a reset code.
      </p>

      <form onSubmit={emailForm.handleSubmit(onSendOtp)} className="space-y-3 sm:space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...emailForm.register('email')}
          />
          {emailForm.formState.errors.email && (
            <p className="text-xs text-red-500">{emailForm.formState.errors.email.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={emailForm.formState.isSubmitting}>
          {emailForm.formState.isSubmitting ? 'Sending…' : 'Send reset code'}
        </Button>
        <RecaptchaNotice />
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        <Link href="/login" className="text-brand-primary hover:underline font-medium">
          ← Back to Sign in
        </Link>
      </p>
    </>
  );
}
