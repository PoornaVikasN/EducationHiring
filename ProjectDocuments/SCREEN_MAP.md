# SCREEN_MAP.md — School Teacher

> Skeleton screen inventory. Fills as design lands. Every screen listed has a route + a stub description; details TBD.
>
> **Rule**: every new route is added here BEFORE it's built. Every route touches `proxy.ts` (public vs auth-gated) — if unsure, that's your first check.

---

## 1. Public routes (no auth required)

These MUST be in `eduhire-frontend/proxy.ts` `PUBLIC_PATHS`.

| Route | Purpose |
|---|---|
| `/` | Landing page — hero + how-it-works + testimonials + CTA |
| `/pricing` | Public pricing page (reads from SystemConfig at request time) |
| `/about` | About us / mission |
| `/privacy-policy` | Legal — GDPR / DPDP Act compliance |
| `/terms` | Legal — Terms of Service |
| `/help` | FAQ / support page |
| `/early-access` | Optional signup-funnel gate |

## 2. Auth routes (auth-gated on the FE side by redirecting away when a session exists)

| Route | Purpose |
|---|---|
| `/login` | Email + password + reCAPTCHA + Google OAuth + OTP link |
| `/register` | Email + password + role selector + reCAPTCHA |
| `/otp-verify` | Email OTP entry (two-step: send → verify) |
| `/forgot-password` | Request password reset |
| `/reset-password` | Redirect helper → `/forgot-password` |

## 3. Teacher app routes (role: TEACHER)

`/(app)` route group in Next.js — all wrapped in `<AppHeader>` + session guard.

| Route | Purpose |
|---|---|
| `/dashboard` | Home — highlights, recent postings, application status |
| `/postings` | Browse postings (search + filter) |
| `/postings/[id]` | Single posting detail + Apply CTA |
| `/applications` | My applications with state timeline |
| `/applications/[id]/chat` | Chat with school (Phase 1) — only for PAID+ applications |
| `/profile` | Teacher profile edit (resume, subjects, grades, location) |
| `/settings` | Notifications preferences, WhatsApp verify, deactivate |
| `/notifications` | Full notifications list (bell dropdown shows first 10) |
| `/urgent-subscription` | Buy/renew teacher urgent-access subscription |

## 4. School-Admin routes (role: SCHOOL_ADMIN)

`/school` route group.

| Route | Purpose |
|---|---|
| `/school/dashboard` | School dashboard — active postings, applicant stats, verification state |
| `/school/postings` | List postings |
| `/school/postings/new` | Post a new role (permanent OR urgent) |
| `/school/postings/[id]/edit` | Edit posting |
| `/school/applicants` | List applicants across all postings (with per-posting drill-down) |
| `/school/applicants/[applicationId]/chat` | Chat with teacher (Phase 1) |
| `/school/school` | School profile (name, address, docs, photos) |
| `/school/subscription` | Manage school urgent subscription |
| `/school/settings` | School-admin settings |

## 5. Admin routes (role: ADMIN)

`/admin` route group.

| Route | Purpose |
|---|---|
| `/admin` | Admin home — verification queue + KPIs |
| `/admin/users` | User list, search, suspend/activate |
| `/admin/schools` | School verification queue + list |
| `/admin/postings` | All postings — list, disable |
| `/admin/applications` | Application audit view |
| `/admin/payments` | Payment audit |
| `/admin/analytics` | KPIs + charts |
| `/admin/disputes` | Dispute inbox (Phase 2) |
| `/admin/audit` | AuditLog viewer |
| `/admin/config` | Settings + API Keys + Cron Jobs + Email Templates + **Pricing** (all rows editable) |

---

## 6. Special / shared

- `error.tsx`, `global-error.tsx`, `not-found.tsx` at the app root.
- Landing composed of `landing-postings-permanent.tsx`, `landing-postings-urgent.tsx`, `landing-pricing-cards.tsx`, `landing-hero.tsx` etc. — same pattern as RxJobs4U.

## 7. Counts (approximate, TBD as designs land)

| Group | Screens |
|---|---|
| Public | 7 |
| Auth | 5 |
| Teacher | 9 |
| School Admin | 9 |
| Admin | 10 |
| **Total** | **~40** |

## 8. Rules

1. **Every new route added here first**. If it's not in this doc, it doesn't exist.
2. **Every new public route added to `proxy.ts` `PUBLIC_PATHS`** the same commit — otherwise unauthenticated visitors bounce to `/login`.
3. **Every auth-gated route sits inside a route group** (`(app)`, `(auth)`) with a matching layout that renders `AppHeader`.
4. **Every route with role-restricted content** has a role guard on the FE (redirect if wrong role) AND on the BE (403 on the API endpoints it calls). Never trust just the FE.
