# New Chat Start-Off — read this first if picking up a fresh session

**Last updated:** 2026-07-14 (later same day). **New feature shipped: Bulk User Import**
(Admin → Users → Bulk Import) — one unified `.xlsx` template, partial-success import, SCHOOL
rows create the School Profile inline, no temp passwords (secure Set-Password activation links
instead, a new pattern — `ActivationToken` + `POST /auth/activation/set-password` +
`app/(auth)/activate/[token]/page.tsx`), downloadable error reports, import history + resend.
Live-verified end-to-end against the real Atlas DB with throwaway test data (cleaned up after) —
found and fixed one real bug along the way (`importBatchId` never persisted, silently breaking
the resend-emails feature). Full detail in `DECISIONS.md` §16 (D66-D67).

**Last updated (previous entry):** 2026-07-14. **Phases 1-3 done, independently audited (D53), E2E-tested (D56),
and the platform's 4 third-party integrations (Google Maps, Google OAuth, Gmail SMTP email,
Google reCAPTCHA v3) are all confirmed live and working (D54, D59-D60).** Backend/frontend both
typecheck clean. Docs (`DATA_MODEL.md`, `PROJECT_BLUEPRINT.md`) fully rewritten from ground truth
(D52). **Chat and real-time notifications, the admin panel's data segregation, role-based
navigation guards, and mobile responsiveness (landing + auth + legal pages) have all been fixed
and/or hardened since — see "Since the last update" below for the full list (D59-D65).**

**The E2E pass found and fixed the most severe bug of the whole project (D55):** under the
default configuration (`TEACHER_PAID_ENABLED` off — the documented default), a recruiter could
never mark ANY applicant as WON, and every shortlisted application would have silently
auto-closed itself within 48 hours regardless of settings. Fixed — `INTERESTED → SHORTLISTED →
WON` now works end-to-end under default config, live-verified. A second bug (D55a): the
admin-editable "Job Alert Radius" setting was seeded under the wrong key name and was completely
inert. Both fixed. Since then: admin job delete added (D57), job listing duration made
admin-configurable instead of hardcoded 30 days (D58, also caught a silent settings-update bug
along the way), and email delivery migrated from a half-done Brevo setup to real Gmail
SMTP/OAuth2 via nodemailer matching RxJobs4U exactly (D59) — verified live by actually receiving
an email, not just a clean compile.

**What's confirmed working, all via live testing** (curl for backend logic, real email receipt for
Gmail, and — as of this update — actual browser testing by the user): full Teacher/Recruiter/Admin
journeys (see D56), job posting + free-tier limits + admin job delete + configurable listing
duration, chat both directions at the correct unlock state (browser-confirmed, D59-D60), real-time
notifications (browser-confirmed, same fix as chat, D60), Google Maps/OAuth/reCAPTCHA, and Gmail
SMTP email delivery.

## Since the last update (2026-07-14) — D59 through D65

The user started doing their own manual browser QA (the first real UI/visual testing this whole
project had — see D56/D60's checklist), which immediately surfaced real bugs no amount of curl
testing could have caught. In rough chronological order:

- **D59/D60 — Chat + notifications were completely broken in the browser** despite testing clean
  via a raw Node `socket.io-client` script. Two stacked bugs: (1) `users.service.ts`'s `getMe()`
  returned a raw Mongoose document instead of the shared `SafeUser` shape, so `user.id` was
  `undefined` after any page reload — this alone broke Teacher-side chat message alignment. (2) The
  real root cause once (1) was fixed and the bug persisted: `NEXT_PUBLIC_API_BASE_URL` was being
  read with two contradictory expected shapes across the codebase (bare origin for Socket.IO vs.
  `/api`-suffixed for REST calls) — whichever value you set, the other set of consumers broke.
  Fixed with a new `SOCKET_ORIGIN` derived from the single `NEXT_PUBLIC_API_URL` REST client uses.
  **User confirmed both chat and the notification bell working live after this fix.**
- **D61 — Admin panel retrofitted with tabs-based data segregation**, matching RxJobs4U's pattern.
  Only 3 of 9 admin pages actually needed it (schools: verification-status pill tabs; config: full
  shadcn `Tabs` wrapping 4 sections; users: role pill tabs) — the others either already matched or
  RxJobs4U's tabs there exist only for its SOS/Full-time job-type split, which EduHire doesn't have.
- **D62 — Role-based navigation guards fixed to match RxJobs4U's already-shipped (but never
  actually ported) pattern.** All 3 role layouts (`admin`, `recruiter`, `(app)`/teacher) were
  missing a render-path guard, so a role mismatch could render that layout's real content before
  the redirect fired — this is what caused the reported "logged in as Admin, came back an hour
  later, saw the School dashboard" symptom (compounded by the refresh-token cookie being shared
  across same-origin tabs). Also fixed the logout handler (`app-header.tsx`) to
  `queryClient.clear()` + `window.location.replace('/login')` instead of a bare `router.push`,
  fixing stale cross-role cache and Back-button-into-the-app-after-logout.
- **D63/D64 — Mobile responsiveness pass** on the landing page, all 4 auth pages, and both legal
  pages: fixed a real overlap bug (a badge absolutely-positioned over body text that could wrap
  further on mobile), an OTP-input overflow risk, oversized fixed paddings/font sizes applied
  identically at every breakpoint (including a couple of `clamp()` calls whose `vw` term was too
  small to ever kick in below ~800px, silently pinning "responsive" text at desktop size on every
  phone), and shrunk the auth card further on mobile per explicit user feedback. Also added a
  **cookie-consent notice** (`common-components/cookie-consent.tsx`) — none existed despite the
  site loading Google Maps/reCAPTCHA/OAuth unconditionally — and a matching "Cookies" section that
  was missing from the Privacy Policy content entirely.
- **D65 — reCAPTCHA badge was rendering app-wide** (landing, dashboards, admin — everywhere) even
  though it's only used on the 4 auth pages, because `RecaptchaProvider` wrapped the root
  `Providers` instead of just the `(auth)` layout. Fixed the scoping, and — since the badge's
  extremely high z-index would otherwise sit on top of the new cookie banner — hid the badge
  entirely in favor of Google's sanctioned alternative: a small required disclaimer text under each
  of the 4 actual `executeRecaptcha()`-triggering submit buttons.
- **Hero image mobile crop fixed** — the landscape hero photo was forced into a full `100svh`
  portrait box with `object-fit:cover` on mobile, which (correctly, mathematically) crops away most
  of the frame's width to fill the height. Shortened the hero's minimum height on mobile
  (`min-h-[78svh]` → steps up to `100svh` at `md:`) so the forced scale factor is smaller and
  visibly more of the photo shows — a real "zoom out," not just a repositioned crop.

All of the above are logged in full in `DECISIONS.md`'s tail (D59-D65) — this section is a
summary, that file is the ground truth if any detail here is unclear.

**No visual/browser tool was available in the session that did D63-D65's responsiveness work** —
that pass was a careful code-level box-model audit (padding/gap/width math traced by hand against
320-375px viewports), not a live-rendered screenshot check. `tsc --noEmit` is clean, but treat the
mobile-responsiveness claims as **not yet independently browser-verified** until the user (or a
session with real screenshot/Playwright tooling) confirms.

**Open items, not yet acted on:**
- `NEXT_PUBLIC_GOOGLE_CLIENT_SECRET` is set in the frontend `.env.local` but a Google OAuth client
  secret should never carry a `NEXT_PUBLIC_` prefix (bundles it into public JS). Unused in any
  frontend code (verified via grep, as of the session that found it) so nothing is actually exposed
  yet — remove it before anyone references it by accident. Not re-verified this update.
- **The backend `.env`'s `GMAIL_USER`/`GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN`
  are currently RxJobs4U's own credentials**, temporarily borrowed (client-authorized) purely to
  verify the Gmail SMTP migration actually sends real mail. **These must be swapped for EduHire's
  own dedicated Gmail account before production** — sending School Teacher's transactional email
  through RxJobs4U's Google account is not an acceptable permanent state (wrong sender identity,
  shared rate limits, mixes two products' mail reputation). User has since confirmed Gmail SMTP
  works end-to-end (received a real email) — this cleanup is now unblocked, just not yet done.
- Full Razorpay checkout completion, resume/video S3 upload completion, WhatsApp OTP verification,
  and the admin dispute-ticket flow are all still untested beyond what Phase 1's presign-flow
  verification and order-creation checks already covered — none of this session's browser-testing
  push happened to touch them.
- Chat file-upload attachments (Phase 4, D39) are still not built; the message-length limit (D40)
  is still an undecided number (currently implemented as 2000 chars).
- The D63-D65 mobile-responsiveness/cookie-consent/reCAPTCHA-scoping work has **not yet been
  ported to RxJobs4U**, even though RxJobs4U may have the identical bugs (it wasn't checked this
  session) — the user asked for and received a standalone reusable prompt for this, to run in a
  separate RxJobs4U session themselves.

This file exists because the working chat session that did Phases 1-3 of the EduHire
production-hardening push got long enough to risk running out of context. If you're a fresh
Claude Code session picking this up, read this file, then `DECISIONS.md` (the canonical decision
log — this file is just a pointer/summary, DECISIONS.md is ground truth), then the current plan
file if one still exists at `C:\Users\VIKKI\.claude\plans\lets-work-on-lading-soft-iverson.md`.

## What EduHire is

Rebrand-copy of a healthcare job marketplace (RxJobs4U, at
`C:\Users\VIKKI\OneDrive\Desktop\RxJobs4U` — **read-only reference, never edit it**, user has
given standing permission to read it freely) turned into an education/school-teacher hiring
marketplace ("School Teacher" is the public brand name; folders/packages still say `eduhire-*`
internally). Next.js 16 frontend (`EduHire-Frontend`) + NestJS 10 backend (`EduHire-Backend`),
MongoDB Atlas, Tailwind 4, React Hook Form + Zod, TanStack Query. Full stack conventions and
architecture are documented in `ProjectDocuments/` — `CLAUDE.md` is the top-level pointer to all
the other docs (`PROJECT_BLUEPRINT.md`, `FRONTEND_GUIDE.md`, `BACKEND_GUIDE.md`,
`BUG_PATTERNS.md`, `DATA_MODEL.md`, etc).

## Where we are: mid multi-phase production push

The user said **"demo is over, now we are building and making it live, production baby"** —
that's when this multi-phase cleanup started. Each phase follows the same rhythm: plan-mode
research → design → `ExitPlanMode` approval → execute with `TodoWrite` tracking → **live-verify
via real curl calls / actual UI walkthroughs, not just `tsc --noEmit`**. This live-verification
discipline was forced by the user explicitly pushing back twice on "are we sure this isn't
hallucinated" — treat "it compiles" and "it's ported from a working reference" as **not**
sufficient evidence of correctness. Every phase so far has found at least one real bug that only
a live API call surfaced.

### Phase 1 (COMPLETE) — backend domain rename + admin parity + security hardening
Full `Hospital→School`/`JobSeeker→Teacher` rename, admin soft-delete/restore + Legal Pages editor
+ Email Templates editor (feature parity with RxJobs4U), chat-gating bug fix, full security
hardening port (Joi env validation actually wired up, `safeEqual` on Razorpay webhook,
`tokenVersion` forced-logout, `verifyUploadKey` S3 HeadObject check, CSRF guard on
refresh/logout, rate limiting). `eduhire` Mongo DB was cleared and reseeded (admin users,
SystemConfig, email templates, legal pages) after this phase. See `DECISIONS.md` §11 (D41-D46).

### Phase 2 (COMPLETE) — Recruiter/School area cleanup
Found & fixed a **live 400 bug**: D41's backend rename (`hospitalInfra`→`campusFacilities` etc.)
never propagated to the frontend School Profile page, so every save 400'd. Expanded
`Subject`/`TeacherPost` shared enums and added a new `JobDepartment` enum to replace duplicated,
drifted ad-hoc string-array constants in the job-posting form; wired the form onto the real
enums using a new `lib/utils/enum-options.ts` (`enumLabel()`/`enumComboboxOptions()`) helper.
Renamed `/recruiter/hospital` route → `/recruiter/school`. Also fixed a small unrelated bug found
in passing (Teacher Settings alert toggle field-name mismatch). See `DECISIONS.md` §13 (D47-D49).

### Phase 3 (COMPLETE — plan approved 2026-07-09, executed and live-verified same day)
Picked up the exact bug D49 flagged: the Teacher/Job Seeker profile page had the same live 400
bug as the School Profile page did in Phase 2, plus the same "ad-hoc string constants instead of
real shared enum" problem the job-posting form had. Full record is in `DECISIONS.md` §15
(D50-D51) — that's the durable record; the plan-mode file at
`C:\Users\VIKKI\.claude\plans\lets-work-on-lading-soft-iverson.md` gets overwritten each new
phase, don't rely on it still having Phase 3 content.

**What shipped, 3 parts, all live-verified via curl (not just `tsc --noEmit`):**
1. **Fixed the live 400 bug** — renamed 4 stale field names (`placeOfPractice`, `typeOfPractice`,
   `medicalCouncilName`, `isRegisteredInCouncil`) to match the backend (`currentSchool`,
   `employmentType`, `boardRegistrationName`, `isRegisteredWithBoard`) across 5 frontend files:
   `app/(app)/profile/page.tsx`, `lib/validations/profile.ts`, `lib/api/users.ts`,
   `common-components/seeker-profile-view.tsx`, `lib/api/applications.ts`.
2. **Repurposed `academics: Academics` → `academics: TeacherPost`, full-stack** — the old
   `Academics` enum (Assistant/Associate/Professor — university faculty ranks, meaningless for
   K-12) was deleted entirely from both `shared/enums` files; `academics` now uses `TeacherPost`
   (SGT/TGT/PGT/HM/PRINCIPAL/etc). UI relabeled "Academics" → "Current / Highest Post Held", now
   a `Combobox` instead of a 6-item hardcoded `<Select>`.
3. **Rewired `expertise`/`interestedToCover` onto the real `Subject` enum, full-stack** — the two
   old ad-hoc string arrays (`EXPERTISE_OPTIONS`/`INTERESTED_TO_COVER_OPTIONS`) were deleted from
   `lib/shared/constants.ts`; both fields now validate with `@IsEnum(Subject, {each:true})`
   (backend DTO) and `enum: Subject` (Mongoose schema), matching the pattern already shipped for
   job `specializations` in Phase 2.

**A 6th bug found only by live-testing the full apply→shortlist→view-applicant flow (D51):**
`applications.service.ts`'s `jobApplicants()` Mongo aggregation `$project` never included
`isRegisteredWithBoard`/`boardRegistrationName`/`desiredCities` at all, and had a stale
`expectedSalaryLakhs` field that doesn't exist in the schema (real field is `salaryRange`) — so
those fields would always render blank in the recruiter's "View Applicant" screen no matter what
the frontend did. Invisible to `tsc --noEmit` since Mongo aggregation pipelines aren't
type-checked against the schema. Fixed by adding the correct field names to the projection.

**Not touched:** `DEGREE_OPTIONS`/`degrees` (stays free text — no real `Degree` enum exists, and
it's shared with the job-posting form's `requiredDegree`), `indemnityInsurance` (dead field, no
UI control, pending client decision — see `DECISIONS.md` §14). No data migration was needed for
the breaking `academics`/`expertise`/`interestedToCover` value changes since the DB only held
seed/test data.

**Live verification performed:** registered a fresh TEACHER + RECRUITER test account, confirmed
old field names now 400 (proving the bug was real), new field names 200 with correct round-trip,
invalid `TeacherPost`/`Subject` enum values now 400 (proves `@IsEnum` is actually enforced),
posted a job, applied, and fetched the recruiter's applicant list to confirm all renamed fields
(including the D51 fix) now appear correctly instead of blank.

### Not yet started
- **Phase 4** (roadmap-level only): Chat hardening — file-upload attachments (D39, chat is
  currently text-only), message-length limit reconciliation (currently 2000 chars vs
  originally-discussed 500/4000 — D40, open).
- Provisioning a dedicated EduHire/SchoolTeacher S3 bucket — currently borrowing the RxJobs4U
  bucket temporarily (user's explicit call: "i deletd jss-vkinnect, sue rxjobs bucket for ow pls.
  later we can crete one for schoolTeacher").
- Everything in `DECISIONS.md` §14 "Explicit Non-decisions" — subscription auto-renewal
  mechanism, chat char-limit final call, verified badges, ratings, referral programme, actual
  pricing values, `indemnityInsurance` disposition. Don't resolve any of these without asking the
  client (the user) first — they're explicitly parked, not forgotten.

## Standing rules established this session (follow these without being re-told)

- **RxJobs4U is read-only.** Copy patterns from it freely, never edit it, don't ask permission
  each time you read from it.
- **Live-verify, don't just compile-check.** Every phase's "done" claim must be backed by an
  actual API call or UI walkthrough, not just `tsc --noEmit` passing. This caught real bugs
  (Email Templates partial-update 500, the School Profile 400, the AWS bucket misconfiguration)
  that pure code review missed.
- **Redact secrets in terminal output** (AWS keys, tokens) even though not explicitly asked —
  self-imposed good practice, keep doing it.
- **Any `.env`/credentials/infra change needs explicit user confirmation before proceeding** —
  established via the AWS duplicate-credential incident (flagged via `AskUserQuestion`, user
  resolved it themselves rather than having it done for them).
- **A running backend does NOT hot-reload `.env` changes** — `nest start --watch` only recompiles
  TS. A full kill (`netstat -ano | grep :3001` → `taskkill //F //PID <pid>`) + restart is required
  after any `.env` edit.
- **Follow the plan-mode rhythm for each new phase**: `EnterPlanMode` → Explore agent(s) for
  research → Plan agent for design → `AskUserQuestion` for any open calls → write the plan to the
  plan-mode file → `ExitPlanMode` for approval → execute with `TodoWrite` → live-verify → update
  `DECISIONS.md` with a new dated section. The plan-mode file gets overwritten fresh each phase
  (it's scratch space); `DECISIONS.md` is the durable record — always update it as you go, don't
  do a separate docs-only pass at the end.
- **This file (`NewChatStartOff.md`) should be refreshed at the end of each phase** (or sooner, if
  a session is running long) so a fresh chat can always pick up cold. Keep it a summary/pointer —
  don't duplicate `DECISIONS.md`'s full detail here, just enough to reorient fast.

## Key file locations (so you don't have to rediscover them)

- Shared enum source of truth: `EduHire-Backend/src/shared/enums/index.ts`, manually mirrored to
  `EduHire-Frontend/lib/shared/enums.ts` (no build-time sync — must edit both by hand).
- Enum display helpers: `EduHire-Frontend/lib/utils/enum-options.ts` (`enumLabel()`,
  `enumComboboxOptions()`) — added in Phase 2, reuse for any new enum-driven picker.
- Ad-hoc constants still not enum-ified: `EduHire-Frontend/lib/shared/constants.ts`
  (`EXPERTISE_OPTIONS`, `INTERESTED_TO_COVER_OPTIONS` — being removed in Phase 3;
  `DEGREE_OPTIONS`, `SCHOOL_ACCREDITATION_OPTIONS`, `SCHOOL_INFRA_OPTIONS` — staying free text).
- Decision log: `ProjectDocuments/DECISIONS.md` — read the tail (highest-numbered §) for the
  latest state; sections aren't always in strict chronological/numeric order (there are two "§11"
  headers currently, an old artifact — don't worry about renumbering, just append new sections).
