'use client';

import { ChevronDown, LogOut, Menu, X } from 'lucide-react';
import NotificationsBell from './notifications-bell';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth-context';
import { hospitalsApi } from '@/lib/api/hospitals';
import { NotificationKind, Role, VerificationStatus } from '@/lib/shared/enums';
import { useWebPush } from '@/hooks/use-web-push';

interface NavItem { label: string; href: string }

const SEEKER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Browse Jobs', href: '/jobs' },
  { label: 'My Applications', href: '/applications' },
  { label: 'Messages', href: '/chat' },
  { label: 'My Profile', href: '/profile' },
  { label: 'Settings', href: '/settings' },
];

const RECRUITER_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/recruiter/dashboard' },
  { label: 'My Jobs', href: '/recruiter/jobs' },
  { label: 'Applicants', href: '/recruiter/applicants' },
  { label: 'Messages', href: '/recruiter/chat' },
  { label: 'School Profile', href: '/recruiter/hospital' },
  { label: 'Subscription', href: '/recruiter/subscription' },
  { label: 'Settings', href: '/recruiter/settings' },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Schools', href: '/admin/hospitals' },
  { label: 'Jobs', href: '/admin/jobs' },
  { label: 'Payments', href: '/admin/payments' },
  { label: 'Analytics', href: '/admin/analytics' },
  { label: 'Disputes', href: '/admin/disputes' },
  { label: 'Audit', href: '/admin/audit' },
  { label: 'Pricing', href: '/admin/pricing' },
  { label: 'Config', href: '/admin/config' },
];

export default function AppHeader() {
  const { user, accessToken, logout } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();

  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isRecruiter = user?.role === Role.RECRUITER;
  const isAdmin = user?.role === Role.ADMIN;
  const nav = isAdmin ? ADMIN_NAV : isRecruiter ? RECRUITER_NAV : SEEKER_NAV;
  const homeHref = isAdmin ? '/admin' : isRecruiter ? '/recruiter/dashboard' : '/dashboard';

  useWebPush(user?.id);

  const { data: hospital, isLoading: hospitalLoading } = useQuery({
    queryKey: ['my-hospital'],
    queryFn: () => hospitalsApi.getMine().then((r) => r.data).catch(() => null),
    enabled: isRecruiter && !!user,
  });

  // Disable all nav tabs for recruiter when: still loading (prevent flash), no hospital yet, or hospital unverified
  // Only Dashboard and Hospital Profile are always accessible
  const RECRUITER_ALLOWED = ['/recruiter/dashboard', '/recruiter/hospital'];
  const isNavDisabled = (href: string) =>
    isRecruiter &&
    !hospitalLoading &&
    (hospital == null || !hospital.isVerified) &&
    !RECRUITER_ALLOWED.some((p) => href.startsWith(p));

  const navDisabledTooltip =
    hospital?.verificationStatus === VerificationStatus.REJECTED
      ? 'School profile rejected — update and resubmit to unlock'
      : hospital?.verificationStatus === VerificationStatus.PENDING
      ? 'Awaiting admin verification — you will be notified once approved'
      : 'Set up your school profile to unlock all features';

  const displayName =
    (isRecruiter
      ? (user?.recruiterProfile as { fullName?: string } | null)?.fullName
      : (user?.seekerProfile as { fullName?: string } | null)?.fullName) ??
    user?.email ??
    '';

  const initials = displayName
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('')
    .slice(0, 2) || '?';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleLogout = async () => {
    setProfileOpen(false);
    await logout().catch(() => {});
    router.push('/login');
  };

  // Always render the shell so layout doesn't collapse; show minimal logo-only header while user loads
  if (!user) {
    return (
      <header className="sticky top-0 z-50 bg-brand-header text-white h-16 shadow-lg border-b border-white/5">
        <div className="max-w-7xl mx-auto w-full h-full flex items-center px-4 sm:px-6">
          <span className="flex items-center gap-1">
            <span className="text-xl font-bold" style={{ color: '#7986cb' }}>Edu</span>
            <span className="text-xl font-bold">Hire</span>
          </span>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 bg-brand-header text-white h-16 shadow-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto w-full h-full flex items-center px-4 sm:px-6">

        {/* Logo */}
        <Link href={homeHref} className="flex items-center gap-1 mr-6 shrink-0">
          <span className="text-xl font-bold" style={{ color: '#7986cb' }}>Edu</span>
          <span className="text-xl font-bold">Hire</span>
          {isRecruiter && (
            <span className="ml-2 hidden sm:inline text-[10px] bg-brand-primary px-2 py-0.5 rounded-full font-medium">
              School
            </span>
          )}
        </Link>

        {/* Separator */}
        <div className="hidden md:block w-px h-5 bg-white/20 mr-6" />

        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1 flex-1">
          {nav.map((item) => {
            const isActive = pathname === item.href || (item.href !== homeHref && pathname.startsWith(item.href + '/'));
            const disabled = isNavDisabled(item.href);
            if (disabled) {
              return (
                <span
                  key={item.href}
                  title={navDisabledTooltip}
                  className="text-sm px-3 py-1.5 rounded-lg whitespace-nowrap text-slate-500 cursor-not-allowed select-none"
                >
                  {item.label}
                </span>
              );
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 ml-auto">
          <NotificationsBell
            accessToken={accessToken}
            onNotification={(notif) => {
              if (notif.kind === NotificationKind.HOSPITAL_VERIFIED) {
                qc.invalidateQueries({ queryKey: ['my-hospital'] });
              }
            }}
          />
          {/* Profile dropdown */}
          <div ref={dropdownRef} className="relative">
            <button
              onClick={() => setProfileOpen((p) => !p)}
              className="flex items-center gap-2 rounded-xl p-1.5 pr-3 hover:bg-white/10 transition-colors group"
            >
              <div
                className={`w-8 h-8 rounded-full bg-gradient-to-br from-brand-primary to-teal-400 flex items-center justify-center text-xs font-bold text-white ring-2 ring-offset-2 ring-offset-brand-header transition-all duration-200 ${
                  profileOpen ? 'ring-green-400' : 'ring-transparent group-hover:ring-green-400/50'
                }`}
              >
                {initials}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-semibold text-white leading-tight truncate max-w-[130px]">
                  {displayName}
                </span>
                <span className="text-[10px] text-slate-400 leading-tight">
                  {isAdmin ? 'Administrator' : isRecruiter ? 'School / Recruiter' : 'Teacher'}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {/* Profile dropdown panel */}
            <div
              className={`absolute right-0 top-full mt-2 w-72 rounded-2xl overflow-hidden bg-white border border-border-default z-[999] transition-all duration-200 ${
                profileOpen
                  ? 'opacity-100 translate-y-0 scale-100 visible'
                  : 'opacity-0 -translate-y-2 scale-95 invisible pointer-events-none'
              }`}
              style={{ boxShadow: '0 20px 60px -10px rgba(0,0,0,0.25), 0 0 1px rgba(0,0,0,0.08)' }}
            >
              {/* Gradient header */}
              <div className="p-5 bg-gradient-to-br from-brand-primary to-teal-600 text-white">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-base font-bold shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{displayName}</p>
                    {user.email && (
                      <p className="text-xs text-white/80 truncate">{user.email}</p>
                    )}
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-xs px-2.5 py-1 bg-white/20 rounded-full font-medium">
                    {isAdmin ? 'Administrator' : isRecruiter ? 'School / Recruiter' : 'Teacher'}
                  </span>
                </div>
              </div>

              {/* Info row */}
              {user.phone && (
                <div className="px-4 py-3 text-sm border-b border-border-default flex justify-between">
                  <span className="text-text-muted">Phone</span>
                  <span className="font-medium text-text-primary">{user.phone}</span>
                </div>
              )}

              {/* Actions */}
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            onClick={() => setMobileOpen((p) => !p)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileOpen && (
        <div className="fixed inset-x-0 top-16 z-40 bg-brand-header border-b border-white/10 md:hidden">
          <nav className="p-3 space-y-1">
            {nav.map((item) => {
              const isActive = pathname === item.href;
              const disabled = isNavDisabled(item.href);
              if (disabled) {
                return (
                  <span
                    key={item.href}
                    title={navDisabledTooltip}
                    className="block text-sm px-4 py-2.5 rounded-xl text-slate-500 cursor-not-allowed select-none"
                  >
                    {item.label}
                  </span>
                );
              }
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block text-sm px-4 py-2.5 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full text-left text-sm px-4 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors mt-2 border-t border-white/10 pt-3"
            >
              Sign Out
            </button>
          </nav>
        </div>
      )}
    </>
  );
}
