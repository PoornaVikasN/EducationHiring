'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useGoogleLogin } from '@react-oauth/google';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../../common-components/ui/button';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
import { PasswordField } from '../../../common-components/auth/password-field';
import { GoogleButton } from '../../../common-components/auth/google-button';
import { RoleToggle } from '../../../common-components/auth/role-toggle';
import { authApi } from '../../../lib/api/auth';
import { useAuth } from '../../../lib/auth-context';
import { getRoleHome } from '../../../lib/auth-redirect';
import { Role } from '../../../lib/shared/enums';
import { registerSchema, type RegisterInput } from '../../../lib/validations/auth';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const prefillRole = searchParams.get('role') === 'RECRUITER' ? Role.RECRUITER : Role.JOB_SEEKER;

  const [serverError, setServerError] = useState('');
  const [success, setSuccess] = useState(false);
  const [googleLinked, setGoogleLinked] = useState(false);
  const [googleRole, setGoogleRole] = useState<Role.JOB_SEEKER | Role.RECRUITER>(prefillRole);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: prefillRole },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterInput) => {
    setServerError('');
    try {
      const res = await authApi.register(data);
      setSuccess(true);
      setTimeout(() => {
        const devParam = res.data.devOtp ? `&devOtp=${res.data.devOtp}` : '';
        router.push(`/otp-verify?email=${encodeURIComponent(data.email)}&sent=1${devParam}`);
      }, 1500);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed. Please try again.';
      setServerError(typeof msg === 'string' ? msg : 'Registration failed. Please try again.');
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setServerError('');
      try {
        const res = await authApi.googleAuth({ accessToken: tokenResponse.access_token, role: googleRole });
        login(res.data.accessToken, res.data.user);
        if (res.data.isLinked) {
          setGoogleLinked(true);
          setTimeout(() => router.replace(getRoleHome(res.data.user.role)), 2500);
        } else {
          router.replace(getRoleHome(res.data.user.role));
        }
      } catch {
        setServerError('Google sign-up failed. Please try again.');
      }
    },
    onError: () => setServerError('Google sign-up was cancelled.'),
  });

  if (success) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 rounded-full bg-brand-primary-light flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-brand-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Account created!</h2>
        <p className="text-sm text-text-muted">Redirecting you to verify your email…</p>
      </div>
    );
  }

  return (
    <>
      <h1 className="text-xl font-bold text-text-primary mb-1">Create your account</h1>
      <p className="text-sm text-text-muted mb-5">Join SchoolTeacher — free for teachers, always</p>

      {/* Role toggle */}
      <div className="mb-5">
        <RoleToggle
          value={selectedRole}
          teacherLabel="I'm a Teacher"
          schoolLabel="I'm a School"
          onChange={(role) => { setValue('role', role); setGoogleRole(role); }}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" placeholder="Priya Sharma" {...register('fullName')} />
          {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@example.com" autoComplete="email" {...register('email')} />
          {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone number</Label>
          <div className="flex">
            <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-border-default bg-bg-page text-sm text-text-muted select-none">
              +91
            </span>
            <Input
              id="phone"
              type="tel"
              placeholder="98765 43210"
              className="rounded-l-none flex-1"
              maxLength={10}
              {...register('phone')}
            />
          </div>
          {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
        </div>

        <PasswordField
          id="password"
          label="Password"
          placeholder="At least 10 characters"
          autoComplete="new-password"
          registration={register('password')}
          error={errors.password?.message}
        />

        {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}

        {googleLinked && (
          <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Account found — your Google account has been linked. Signing you in…
          </div>
        )}

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-default" />
        </div>
        <div className="relative flex justify-center text-xs text-text-muted bg-bg-card px-2">
          or sign up with Google
        </div>
      </div>

      {/* Google OAuth */}
      <GoogleButton onClick={() => googleLogin()} size="lg" />

      <p className="mt-5 text-center text-sm text-text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-primary hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
