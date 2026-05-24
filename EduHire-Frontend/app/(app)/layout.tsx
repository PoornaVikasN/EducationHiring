'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AppHeader from '@/common-components/app-header';
import { useAuth } from '../../lib/auth-context';
import { Role } from '../../lib/shared/enums';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role === Role.RECRUITER) {
      router.replace('/recruiter/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <div className="w-8 h-8 rounded-full border-4 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-page">
      <AppHeader />
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
