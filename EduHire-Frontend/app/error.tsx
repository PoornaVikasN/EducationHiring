'use client';

import { AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '../common-components/ui/button';
import { useAuth } from '../lib/auth-context';
import { Role } from '../lib/shared/enums';

function homePath(role: Role | undefined): string {
  if (role === Role.ADMIN) return '/admin';
  if (role === Role.RECRUITER) return '/recruiter/dashboard';
  if (role === Role.JOB_SEEKER) return '/dashboard';
  return '/';
}

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { user } = useAuth();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-page px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">Something went wrong</h1>
        <p className="text-sm text-text-muted mb-6">
          An unexpected error occurred. Try refreshing, or go back home.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Link href={homePath(user?.role as Role | undefined)}>
            <Button variant="outline">Go home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
