# Session Notes — Phase 0 (2026-07-05)

> **New chat / new contributor?** Read `CLAUDE.md` + this file. Together they capture
> everything the project inherited from RxJobs4U + what's committed as of Phase 0.

---

## TL;DR — what shipped in this bootstrap session

Two categories: **17 docs** in `ProjectDocuments/` and a **security scaffold**
across `eduhire-backend/` and `eduhire-frontend/`. Zero business logic.

### Docs seeded (17)

| File | Origin | Adaptation |
|---|---|---|
| `CLAUDE.md` | rewritten | Domain rebrand + Phase 0 status |
| `PROJECT_BLUEPRINT.md` | rewritten | School / Teacher / SchoolAdmin domain + dynamic pricing rules |
| `DATA_MODEL.md` | rewritten | Full schema set: `users` (teacher/school-admin), `schools`, `postings`, `applications`, `chat_rooms/messages`, `payments`, `subscriptions`, `system_config`, `audit_logs`, `notifications`, `otps`, `refresh_token_blacklist` |
| `FRONTEND_GUIDE.md` | sed-swap | Path + domain renames; patterns verbatim |
| `BACKEND_GUIDE.md` | sed-swap | Same |
| `BUG_PATTERNS.md` | verbatim + preface | Lineage note added; 35+ patterns unchanged |
| `DECISIONS.md` | ENRICHED in place | Kept existing content; 15+ new hardened decisions appended |
| `SCREEN_MAP.md` | rewritten | Skeleton (~40 screens, TBD by design) |
| `PROJECT_SPEC.md` | STUB | Header-only — fill as client confirms |
| `PRE_DEPLOY_SECURITY_AUDIT.md` | rewritten | Phase 0 status (Ops items + module-specific items open; scaffold items ✅) |
| `PRODUCTION_SECURITY_CHECKLIST.md` | verbatim | Generic — no edits |
| `SECRETS_ROTATION_RUNBOOK.md` | sed-swap | Domain rename |
| `REUSABLE_FILE_GUIDE_FRONTEND.md` | sed-swap | Path renames |
| `MEDPORTAL_UI_DESIGN_REFERENCE.md` | verbatim | Shared design reference |
| `FE-OAuth-Setup-Code-Ref.md` | verbatim | Reference |
| `FE-Places-GeoLocation-Sample.md` | verbatim | Reference |
| `README.md` | rewritten | Folder pointer |

### Code security scaffolding shipped

**Backend** (`eduhire-backend/`):
- `src/main.ts` — full rewrite. Helmet (COOP `same-origin-allow-popups`), cookie-parser, `json({limit:'1mb'})` + `urlencoded`, **custom** `sanitizeMongoOperators` middleware (does NOT use `express-mongo-sanitize` — see DECISIONS.md D-5), CORS allow-list from env (hard-fail in prod), ValidationPipe (whitelist + forbidNonWhitelisted), `AllExceptionsFilter`, `trust proxy`, pino via `nestjs-pino`.
- `src/config/env.validation.ts` — Joi schema. JWT + `CONFIG_ENCRYPTION_KEY` ≥32 chars & mutually distinct. `CORS_ORIGINS` required in prod. `PUBLIC_FRONTEND_URL` env-driven.
- `src/config/logger.config.ts` — pino with PII redaction (Authorization / cookie / password fields).
- `src/common/utils/crypto.util.ts` — `safeEqual` via `timingSafeEqual`.
- `src/common/utils/redact.ts` — `redactEmail`, `redactPhone`.
- `src/common/filters/all-exceptions.filter.ts` — uniform error envelope.
- `src/common/guards/csrf.guard.ts` — `X-Requested-With` guard.
- `src/common/decorators/public.decorator.ts`.
- `src/common/recaptcha/recaptcha.service.ts` — skips outside prod.
- `src/modules/system-config/` — SystemConfig schema + service with dynamic pricing (`getPricePaise`), settings metadata (`displayKind`/`unit`/`maxValue`), encrypted api-key storage.
- `.env.example` — every env var documented.

**Frontend** (`eduhire-frontend/`):
- `proxy.ts` — public paths allow-list (`['/', '/pricing', '/about', '/privacy-policy', '/terms', '/help', '/early-access']`), auth routes list, refresh-cookie session detection.
- `next.config.ts` — security headers (X-Content-Type-Options, X-Frame-Options DENY, Referrer-Policy), `productionBrowserSourceMaps: false`.
- `lib/api-client.ts` — axios `withCredentials`, in-memory access token, refresh-then-retry interceptor on 401.
- `lib/api/uploads.ts` — client-side MIME + size validation before presign; surfaces BE error messages.
- `common-components/recaptcha-provider.tsx`.
- `common-components/providers.tsx` — QueryClient + GoogleOAuthProvider + AuthProvider + Toaster.
- `.env.example` — every `NEXT_PUBLIC_*` var documented.

---

## Environment vars introduced (BE)

Every one is Joi-validated at boot; BE fails fast on misconfiguration.

| Var | Required | Purpose |
|---|---|---|
| `NODE_ENV` | ✓ | `development` \| `production` \| `test` |
| `SERVER_PORT` | default 3001 | |
| `CORS_ORIGINS` | prod only | Comma-separated FE origins |
| `JWT_ACCESS_SECRET` | ✓ ≥32 chars | Access token signing |
| `JWT_REFRESH_SECRET` | ✓ ≥32 chars, ≠ access | Refresh token signing |
| `CONFIG_ENCRYPTION_KEY` | ✓ ≥32 chars, ≠ JWT secrets | SystemConfig api-key encryption |
| `JWT_ACCESS_EXPIRES_IN` | default 15m | |
| `JWT_REFRESH_EXPIRES_IN` | default 7d | |
| `COOKIE_DOMAIN` | prod only | Blank locally; `.schoolteacher.com` in prod |
| `COOKIE_SAMESITE` | default `lax` | |
| `PUBLIC_FRONTEND_URL` | default `https://schoolteacher.com` | Outbound alert links |
| `MONGO_DB_*` (USERNAME, PASSWORD, HOST, NAME) | ✓ | Atlas connection |
| `AWS_*` (REGION, ACCESS_KEY_ID, SECRET_ACCESS_KEY, BUCKET_NAME, BASE_URL) | ✓ | S3 |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` / `RAZORPAY_WEBHOOK_SECRET` | ✓ | Payments |
| `GMAIL_USER` / `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN` | ✓ | Outbound email |
| `GOOGLE_API` / `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | ✓ | Google OAuth |
| `GOOGLE_MAPS_API_KEY` | ✓ | Places autocomplete |
| `RECAPTCHA_SECRET_KEY` | ✓ | reCAPTCHA v3 verification |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` | ✓ | Web Push |

FE (`NEXT_PUBLIC_*` — inlined at build time):
- `NEXT_PUBLIC_API_URL` (default `http://localhost:3001/api`)
- `NEXT_PUBLIC_API_BASE_URL` (Socket.IO handshake base)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

---

## Open follow-ups — Phase 1

Ordered by dependency. Each item lands in `DECISIONS.md` when the non-obvious call gets made.

1. **Fill `PROJECT_SPEC.md`** with the client's actual spec.
2. **Auth module** — the biggest. Register / login / OTP / forgot-password / reset-password / Google OAuth (`verifyIdToken`) / refresh / logout. `tokenVersion` bumps on password change + reset. reCAPTCHA gate on all four public flows. Per-endpoint throttles. Anonymous auth audit.
3. **Users module** — teacher profile + school-admin profile + `verifyUploadKey` wiring on resume / photo / cert URLs.
4. **Schools module** — CRUD + verification queue + `verifyUploadKey` wiring on logo / photos / documents.
5. **Postings module** — CRUD + type-discriminated DTO (URGENT vs PERMANENT) + status machine.
6. **Applications module** — 5-state flow + payment window + cascade close on posting disable.
7. **Payments module** — order create + webhook signature verify (`safeEqual` + idempotency short-circuit) + Mongoose-transaction fulfillment.
8. **Subscriptions module** — school + teacher urgent-access. Auto-renewal decision TBD.
9. **Notifications module** — Socket.IO `/notifications` gateway + email via Gmail OAuth2 + Web Push VAPID + per-kind `@OnEvent` handlers.
10. **Chat module (differentiator)** — Socket.IO `/chat` namespace, one room per PAID+ application, `chat_rooms` + `chat_messages` persistence.
11. **Admin module** — verification, user suspend, posting disable, `SystemConfig` admin CRUD (Pricing + Settings + API Keys + Cron + Email Templates tabs).
12. **Uploads module** — presign + `verifyUploadKey` helpers.
13. **SystemConfig seed rows** — settings + empty api-key placeholders. Prices left empty (admin fills at go-live).
14. **FE pages** — 40+ per SCREEN_MAP; each within its route group; `AppHeader` role-based nav.
15. **Ops** — Sentry, uptime monitor, backup drill, SPF/DKIM/DMARC, Atlas IP allow-list.

## Known trip-wires from BUG_PATTERNS you WILL hit if you skip the guide

- **BE-14** Mongoose 9 geo sub-schema (LocationSchema pattern — do NOT inline).
- **BE-5** `{new:true}` → `{returnDocument:'after'}`.
- **BE-9** NotificationKind enum + `emit` + `@OnEvent` handler are a trio.
- **BE-10** `@InjectModel(X.name)` in service ↔ `MongooseModule.forFeature` in module.
- **BE-4** Never mix `@Prop({index:true})` and `Schema.index()` on the same field.
- **BE-15** `COOKIE_DOMAIN` blank locally, set in prod.
- **FE-16** Discriminated forms = two `useForm` instances, not one.
- **FE-1** `useEffect` side-effect calls need a `useRef` guard.
- **express-mongo-sanitize crashes on Node 20 read-only `req.query`** — we use a custom body-only sanitizer. Don't reintroduce the lib.
- **Turbopack lazy compile 404** — when routes 404 transiently after edits, hard-refresh or `rm -rf .next && npm run dev`.

---

## Quick-start for the next chat

```bash
cd EduHire/eduhire-backend  && npm install && npm run start:dev   # :3001
cd EduHire/eduhire-frontend && npm install && npm run dev          # :3000

# Both apps read .env / .env.local — populate from .env.example first.
# CONFIG_ENCRYPTION_KEY, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET all need
# openssl rand -hex 32 (≥32 chars, mutually distinct).

# Health check the boot:
npx tsc --noEmit  # in backend — should be clean
```

## Sibling project

`../../RxJobs4U/` — pattern lineage. When in doubt on how a pattern was actually
implemented, look there. Phase 3f is the reference implementation. HEAD `e5d3f77`.
