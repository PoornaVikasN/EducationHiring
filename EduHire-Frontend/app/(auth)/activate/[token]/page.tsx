'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Input } from '../../../../common-components/ui/input';
import { Label } from '../../../../common-components/ui/label';
import { Button } from '../../../../common-components/ui/button';
import { PasswordField } from '../../../../common-components/auth/password-field';
import { authApi } from '../../../../lib/api/auth';

const activateSchema = z
  .object({
    password: z.string().min(10, 'Password must be at least 10 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type ActivateInput = z.infer<typeof activateSchema>;

export default function ActivateAccountPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const [done, setDone] = useState(false);
  const form = useForm<ActivateInput>({ resolver: zodResolver(activateSchema) });

  const onSubmit = async (data: ActivateInput) => {
    setServerError('');
    try {
      await authApi.setPasswordViaActivation(params.token, data.password);
      setDone(true);
      setTimeout(() => router.replace('/login'), 2500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'This activation link is invalid or has expired.';
      setServerError(typeof msg === 'string' ? msg : 'Activation failed.');
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
        <h2 className="text-lg font-bold text-text-primary mb-2">Account activated!</h2>
        <p className="text-sm text-text-muted">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Set your password</h1>
      <p className="text-xs sm:text-sm text-text-muted mb-4 sm:mb-6">
        An administrator created your School Teacher account. Choose a password to activate it.
      </p>

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
        <PasswordField
          id="password"
          label="New password"
          placeholder="At least 10 characters"
          autoComplete="new-password"
          registration={form.register('password')}
          error={form.formState.errors.password?.message}
        />

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirm password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Repeat your new password"
            autoComplete="new-password"
            {...form.register('confirmPassword')}
          />
          {form.formState.errors.confirmPassword && (
            <p className="text-xs text-red-500">{form.formState.errors.confirmPassword.message}</p>
          )}
        </div>

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Activating…' : 'Activate account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-text-muted">
        <Link href="/login" className="text-brand-primary hover:underline font-medium">
          ← Back to Sign in
        </Link>
      </p>
    </>
  );
}
