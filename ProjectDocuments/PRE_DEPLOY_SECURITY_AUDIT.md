# PRE_DEPLOY_SECURITY_AUDIT.md — School Teacher

> This is **School Teacher's instance** of the generic
> [`PRODUCTION_SECURITY_CHECKLIST.md`](./PRODUCTION_SECURITY_CHECKLIST.md).
> Every row here maps back to a row in the generic checklist. Walk this file
> before any prod deploy. Mark ✅ shipped `<commit-hash>` or ❌ open.
>
> **Status as of 2026-07-05 (Phase 0):** Only the day-1 security scaffolding is
> shipped. Most rows are open because the domain modules (auth, users, schools,
> postings, applications, payments) haven't been built yet — the security
> practice is baked into the scaffolds so it lands correctly when those modules
> arrive.

---

## P0 — Blocks deploy

| # | Item | Status | Notes |
|---|---|---|---|
| 1 | Env-schema validation (Joi) at boot | ✅ Phase 0 | `env.validation.ts` with mutual-distinct check on JWT + CONFIG_ENCRYPTION_KEY (≥32 chars each) |
| 2 | Dedicated `CONFIG_ENCRYPTION_KEY` (not JWT-derived) | ✅ Phase 0 | SystemConfig api-key encryption via AES-256-CBC + SHA-256 derived key |
| 3 | Global `AllExceptionsFilter` — no stack in prod | ✅ Phase 0 | `common/filters/all-exceptions.filter.ts` |
| 4 | CORS allow-list (env, no `*`) — throws in prod if unset | ✅ Phase 0 | `main.ts` |
| 5 | Auth throttles (register/login/OTP/forgot) | ❌ Open | Wire per-endpoint `@Throttle()` when auth controller is built. Pattern in `BACKEND_GUIDE.md`. |
| 6 | CSRF guard on cookie-auth POSTs | ✅ Phase 0 | `common/guards/csrf.guard.ts` — apply via `@UseGuards(CsrfGuard)` on logout/refresh/CSRF-relevant endpoints |
| 7 | `tokenVersion` claim + validate on every request | ❌ Open | Wire in JwtStrategy when auth built |
| 8 | Helmet with COOP `same-origin-allow-popups` | ✅ Phase 0 | Google sign-in popup works with this |
| 9 | Body size cap (1 MB JSON + urlencoded) | ✅ Phase 0 | `main.ts` |
| 10 | Mongo operator sanitizer on `req.body` | ✅ Phase 0 | Custom middleware in `main.ts` (does NOT use `express-mongo-sanitize` — see DECISIONS.md) |
| 11 | Google OAuth: `verifyIdToken` server-side | ❌ Open | Wire when auth built (`google-auth-library`) |
| 12 | S3 uploads: `verifyUploadKey` HEAD before persist | ❌ Open | Helper exists in `uploads.service.ts`; call sites (users, schools) to be wired |
| 13 | Razorpay webhook: HMAC verify with `safeEqual` (timing-safe) | ❌ Open | `safeEqual` util is in place; wire on payments module |
| 14 | Razorpay webhook idempotency (`razorpayOrderId` unique + status check) | ❌ Open | Wire on payments schema |
| 15 | S3 bucket private + no public GetObject | ❌ Ops | Configure at bucket create time |
| 16 | TLS 1.2+ + HSTS ≥ 1 year via Helmet + reverse proxy | ❌ Ops | Cloudflare / nginx on Hostinger |
| 17 | MongoDB Atlas allow-list only prod VPS IP (no `0.0.0.0/0`) | ❌ Ops | Configure in Atlas |
| 18 | Passwords hashed with bcrypt cost ≥10 | ❌ Open | Wire when auth built |
| 19 | Constant-time password comparison (`bcrypt.compare`) | ❌ Open | Wire when auth built |
| 20 | No user enumeration on login/reset (same error message) | ❌ Open | Wire when auth built |
| 21 | Object-level authz on every "by id" route | ❌ Open | Every service `findOne({_id, userId})`, never just `{_id}` |
| 22 | Mass-assignment protection (whitelist update fields) | ❌ Open | DTOs with class-validator per endpoint |
| 23 | pino structured logging with PII redaction | ✅ Phase 0 | `config/logger.config.ts` — Authorization/cookie/password fields redacted |

## P1 — Before public launch

| # | Item | Status | Notes |
|---|---|---|---|
| 24 | `redactEmail` / `redactPhone` used on every user-referencing log line | ✅ Phase 0 | Utils in place; enforce at code-review time |
| 25 | Auth-failure audit (AUTH_FAILED / OTP_FAILED / OTP_LOCKED) | ❌ Open | Wire when auth built via `auditService.logAuthEvent()` |
| 26 | reCAPTCHA v3 on register / login / OTP-send / forgot-password | ✅ Phase 0 | Service in place; skip outside prod; enforce in auth controller |
| 27 | Uploads: MIME + size validated server-side (presign) | ❌ Open | `presign.dto.ts` MIME_ALLOWLIST + SIZE_LIMITS to be wired when uploads module lands |
| 28 | Client-side upload validation (better UX) | ✅ Phase 0 | FE `uploads.ts` mirrors BE constants |
| 29 | Payment fulfillment in Mongoose transaction | ❌ Open | Wire when payments built |
| 30 | Outbound HTTP: explicit timeouts | ❌ Open | Every axios/fetch call sets `timeout` |
| 31 | Email/SMS per-recipient daily caps | ❌ Open | Cache-based counter |
| 32 | API keys never in FE bundle | ✅ Phase 0 | Only `NEXT_PUBLIC_*` keys in FE — grep before build |
| 33 | Sentry / error tracking | ❌ Ops | Wire in Phase 1 |
| 34 | Uptime monitoring | ❌ Ops | Better Stack or equivalent |
| 35 | Backup + restore drill | ❌ Ops | Atlas snapshot policy + quarterly test restore |
| 36 | Data-export endpoint (GDPR / DPDP §11) | ❌ Open | Phase 1 |
| 37 | Data-deletion endpoint (GDPR Art.17 / DPDP §12) | ❌ Open | Phase 1 |
| 38 | Cookie consent banner (only if non-essential cookies) | ❌ Open | Only if we add analytics |
| 39 | SPF / DKIM / DMARC on sending domain | ❌ Ops | Configure at DNS |

## P2 — Post-launch hardening backlog

- `mongo-sanitize` on `req.body` — DONE (Phase 0 custom impl).
- Strict Helmet CSP with explicit allow-list — Phase 2.
- Account lockout after N failed logins — Phase 2.
- Razorpay webhook IP allow-list — Phase 2.
- Dependabot / `npm audit --production` in CI — Phase 1.
- Antivirus scan on uploaded files (ClamAV / S3 ObjectLambda) — Phase 2.
- Runbook for top 5 incidents — Phase 1.

---

## Pre-launch sign-off

Print + sign before announcing public launch.

```
P0 items 1–23    (23 total, most open at Phase 0)   ☐
P1 items 24–39   (16 total, most open at Phase 0)   ☐
P2 backlog       (tracked, non-blocking)            ☐

Signed: ____________________   Date: ____________
```

---

## References

- **Full generic checklist**: `PRODUCTION_SECURITY_CHECKLIST.md` — 80+ items grouped in 16 sections. This file is a project-specific slice of that.
- **Bug patterns to double-check pre-deploy**: `BUG_PATTERNS.md` — every entry there is a documented security-adjacent gotcha.
- **Rotating a leaked secret**: `SECRETS_ROTATION_RUNBOOK.md`.
- **Sibling project audit** (for pattern reference): `../../../RxJobs4U/ProjectDocuments/PRE_DEPLOY_SECURITY_AUDIT.md` — that project shipped P0/P1 in `c1a9f64` and hardened incrementally through commits `40214ec`, `0b3c390`, `eacdadd`, `e908785`.
