'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useGoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../../common-components/ui/button';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
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
  const [showPassword, setShowPassword] = useState(false);

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
      <p className="text-sm text-text-muted mb-5">Join EduHire — free for teachers, always</p>

      {/* Role toggle */}
      <div className="flex gap-2 mb-5">
        {([
          { value: Role.JOB_SEEKER, label: "I'm a Teacher" },
          { value: Role.RECRUITER,  label: "I'm a School" },
        ] as { value: Role.JOB_SEEKER | Role.RECRUITER; label: string }[]).map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            variant={selectedRole === value ? 'default' : 'outline'}
            className="flex-1 text-sm"
            onClick={() => { setValue('role', value); setGoogleRole(value); }}
          >
            {label}
          </Button>
        ))}
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

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 10 characters"
              autoComplete="new-password"
              className="pr-10"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
        </div>

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
      <Button
        type="button"
        variant="outline"
        size="lg"
        className="w-full"
        onClick={() => googleLogin()}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continue with Google
      </Button>

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
