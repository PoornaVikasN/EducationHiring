# PROJECT_BLUEPRINT.md — School Teacher

> The domain, architecture, and cross-cutting rules for this project. Read after
> `CLAUDE.md`, before diving into any guide.
>
> Rewritten 2026-07-09 directly from the current codebase and `DECISIONS.md` — the previous
> version predated implementation and described a URGENT/PERMANENT dual-posting-type model,
> `PostingStatus.PENDING_PAYMENT`, `teacherProfile`/`schoolAdminProfile` field names, and a
> two-collection chat model, none of which were ever built (superseded by `DECISIONS.md`
> D42-superseding and D41). Cross-check `DATA_MODEL.md` for field-level detail; this doc is the
> narrative/architecture layer above it.

---

## 1. Domain

**School Teacher** connects **Schools** with **Teachers** for teaching roles. There is **one
posting type only** — no urgent/substitute mode. (An urgent/substitute concept was proposed and
briefly logged as D14, then explicitly reverted — see `DECISIONS.md` D42-superseding: "We don't
have any urgent jobs, only FT jobs simply — no job types needed at all.")

Schools post jobs for free up to a monthly quota, or subscribe for unlimited posts. Teachers apply
for free; a config-gated payment step can optionally sit between shortlist and hire (off by
default). See §5 for the exact toggle-driven mechanics.

## 2. Actors + Roles

`Role` enum (`shared/enums/index.ts`): `TEACHER`, `RECRUITER`, `ADMIN`.

| Role (enum value) | UI label | Description |
|---|---|---|
| `TEACHER` | "Teacher" | Individual teacher applying for jobs. Profile (`User.seekerProfile`): name, degrees, subject expertise, current/highest post held, experience, city/state, resume, availability. |
| `RECRUITER` | "School" (admin-facing badge) / "Recruiter" (internal component naming — both refer to the same role) | User acting for a school. One user manages one school (`User.recruiterProfile.schoolId`). Can post jobs, shortlist applicants, manage subscription. |
| `ADMIN` | "Admin" | Platform admin. Verifies schools, disables abusive users/jobs, edits pricing + settings via SystemConfig, soft-deletes/restores users, edits legal pages and email templates, views audit log. |

## 3. Entities

Full field-level detail lives in `DATA_MODEL.md` §3 — this is the narrative summary.

- **User** — auth + role; holds either a `seekerProfile` (TEACHER) or `recruiterProfile`
  (RECRUITER) sub-doc, never both, never neither for those two roles.
- **School** — the hiring entity, owned by one `RECRUITER` user (`adminUserId`). Verification-gated:
  registration number + address → admin verification → `verificationStatus: PENDING/VERIFIED/REJECTED`.
- **Job** (collection `jobs`) — a teaching role posting. `department: JobDepartment`,
  `role: TeacherPost`, `specializations: Subject[]`, city/state + geo location, salary range
  (plain monthly rupees, **not** paise — see `DATA_MODEL.md` §4), `status: ACTIVE/FILLED/EXPIRED/
  AUTO_DISABLED/DISABLED_BY_ADMIN`. No `PENDING_PAYMENT` status — see §5, job activation doesn't
  gate on a per-post payment anymore.
- **Application** — a teacher applies to a job. 5-state machine, see §4.
- **Chat** — **live, not planned.** Socket.IO namespace `/chat` (`modules/chat/`), one flat
  `chat_messages` collection keyed by `applicationId` (no separate "room" collection — see
  `DATA_MODEL.md` §3.7). Unlocks at `SHORTLISTED` by default, or `PAID` if `TEACHER_PAID_ENABLED`
  is on (config-aware, fixed in `DECISIONS.md` D44 after being found hardcoded to PAID/WON-only).
  File-upload attachments are the one still-unbuilt piece (D39).
- **Payment** — Razorpay orders + webhooks. Idempotent by `razorpayOrderId` (unique index).
  `PaymentKind`: `APPLICATION` (teacher shortlist-confirmation fee, gated behind
  `TEACHER_PAID_ENABLED`), `SUBSCRIPTION` (school monthly unlimited-posting), `BOOST` (re-activate
  an expired job).
- **Subscription** — **school-level only** (`Subscription.schoolId`, not per-user) — a school's
  monthly unlimited-posting subscription. There is no separate teacher-side subscription entity;
  `TEACHER_PAID_ENABLED` gates a one-off per-application fee (`PaymentKind.APPLICATION`), not a
  subscription. Auto-renewal mechanism (Razorpay Subscriptions API vs manual re-purchase) is still
  an open decision (`DECISIONS.md` §14).
- **SystemConfig** — dynamic pricing + settings + admin-managed API keys (encrypted at rest).
  `type: 'price' | 'setting' | 'api_key'`, `displayKind`/`unit`/`maxValue` metadata drive the
  admin Settings UI. No pricing auto-seed — admin configures at go-live (`DATA_MODEL.md` §5).
- **AuditLog** — admin actions + anonymous auth events. Nullable `adminId` (supports anonymous
  events) + `ip`/`userAgent`/`reason`.
- **Notification** — in-app + email + web-push fan-out targets, `NotificationKind` enum (16
  values — see `DATA_MODEL.md` §2).
- **LegalPage** / **EmailTemplate** — admin-editable content, added in the Phase 1 admin-parity
  push (`DECISIONS.md` D45), fulfilling what was originally logged as a "carried forward, not yet
  built" item. Both are live now.
- **Dispute** — a reporting/dispute-ticket entity (`modules/disputes/`) not covered by earlier
  planning docs at all; exists and is wired, own local `DisputeStatus`/`DisputeKind` enums (not in
  the shared registry).

## 4. Application State Machine

```
INTERESTED ──school shortlists──▶ SHORTLISTED ──(if TEACHER_PAID_ENABLED)──▶ PAID ──school confirms──▶ WON
     │                                  │                                      │
     │                                  ├──school declines / 48h pay window expires──▶ CLOSED
     │                                  │
     │                                  └──(if TEACHER_PAID_ENABLED is OFF, default)──▶ WON directly
     │
     └──school declines──▶ CLOSED
```

This is **config-toggle-driven**, not a fixed machine — the `PAID` state only occurs when the
`TEACHER_PAID_ENABLED` `SystemConfig` setting is on (off by default):

- **Default (`TEACHER_PAID_ENABLED` off)**: `INTERESTED → SHORTLISTED → WON | CLOSED`. No payment
  step. Chat unlocks at `SHORTLISTED`.
- **When `TEACHER_PAID_ENABLED` is on**: `INTERESTED → SHORTLISTED → PAID → WON | CLOSED`. A
  48-hour payment window opens at `SHORTLISTED`; the teacher pays `APPLICATION_FEE_PAISE` to
  unlock contact details both ways and move toward `WON`. Chat unlocks at `PAID`.

**INTERESTED**: teacher applied (free). No contact reveal. **SHORTLISTED**: school shortlisted,
teacher notified. **PAID**: (config-gated only) teacher paid; contact unlocked both ways.
**WON**: school confirmed hire — terminal-positive. **CLOSED**: declined, or pay window expired
(when gated), or job closed — terminal-negative; contact never revealed if payment step was never
completed.

## 5. Pricing — 100% Dynamic, Two Independent Toggles

**No hardcoded rupee constants in code that actually execute.** `lib/shared/constants.ts` /
`shared/constants/pricing.ts` hold **fallback display values only** (used before the real
`SystemConfig` value loads, or if a key is missing) — the server always recomputes and verifies
against `SystemConfig` at request time, never trusts a client-sent amount.

Two independent boolean settings control the whole pricing/gating model
(`system-config.service.ts` seed, `DECISIONS.md` D43):

- **`SCHOOL_PAID_ENABLED`** (default **on**) — when on, a school without an active subscription is
  capped at `FREE_TIER_JOB_LIMIT` (default 2) active posts per calendar month; posting beyond that
  requires an active `Subscription`. When off, all posts go live immediately regardless.
- **`TEACHER_PAID_ENABLED`** (default **off**) — when on, a shortlisted teacher must pay
  `APPLICATION_FEE_PAISE` within the pay window to reach `WON` (see §4). When off, no payment step
  exists on the teacher side at all.

Known `SystemConfig` price/setting keys actually read at runtime (`getPricePaise`/
`getSettingBoolean`/`getSettingNumber` call sites): `RECRUITER_MONTHLY_PAISE` (school subscription
price, fallback ₹500), `APPLICATION_FEE_PAISE` (teacher shortlist-confirmation fee, fallback ₹99),
`SCHOOL_PAID_ENABLED`, `FREE_TIER_JOB_LIMIT` (fallback 2), `TEACHER_PAID_ENABLED`,
`JOB_ALERT_RADIUS_KM` (fallback 30, used by the job-alert notification fan-out, unrelated to
payments). No pricing rows are auto-seeded — see `DATA_MODEL.md` §5.

## 6. Auth & Session

Ground-truth checked against `modules/auth/auth.controller.ts`/`auth.service.ts` 2026-07-09:

- **Registration**: email + phone (+91, Indian mobile format) + password + role
  (`TEACHER`|`RECRUITER`) + full name → email OTP verification required before full access.
- **Login**: email + password, OR email OTP, OR Google OAuth (`id_token` verified server-side).
- **Access token**: JWT, **15 min TTL** (`signOptions: { expiresIn: '15m' }`), in-memory only on
  the frontend (never localStorage).
- **Refresh token**: JWT, 7-day TTL, httpOnly cookie, `SameSite=Lax`, `Secure` in prod,
  `COOKIE_DOMAIN` env-driven (blank in dev so it defaults to request host).
- **`tokenVersion`** (`tv` claim) — bumped on password change/reset and admin delete/restore,
  invalidates outstanding access tokens immediately (`DATA_MODEL.md` §1.2).
- **reCAPTCHA v3**: `common/recaptcha/recaptcha.service.ts` exists but **is not currently wired
  into any controller or guard** — grepped 2026-07-09, zero call sites outside its own file. An
  earlier version of this doc claimed it gates register/login/OTP-send/forgot-password; that was
  aspirational, not actual, matching the exact "shipped in the doc, dead in the code" pattern
  D46's audit found for several other items. Treat as **not enforced** until re-wired and
  verified live.
- **Throttles** (confirmed via `@Throttle` decorators): login 5/min, OTP-send 3/min, OTP-verify
  10/min, refresh 10/min, logout 10/min. `register` has **no** `@Throttle` decorator — also worth
  a deliberate look before calling auth "fully hardened."
- **CSRF**: `CsrfGuard` (`X-Requested-With` header check) applied to `/auth/refresh` and
  `/auth/logout` (`DECISIONS.md` D46).

## 7. Payments — Razorpay

- Order created server-side with amount computed from `SystemConfig` (§5) — never trusts a
  client-sent amount.
- Webhook signature verified with `safeEqual()` (timing-safe HMAC) — fixed from a timing-unsafe
  `!==` comparison in `DECISIONS.md` D46.
- Idempotency: `Payment.razorpayOrderId` has `unique: true`; handler short-circuits on
  already-`PAID` payments.

## 8. File Uploads — S3 via Presign

- Client asks BE for a presigned PUT (`kind` + `contentType` + `size`) via `POST /uploads/presign`.
  BE validates MIME + size against `MIME_ALLOWLIST`/`SIZE_LIMITS` for the given `UploadKind`.
- Client PUTs directly to S3.
- **On the next persist call** (profile update / school update), BE HEAD-verifies the claimed key
  via `UploadsService.verifyUploadKey(url, kind)` before writing the URL to the DB — added in
  `DECISIONS.md` D46/D18, closes a trust-the-client gap. Verified live this session (rejects a
  never-uploaded URL with a 404).
- Currently using the RxJobs4U S3 bucket temporarily (owner's explicit call, pending provisioning
  a dedicated School Teacher bucket — not urgent).

## 9. Notifications

- **In-app** — `Notification` doc persisted; delivery mechanism beyond persistence not
  independently re-verified this rewrite — check `notifications.service.ts`/gateway before
  relying on real-time push claims.
- **Email** — Gmail OAuth2 via nodemailer, with a DB-template-first / hardcoded-fallback pattern
  (`EmailTemplatesModule`, `DECISIONS.md` D45) — 14 seeded templates, admin-editable.
- **Web Push** — `web-push` (VAPID), `User.pushSubscription` stores the subscription as a JSON
  string.
- Each event needs an `@OnEvent()` handler in `NotificationsService`. **`NotificationKind` value +
  `eventEmitter.emit()` + `@OnEvent()` handler are always a trio** (BUG_PATTERNS BE-9).

## 10. Chat — Live

- Socket.IO namespace, gateway at `modules/chat/chat.gateway.ts`.
- Flat `chat_messages` collection, no separate room collection — a "room" is just messages sharing
  an `applicationId` (`DATA_MODEL.md` §3.7). Fields: `applicationId`, `senderId`, `senderRole`
  (`'TEACHER'|'RECRUITER'` plain string), `text` (not `body`, max 2000 chars), `read` (not
  `readByRecipient`).
- Unlocks per §4's toggle-aware rule (`SHORTLISTED` default / `PAID` when `TEACHER_PAID_ENABLED`)
  — both parties join, anyone else rejected server-side on join (`DECISIONS.md` D38/D44).
- File-upload attachments not implemented (D39, deferred to Phase 4). Message length (2000 chars)
  is an accidental split between two earlier-discussed figures (500/4000) — still open (D40).

## 11. Data Locality

- **MongoDB Atlas** (single region). All timestamps UTC.
- **AWS S3** — currently the RxJobs4U bucket (temporary, see §8).
- **Gmail OAuth2** for outbound email.
- **Razorpay India** — INR only.

## 12. Environments

- **Local dev**: `localhost:3000` (FE) + `localhost:3001/api` (BE). `NODE_ENV=development`.
- **Production**: not yet deployed — Hostinger is the planned target per `CLAUDE.md`, domain TBD.
- **Env validation** at BE boot via Joi, actually wired into `ConfigModule.forRoot()` as of
  `DECISIONS.md` D46 (was dead code — defined but never passed to `ConfigModule` — before that;
  re-verify it's still wired before trusting this line, per that decision's own caveat).

## 13. Observability

- **Structured logs** via `nestjs-pino`.
- **PII redaction** — `redactEmail()`/`redactPhone()` (`common/utils/redact.ts`) wired into every
  raw email/phone log interpolation in `auth.service.ts`/`whatsapp.service.ts` (`DECISIONS.md` D46).
- **Auth audit** for anonymous events via `AuditLog` with nullable `adminId` (D46).

## 14. Cross-Cutting Rules

1. **All timestamps UTC in the DB.** Format at the UI edge for IST.
2. **Money fields are not uniformly paise** — `Payment.amountPaise` and the `SystemConfig` price
   values are integer paise; `Job.salaryMin`/`salaryMax` are plain monthly rupees. Check the field
   name/comment before assuming (`DATA_MODEL.md` §4).
3. **All prices/settings come from `SystemConfig` at request time.** No hardcoded values drive
   actual gating logic — display-only fallback constants exist for pre-load UI, never for
   computation.
4. **Every schema with an array-nested doc uses a `@Schema({_id:false})` sub-class** — except
   `User.seekerProfile.location` and `EmailTemplate.channels`, which are bare `Object`/inline
   props, not real sub-schema classes (`DATA_MODEL.md` §1.1/§3.10 — a real exception, not a rule
   violation to fix blindly).
5. **Every geo field that IS a real sub-schema** uses the shared `LocationSchema` class with
   `default: null` on the parent prop (`School.location`, `Job.location` — not
   `User.seekerProfile.location`, see above).
6. **Every non-obvious architectural call gets a dated entry in `DECISIONS.md`.** This has been
   followed consistently — `DECISIONS.md` is the single most reliable source of truth in this
   repo for "what actually happened and why," more reliable than any narrative doc including this
   one. When in doubt, read its tail.

## 15. Reference Table — Concept Renames from RxJobs4U

| RxJobs4U | School Teacher |
|---|---|
| Hospital | School |
| JobSeeker / Seeker | Teacher (`Role.TEACHER`) |
| Recruiter / Hospital Admin | Recruiter (`Role.RECRUITER`, UI badge "School") |
| Job | Job (collection `jobs` — stayed "Job", was never renamed to "Posting" despite early planning docs assuming otherwise) |
| SOS (24-hour urgent) / substitute mode | **Removed entirely** — proposed once (D14), reverted (D42-superseding) |
| `HospitalDepartment` | `Subject` (teaching subject) + `JobDepartment` (grade-level/section — a genuinely new, separate concept, not a rename) |
| Qualification taxonomy | `TeacherPost` (post/designation, e.g. SGT/TGT/PGT/Principal) |
| Chat | **Chat (new — not in RxJobs4U, built from scratch)** |

## 16. Open Questions (tracked live in `DECISIONS.md` §14 — this table is a pointer, not a duplicate)

See `DECISIONS.md` §14 "Explicit Non-decisions" for the current, authoritative list (subscription
auto-renewal mechanism, chat char-limit final call, chat file upload, verified badges, ratings,
referral programme, actual pricing values, `indemnityInsurance` disposition). Don't duplicate that
list here — it will drift the same way this whole file just did; update `DECISIONS.md` directly
when one of these resolves.
