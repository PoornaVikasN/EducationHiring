'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowRight, Clock } from 'lucide-react';
import Link from 'next/link';
import AppHeader from '@/common-components/app-header';
import { useAuth } from '../../lib/auth-context';
import { schoolsApi } from '../../lib/api/schools';
import { Role, VerificationStatus } from '../../lib/shared/enums';

// Routes accessible even when school is unverified
const ALLOWED_UNVERIFIED = ['/recruiter/dashboard', '/recruiter/school'];

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const { data: school, isLoading: schoolLoading } = useQuery({
    queryKey: ['my-school'],
    queryFn: () => schoolsApi.getMine().then((r) => r.data).catch(() => null),
    enabled: !isLoading && !!user,
  });

  // Redirect non-recruiters away
  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (user.role !== Role.RECRUITER) {
      router.replace(user.role === Role.ADMIN ? '/admin' : '/dashboard');
    }
  }, [user, isLoading, router]);

  // Redirect unverified schools away from restricted pages
  useEffect(() => {
    if (!isLoading && !schoolLoading && school && !school.isVerified) {
      const allowed = ALLOWED_UNVERIFIED.some((p) => pathname.startsWith(p));
      if (!allowed) {
        router.replace('/recruiter/school');
      }
    }
  }, [school, schoolLoading, isLoading, pathname, router]);

  if (isLoading || schoolLoading || !user || user.role !== Role.RECRUITER) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-page">
        <div className="w-8 h-8 rounded-full border-4 border-brand-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const isUnverified = school && !school.isVerified;
  const isRejected = school?.verificationStatus === VerificationStatus.REJECTED;

  return (
    <div className="min-h-screen flex flex-col bg-bg-page">
      <AppHeader />

      {/* Verification status banner */}
      {isUnverified && (
        isRejected ? (
          <div className="bg-red-50 border-b border-red-200">
            <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertCircle className="w-3.5 h-3.5 text-red-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-red-800">School rejected — </span>
                <span className="text-sm text-red-700">Update your school profile and resubmit for admin review.</span>
              </div>
              <Link href="/recruiter/school" className="shrink-0 flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900 transition-colors">
                Update Profile <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border-b border-amber-200">
            <div className="max-w-6xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
              <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-amber-800">Verification pending — </span>
                <span className="text-sm text-amber-700">
                  Admin is reviewing your school. You will be notified once verified.
                </span>
              </div>
              <Link href="/recruiter/school" className="shrink-0 flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors">
                View Profile <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )
      )}

      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}
