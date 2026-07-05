import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

// Lightweight CSRF defense for cookie-authenticated POST endpoints (/auth/refresh, /auth/logout).
//
// Combined defenses already in place:
//   - Refresh cookie is httpOnly + sameSite=lax (blocks most cross-site cookie sends)
//   - CORS allowlist + credentials:true (browsers preflight credentialed requests)
//
// This guard adds two cheap-but-effective checks:
//   1. Require `X-Requested-With: XMLHttpRequest` — browsers cannot set this header
//      cross-origin without a CORS preflight, and our preflight rejects unknown origins.
//      HTML `<form>` cannot set custom headers, blocking form-based CSRF entirely.
//   2. Verify Origin (or Referer fallback) is in the CORS allowlist — defense in depth.
//
// Apply via `@UseGuards(CsrfGuard)` on each cookie-auth endpoint.

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();

    const requestedWith = req.headers['x-requested-with'];
    if (requestedWith !== 'XMLHttpRequest') {
      throw new ForbiddenException('CSRF check failed: missing X-Requested-With header');
    }

    const allowed = (process.env.CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (allowed.length === 0 && process.env.NODE_ENV !== 'production') {
      allowed.push('http://localhost:3000');
    }

    const origin = (req.headers.origin ?? '').toString();
    const referer = (req.headers.referer ?? '').toString();
    const refererOrigin = referer ? safeOrigin(referer) : '';

    const ok =
      (origin && allowed.includes(origin)) ||
      (refererOrigin && allowed.includes(refererOrigin));

    if (!ok) {
      throw new ForbiddenException('CSRF check failed: untrusted Origin/Referer');
    }

    return true;
  }
}

function safeOrigin(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}`;
  } catch {
    return '';
  }
}
