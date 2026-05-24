import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/', '/pricing', '/about'];
const AUTH_PATHS = ['/login', '/register', '/otp-verify', '/forgot-password', '/reset-password'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  );
  const isAuthPage = AUTH_PATHS.some((p) => pathname.startsWith(p));

  // Presence of refresh_token cookie = session exists
  const hasSession = request.cookies.has('refresh_token');

  // Unauthenticated user on protected route → login
  if (!isPublic && !isAuthPage && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user on auth page → send to role home
  // Role home determined client-side after mount (avoids needing role cookie in middleware)
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|public).*)'],
};
