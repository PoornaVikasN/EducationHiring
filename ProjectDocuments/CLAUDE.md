# CLAUDE.md — Contributor Pointer for School Teacher

> **Read this first.** This file tells any human or AI contributor where the rules live.

## What is School Teacher?

A location-based school-hiring portal connecting **Schools** with **Teachers**. Two hiring modes: **Substitute/Urgent** (short-notice fills, school subscription + teacher access subscription) and **Permanent/Contract** (long-term posting fee + shortlist confirmation fee). Application flow: `INTERESTED → SHORTLISTED → PAID → WON | CLOSED` (payment after shortlist, no hard cap). A **Chat** feature scoped to each accepted application (Socket.IO) is planned for Phase 1.

Internal folder / npm package names are `eduhire-*` (historical). **Every user-facing string uses "School Teacher".**

## Tech Stack (one-liner)

**Web:** Next.js 16 (App Router, `proxy.ts` middleware) · React 19 · Tailwind 4 · shadcn-style primitives · TanStack Query · React Hook Form + Zod · Socket.IO client · npm
**API:** NestJS 10 · Mongoose 9 · MongoDB · Passport (JWT + Google OAuth) · Socket.IO · `@nestjs/schedule` cron · `@nestjs/event-emitter` · `web-push` (VAPID) · `nestjs-pino` · npm
**Infra:** Hostinger (planned) · MongoDB Atlas · AWS S3 · Razorpay · Gmail OAuth2 via nodemailer · Google reCAPTCHA v3

## Repo Layout

```
EduHire/                                # folder name is historical
├── ProjectDocuments/                    # ← all foundation docs live here
│   ├── CLAUDE.md                        # you are here
│   ├── PROJECT_BLUEPRINT.md             # domain, architecture, cross-cutting rules
│   ├── FRONTEND_GUIDE.md                # FE standards & Do/Don't
│   ├── BACKEND_GUIDE.md                 # BE standards & Do/Don't
│   ├── BUG_PATTERNS.md                  # 35+ hard-won patterns inherited from RxJobs4U
│   ├── DECISIONS.md                     # canonical decisions log (dated)
│   ├── DATA_MODEL.md                    # collection schemas, enum registry
│   ├── SCREEN_MAP.md                    # screen inventory (TBD as design lands)
│   ├── PROJECT_SPEC.md                  # product spec (TBD)
│   ├── REUSABLE_FILE_GUIDE_FRONTEND.md  # FE reusable components inventory
│   ├── PRODUCTION_SECURITY_CHECKLIST.md # 80-check pre-launch checklist (generic)
│   ├── PRE_DEPLOY_SECURITY_AUDIT.md     # School Teacher's instance of the above
│   ├── SECRETS_ROTATION_RUNBOOK.md      # ordered rotation runbook
│   ├── SESSION_NOTES_2026_07.md         # Phase 0 handoff notes
│   ├── MEDPORTAL_UI_DESIGN_REFERENCE.md # design system reference (shared)
│   ├── FE-OAuth-Setup-Code-Ref.md       # Google OAuth code samples
│   └── FE-Places-GeoLocation-Sample.md  # Places autocomplete sample
├── eduhire-backend/                     # NestJS — independent npm project
└── eduhire-frontend/                    # Next.js 16 — independent npm project
```

The two app folders are **independent npm projects**, not a monorepo. Shared contracts (enums, response types) are **manually mirrored** — backend at `eduhire-backend/src/shared/`, frontend at `eduhire-frontend/lib/shared/`.

## Which Doc to Read When

| Situation | Read |
|---|---|
| New contributor onboarding | This file → `PROJECT_BLUEPRINT.md` → `SESSION_NOTES_2026_07.md` → the relevant guide |
| Touching UI, pages, components, forms, styles | `FRONTEND_GUIDE.md` + `REUSABLE_FILE_GUIDE_FRONTEND.md` |
| Touching API, Mongoose models, auth, payments, workers | `BACKEND_GUIDE.md` |
| Adding a new screen or route | `SCREEN_MAP.md` |
| Designing a new collection or field | `DATA_MODEL.md` |
| Changing domain logic, pricing, business rules | `PROJECT_BLUEPRINT.md` (then relevant guide) |
| Before committing any feature — pre-flight check | `BUG_PATTERNS.md` |
| Making a non-obvious architectural call | Log it in `DECISIONS.md` after |
| Before deploying to prod | `PRE_DEPLOY_SECURITY_AUDIT.md` + `PRODUCTION_SECURITY_CHECKLIST.md` |
| Rotating a leaked credential | `SECRETS_ROTATION_RUNBOOK.md` |
| Porting a UI pattern from prior projects | `MEDPORTAL_UI_DESIGN_REFERENCE.md` |

## Dev Commands

Backend (`eduhire-backend/`):
```bash
npm install
npm run start:dev     # watch on http://localhost:3001/api
npm run build         # tsc → dist/
npm run lint
npm test              # jest
```

Frontend (`eduhire-frontend/`):
```bash
npm install
npm run dev           # http://localhost:3000
npm run build
npm run lint
```

Run in two terminals. No top-level orchestration.

## Hard Rules (non-negotiable)

1. **No `any`.** Use `unknown` + narrow, or define the type. TS `strict` mode.
2. **No secrets in code.** Env vars only. `.env.example` documents every var; real `.env*` gitignored.
3. **Money is stored as integer paise**, never rupees/floats. Display at the UI edge.
4. **Dates are UTC in DB.** IST conversion at the UI edge.
5. **Never trust client-sent prices.** The API re-computes and verifies every amount against **`SystemConfig`** (dynamic — see Decision §2 in `DECISIONS.md`).
6. **All pricing is dynamic.** No hardcoded rupee constants anywhere in code. Every price lives in `SystemConfig{type:'price'}` and is editable via Admin Settings → Pricing. If you need a new charge kind, add it via admin — no deploy.
7. **Shared contracts live in `eduhire-backend/src/shared/`.** Mirror manually into `eduhire-frontend/lib/shared/` with a comment naming the source.
8. **FE always reuses common components.** Import from `common-components/`, `lib/`, `hooks/`. Never use raw shadcn primitives, native `<select>`/`<input>`/`<button>`, or third-party UI when an existing common component covers the need.
9. **Conventional Commits.** `feat(web): …`, `fix(api): …`, `chore: …`, `refactor: …`, `docs: …`.
10. **PRs stay small.** One vertical slice per PR.
11. **No business logic in controllers or React components.** Services (BE) and hooks/stores (FE) own logic.
12. **Every money-flow and auth-flow change needs a test.**
13. **Read `BUG_PATTERNS.md` before committing** if you touched auth, payments, notifications, uploads, or Mongoose schemas. That file is the sum of months of pain in the sibling project.

## Current Status (2026-07-05)

### 🌱 Phase 0 — Bootstrapping (COMPLETE)

**Docs seeded** from RxJobs4U Phase 3f:
- Bug patterns (35+), production security checklist, secrets rotation runbook, frontend + backend guides — all inherited and updated for School Teacher.
- Foundation docs (CLAUDE.md, PROJECT_BLUEPRINT.md, DATA_MODEL.md) rewritten for domain.
- DECISIONS.md enriched with 15+ hardened decisions from the sibling project.

**Security scaffolding shipped**:
- `main.ts` with Helmet (COOP `same-origin-allow-popups`), custom Mongo-operator sanitizer (not `express-mongo-sanitize` — that crashes on Node 20 read-only `req.query`), CORS allow-list, 1 MB body cap, `trust proxy`, pino, `AllExceptionsFilter`.
- `env.validation.ts` — Joi fail-fast with `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`/`CONFIG_ENCRYPTION_KEY` ≥32 chars & mutually distinct.
- `common/utils/` — `safeEqual` (timing-safe HMAC), `redactEmail`/`redactPhone`.
- `common/filters/all-exceptions.filter.ts`, `common/guards/csrf.guard.ts`, `common/decorators/public.decorator.ts`, `common/recaptcha/recaptcha.service.ts` (skips outside prod).
- `SystemConfig` module — dynamic pricing pattern with `displayKind`/`unit`/`maxValue` metadata.
- FE `proxy.ts` with public paths allow-list, `next.config.ts` headers, axios client with in-memory token + refresh-then-retry, `uploads.ts` with client-side MIME + size validation.

### ⏳ Phase 1 — Next

- Fill `PROJECT_SPEC.md` with the actual product spec.
- Auth module (register/login/OTP/forgot-password/Google OAuth id_token + `tokenVersion` revocation + reCAPTCHA gate).
- Domain modules: `schools`, `users` (teacher + school-admin profiles), `postings`, `applications`, `payments`, `subscriptions`, `notifications` (Socket.IO + Web Push).
- **Chat module** (Socket.IO scoped per application room) — the differentiator.
- Screen design + implementation.
- Populate `SystemConfig` pricing seeds via admin UI.

## When in Doubt

- Requirement unclear → `PROJECT_SPEC.md` (fill it if empty)
- Pattern unclear → relevant guide's Do/Don't
- Design unclear → `MEDPORTAL_UI_DESIGN_REFERENCE.md`
- Reusable FE building blocks → `REUSABLE_FILE_GUIDE_FRONTEND.md`
- About to make a non-obvious call → check `DECISIONS.md` first, then log the new decision after

## Contact / Ownership
- Owner: **poornavikas99@gmail.com**
- Sibling project (for reference & pattern lineage): `../RxJobs4U/`
