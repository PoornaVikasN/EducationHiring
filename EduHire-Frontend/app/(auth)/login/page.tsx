'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useGoogleLogin } from '@react-oauth/google';
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '../../../common-components/ui/button';
import { Input } from '../../../common-components/ui/input';
import { Label } from '../../../common-components/ui/label';
import { PasswordField } from '../../../common-components/auth/password-field';
import { RecaptchaNotice } from '../../../common-components/auth/recaptcha-notice';
import { GoogleButton } from '../../../common-components/auth/google-button';
import { RoleToggle } from '../../../common-components/auth/role-toggle';
import { authApi } from '../../../lib/api/auth';
import { useAuth } from '../../../lib/auth-context';
import { getRoleHome } from '../../../lib/auth-redirect';
import { Role } from '../../../lib/shared/enums';
import { loginSchema, type LoginInput } from '../../../lib/validations/auth';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [serverError, setServerError] = useState('');
  const [googleRole, setGoogleRole] = useState<Role.TEACHER | Role.RECRUITER>(Role.TEACHER);
  const { executeRecaptcha } = useGoogleReCaptcha();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const redirectAfterLogin = (role: Role) => {
    const next = searchParams.get('next');
    router.replace(next ?? getRoleHome(role));
  };

  const onSubmit = async (data: LoginInput) => {
    setServerError('');
    try {
      const recaptchaToken = executeRecaptcha ? await executeRecaptcha('login') : undefined;
      const res = await authApi.login({ ...data, recaptchaToken });
      login(res.data.accessToken, res.data.user);
      redirectAfterLogin(res.data.user.role);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please try again.';
      setServerError(typeof msg === 'string' ? msg : 'Login failed. Please try again.');
    }
  };

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setServerError('');
      try {
        const res = await authApi.googleAuth({
          accessToken: tokenResponse.access_token,
          role: googleRole,
        });
        login(res.data.accessToken, res.data.user);
        redirectAfterLogin(res.data.user.role);
      } catch {
        setServerError('Google sign-in failed. Please try again.');
      }
    },
    onError: () => setServerError('Google sign-in was cancelled.'),
  });

  return (
    <>
      <h1 className="text-lg sm:text-xl font-bold text-text-primary mb-1">Welcome back</h1>
      <p className="text-xs sm:text-sm text-text-muted mb-4 sm:mb-6">Sign in to your SchoolTeacher account</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-red-500">{errors.email.message}</p>
          )}
        </div>

        <PasswordField
          id="password"
          label="Password"
          placeholder="••••••••••"
          autoComplete="current-password"
          registration={register('password')}
          error={errors.password?.message}
          rightSlot={
            <Link href="/forgot-password" className="text-xs text-brand-primary hover:underline">
              Forgot password?
            </Link>
          }
        />

        {serverError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <RecaptchaNotice />
      </form>

      <div className="relative my-4 sm:my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border-default" />
        </div>
        <div className="relative flex justify-center text-xs text-text-muted bg-bg-card px-2">
          or continue with
        </div>
      </div>

      {/* Google — role selector shown only for Google path since BE needs role on first signup */}
      <div className="space-y-2">
        <RoleToggle value={googleRole} onChange={setGoogleRole} size="sm" />
        <GoogleButton onClick={() => googleLogin()} />
      </div>

      <div className="mt-4 sm:mt-6 space-y-2 text-center text-xs sm:text-sm text-text-muted">
        <p>
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-brand-primary hover:underline font-medium">
            Sign up
          </Link>
        </p>
        <p>
          Login with OTP?{' '}
          <Link href="/otp-verify" className="text-brand-primary hover:underline font-medium">
            Use email OTP
          </Link>
        </p>
      </div>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
