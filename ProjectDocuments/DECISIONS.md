# DECISIONS.md — EduHire

> Single source of truth for **what we decided and why** while spinning EduHire out of
> RxJobs4U. Read this before the build. Anything marked **OPEN** must be confirmed with the
> client before it is wired for money.

EduHire is a **Teacher Hiring Platform** — a sister project to RxJobs4U (a healthcare job
marketplace already built and shipped). We reuse the entire RxJobs4U architecture and swap the
domain from healthcare to education. Schools/recruiters hire teachers.

---

## 1. Locked decisions

| # | Decision | Rationale |
|---|---|---|
| D1 | **Brand: EduHire.** Logo splits as `Edu` (accent) + `Hire` (white), mirroring RxJobs4U's `Rx` + `Jobs4U`. | Client choice. |
| D2 | **Prototype-first** for the first client demo: landing + all 3 role logins + basic role dashboards, clickable. Full foundation docs (this folder) written first, then the build. | Demo deadline; auth flows must be real, not mockups. |
| D3 | **Drop SOS entirely.** Full-time job posts only. Remove the SOS job type, SOS subscriptions (both sides), SOS pricing, SOS landing section, seeker SOS access. | Client: "no SOS". Substitute-teacher mode can be added later if requested. |
| D4 | **New repo, separate folder.** `Desktop/EduHire/` (`EduHire-Frontend`, `EduHire-Backend`, `ProjectDocuments`). RxJobs4U is **never modified** — it is the reusable base we copy from. | Keep the base pristine for future sister apps. |
| D5 | **Copy whole apps, then rebrand the copies.** Not a selective file-by-file copy. | Login needs the auth module + API client + JWT/cookie plumbing together; wholesale copy is faster and reliable. |
| D6 | **No CRM.** The client flowchart shows CRM integration — we omit it. | Out of scope. |
| D7 | **Chatbot deferred.** When added, it is a **third-party widget embed (a link/script)**, not custom-built. | Client direction. |
| D8 | **Chat is basic, with file upload.** Real-time text chat (500-char limit) + file attachments, unlocking at SHORTLISTED. Not a WhatsApp-grade client (no threads, reactions, presence beyond online/typing-optional). | Client: "basic one enough… give file upload as well." |
| D9 | **Keep RxJobs4U's full money/notification/realtime infrastructure** (Razorpay + HMAC webhook, SystemConfig, Socket.IO, web-push VAPID, Brevo email, MSG91 SMS, S3 uploads). No Redis/BullMQ. No Firebase. No nodemailer. | Proven, domain-agnostic; reuse as-is. |
| D10 | **Per-job admin approval** (NEW — not in RxJobs4U). A posted job enters `PENDING_APPROVAL`; admin **Approves** (→ live) or **Rejects** (→ recruiter edits & resubmits). | Required explicitly by the client flowchart ("Job Goes for Admin Approval → Approved / Rejected → Modify & Resubmit"). |
| D11 | **Demo depth = "Stronger":** landing + 3 logins + 3 dashboards **plus** the key role screens relabeled (teacher profile/browse jobs, recruiter post-job/applicants, admin users/jobs tables). | Screens already exist from the copy; low marginal effort, far more convincing demo. |
| D12 | **Premium landing page** — a deliberate ~3x upgrade over RxJobs4U's landing (see §6), reusing RxJobs4U's header/hero **CSS** (transparent→solid header, full-bleed 100vh banner, scroll-reveal) but with richer education-specific sections and imagery. | Client wants the landing to be the standout of the demo. |

---

## 2. Pricing & payments — FINAL (fully admin-controlled, both sides)

Every amount AND every "is this side paid or free?" toggle lives in **SystemConfig** and is
editable from the **admin panel** (the same mechanism RxJobs4U uses to manage prices). Nothing
payment-related is hardcoded or permanently deleted — the admin decides what is active.

**Current defaults:**
- **School / recruiter — paid:** **₹500 / month = unlimited** job posts (Razorpay subscription).
  **Free tier = 2 active posts / month** with no subscription.
- **Teacher / job seeker — free:** teacher-side payment toggle is **off** by default.

**Admin can, from the panel:** change any amount, change the free-tier limit, and flip **either
side's** paid↔free toggle at any time.

| SystemConfig key | Type | Default | Meaning |
|---|---|---|---|
| `RECRUITER_MONTHLY_PAISE` | price | `50_000` | ₹500/mo — unlimited posts (school subscription) |
| `FREE_TIER_JOB_LIMIT` | setting | `2` | free active posts/month when school not subscribed |
| `SCHOOL_PAID_ENABLED` | setting (bool) | `true` | is school posting paid at all? |
| `TEACHER_PAID_ENABLED` | setting (bool) | `false` | does the teacher pay a shortlist fee? (off = free) |
| `APPLICATION_FEE_PAISE` | price | `9_900` | teacher shortlist fee — **retained, unused while toggle off** |

**Application flow is toggle-driven** (machinery kept from RxJobs4U, not deleted):
- Teacher-pay **off** (today): `INTERESTED → SHORTLISTED → WON | CLOSED`. No fee, no pay window.
  School identity revealed to the teacher at **SHORTLISTED**; chat also unlocks at SHORTLISTED.
- Teacher-pay **on** (if admin enables): RxJobs4U's path returns —
  `INTERESTED → SHORTLISTED → PAID → WON | CLOSED` with pay-window cron + reveal-on-PAID. Code
  stays in place, gated behind `TEACHER_PAID_ENABLED`.

**Removed (SOS-specific only):** `SOS_MONTHLY_PAISE`, `SOS_SEEKER_MONTHLY_PAISE`, `BOOST_PAISE`.

## 2b. Open items — confirm with client (do NOT block the demo)

| # | Question | Working assumption |
|---|---|---|
| O1 | **Subject list.** | Proposed: PRIMARY, ENGLISH, MATHEMATICS, SCIENCE, PHYSICS, CHEMISTRY, BIOLOGY, SOCIAL_STUDIES, HINDI, COMPUTER_SCIENCE. |
| O2 | **International Teacher Training** (client marks "Optional"). | Static informational page for now; "express interest" form later. |

---

## 3. Domain substitution map

| RxJobs4U (healthcare) | EduHire (education) |
|---|---|
| Hospital | School |
| Job Seeker (doctor/nurse) | Teacher |
| Recruiter (hospital admin) | School / Recruiter (Principal / HR) |
| HospitalDepartment (LAB, ICU, …) | Subject (Maths, Science, English, Primary, …) |
| Expertise (medical specialties) | Subjects taught / specializations |
| Degrees (MBBS, BDS, …) | B.Ed, M.Ed, B.A/M.A, B.Sc/M.Sc, B.Com, Ph.D, D.El.Ed |
| SOS (medical emergency) | **REMOVED** |
| Medical council reg. / indemnity / surgical cover | **REMOVED** |
| `HOSPITAL_PHOTO` upload kind | `SCHOOL_PHOTO` |

### New, education-specific (from client spec + flowchart)
- **`TeacherPost`** (a.k.a. "Post Applied For"): `SGT`, `PGT`, `HM`, `PRINCIPAL` (client's exact list).
- **`WorkLocationPreference`** (a.k.a. "Preferred Work Location"): `LOCAL`, `NATIONAL`, `INTERNATIONAL`.
- **`Subject`**: see O2.
- **`UploadKind`** additions: `INTRO_VIDEO` (teacher introduction video), `CHAT_ATTACHMENT`.
- **`JobType`**: only `FULL_TIME` (SOS removed).
- **`NotificationKind`**: rename `HOSPITAL_*` → `SCHOOL_*`; drop SOS-related kinds.

---

## 4. The demo shortcut (be honest about this)

For the **first clickable demo**, we do not do the full backend code-level rename in one pass.
Instead:
- Backend runs essentially as the RxJobs4U copy (auth/users/roles are domain-agnostic and work
  immediately) pointed at a fresh `eduhire` Mongo DB.
- Role enum **values** stay `JOB_SEEKER` / `RECRUITER` / `ADMIN` in the DB but **display** as
  "Teacher" / "School" / "Admin" in the UI.
- We rebrand the visible surface: theme, logo, landing copy, nav labels, and the most
  demo-visible domain strings ("Hospital profile" → "School profile", department → subject).

The **proper code-level rename** (`Hospital→School`, `JobSeeker→Teacher`, new enums, remove
medical fields) is **Phase 2**, done after the demo. Target docs in this folder describe the
clean end-state; this section is the only place that records the demo compromise.

---

## 5. Phase roadmap

- **Phase 0 — Demo (today, "Stronger" depth):** npm install + clean `.next` + point `.env` at
  fresh `eduhire` DB + seed admin → **premium landing rebuild** (§6) + theme/logo rebrand →
  relabel key role screens (teacher profile/browse jobs, recruiter post-job/applicants, admin
  tables) → auth golden path works for all 3 roles → run both apps.
- **Phase 1 — Foundation docs:** this folder (done before the build per house rule).
- **Phase 2 — Backend domain rename + admin job-approval:** Hospital→School, JobSeeker→Teacher,
  new enums, remove medical-specific fields, relabel NotificationKind, add `PENDING_APPROVAL`
  job status + admin approve/reject + recruiter resubmit (D10). Keep infra generic.
- **Phase 3 — Chat module:** ChatModule + Message schema + ChatGateway (`/chat` namespace,
  reuse the JWT-handshake pattern from notifications gateway) + file upload via existing S3
  uploads. Unlocks at SHORTLISTED. FE chat panel both sides.
- **Phase 4 — Domain features:** intro-video upload, personalized recommendations, advanced
  search/filters (location/subject/salary/experience), International Teacher Training page,
  chatbot widget embed, pricing finalization.

---

## 6. Landing page design (demo centerpiece — ~3x better than RxJobs4U)

**Goal:** the landing page is the standout of the demo. Reuse RxJobs4U's proven header/hero
**CSS mechanics**, but make it richer, more polished, and education-specific.

**Inspiration** (researched): Teach Away, Schrole, Eteach, TES, Teach Starter. Common winning
patterns we adopt: one bold outcome-focused headline over a full-bleed emotive classroom photo;
one primary + one low-commitment secondary CTA; a trust line; oversized expressive type;
"apply in one click" simplicity messaging; warm, human imagery.

**Carry over from RxJobs4U (CSS/mechanics — keep as-is, just retheme):**
- Transparent-to-solid sticky header: transparent over the hero, transitions to solid
  (blurred, dark) after ~80px scroll. Logo always visible ("Edu" accent + "Hire" white).
- Full-bleed **100vh hero** with a background banner image + dark bottom-weighted gradient
  overlay; content (badge → H1 slogan → subtext → CTAs → trust pills) anchored low.
- Scroll-reveal system (`LandingReveal` IntersectionObserver + `.will-reveal*` classes);
  hero keyframe entrance; `ScrollToTop`; `.btn-glow`.
- The 4-property gradient-text rule (background + WebkitBackgroundClip + WebkitTextFillColor +
  backgroundClip + color:transparent) — keep, it's a known bug-trap.

**Theme:** professional education palette — indigo/blue primary (e.g. `#3949ab`) with a warm
accent (amber/coral) for CTAs. One-file swap in `app/globals.css` `@theme` block.

**Hero copy (draft — refine during build):**
- H1 slogan: e.g. *"Find the teaching role you were meant for."* / for schools: *"Hire great
  teachers, faster."* (audience-aware or a single unifying line).
- Subtext: one sentence on what EduHire is + who it's for.
- Primary CTA "Find Teaching Jobs", secondary "Hire Teachers".
- Trust pills: "Verified Schools", "Local · National · International", "Free for Teachers".

**Section stack (below hero), each scroll-revealed:**
1. **Stat / trust band** — honest, generic (no fake numbers): "Free for teachers", "Posts
   reviewed by admin", "Chat directly with schools".
2. **For Teachers** — 3–4 steps: build profile (resume + intro video) → browse & filter →
   apply in one click → chat with schools.
3. **For Schools** — 3–4 steps: post a job (2 free/month) → admin-approved & live → search &
   shortlist teachers → chat directly. Mention ₹500/mo unlimited.
4. **Subjects / posts strip** — visual chips: SGT · PGT · HM · Principal; Maths · Science ·
   English · Primary…
5. **Why EduHire** — compact 3-column feature card grid (real-time chat, verified schools,
   intro-video profiles, international opportunities).
6. **International Teacher Training** teaser (optional feature) — small section/banner.
7. **Pricing** — 2 cards: Teachers (Free) · Schools (Free 2/mo or ₹500/mo unlimited).
8. **Testimonials** — generic placeholder cards.
9. **Final CTA band** + footer.

**Implementation:** rewrite `app/page.tsx`; retheme `app/globals.css`; rebrand
`common-components/site-header.tsx`. Use education imagery from Pexels/Unsplash (free,
hotlinkable). Reuse the landing-page design blueprint patterns already proven in RxJobs4U.

## 7. Reference
- Client flowchart: `RxJobs4U/rxjobs4u-frontend/app/recruiter/dashboard/WhatsApp Image 2026-05-21 at 11.29.12 PM.jpeg`
- Reference dummy site (thin app shell, 3 roles): `https://vebspot.com/school/school-teacher-app.html`
- Landing inspiration: teachaway.com, schrole.com, eteach.com, tes.com, teachstarter.com
- Base codebase: `Desktop/RxJobs4U/` (do not modify).

---

## 8. Rebrand — 2026-07-05

| # | Decision | Rationale |
|---|---|---|
| D13 | **Public brand name is "School Teacher"** (with a space). Folder + npm package names stay `EduHire` / `eduhire-*`. Every user-facing string (docs, page titles, `<title>`, email copy, notification body, landing hero) uses "School Teacher". Internal identifiers stay lowercase-hyphen so nothing breaks. | Client renamed; landing page already updated. Path/package rename is unnecessary risk. |
| D14 | **Substitute-teacher mode is back** as `PostingType.URGENT`. D3 is superseded — the platform now supports both `URGENT` (short-notice sub) and `PERMANENT` (long-term). School and teacher can subscribe to urgent monthly access. | Later client request; matches the healthcare SOS pattern that already works. |

---

## 9. Hardened decisions inherited from RxJobs4U Phase 3a–3f — 2026-07-05

These are the non-obvious calls we made in the sibling project that we're pre-committing to here from day 1. Every one is either a bug-pattern we lived through or an efficiency lesson.

### Security & infra

| # | Decision | Why |
|---|---|---|
| D15 | **Custom body-only Mongo-operator sanitizer.** Do NOT use `express-mongo-sanitize` — it mutates `req.query` in place, which crashes on Node 20+ (read-only getter). Custom recursive walker on `req.body` only. | Lost an evening to this in RxJobs4U. Query/params aren't the attack vector; DTOs type-coerce them. See BUG_PATTERNS §Phase 3e. |
| D16 | **Helmet COOP = `same-origin-allow-popups`** (not the default `same-origin`). | Default blocks Google OAuth popup `postMessage`-back — sign-in silently hangs. Same fix likely clears reCAPTCHA TypeErrors from the badge iframe. |
| D17 | **`safeEqual` utility for all HMAC compares** (Razorpay, future Meta webhooks). Never `===` / `!==` on signatures. | Timing-attack; caught in RxJobs4U's `eacdadd`. Single helper in `common/utils/crypto.util.ts`. |
| D18 | **`verifyUploadKey` is opt-in per persist site** (not a global interceptor). Wire into `UsersService.update*`, `SchoolsService.create/update` on any field bearing an S3 URL. | RxJobs4U shipped presign without this and had trust-the-client bugs. HeadObject at persist time is cheap and closes the class. |
| D19 | **Body size cap explicit at 1 MB** for `json` + `urlencoded`. File uploads bypass the BE entirely (S3 presign). | Cheap DoS defence + locks behaviour vs framework default drift. |
| D20 | **Env validation via Joi at boot** — fail-fast. `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CONFIG_ENCRYPTION_KEY` all ≥32 chars and **mutually distinct**. Integration keys required only in `NODE_ENV=production`. | Prod misconfig is expensive; boot-time death is cheap. |
| D21 | **`tokenVersion` claim** in JWT, revalidated on every request. Bumped on password change / reset / forced logout via `$inc: {tokenVersion:1}`. | Otherwise old access tokens live for 15 min after a credential change. |
| D22 | **`PUBLIC_FRONTEND_URL` env for every outbound user-facing link.** Never hardcode the FE domain in BE. | RxJobs4U had a `.in` ghost hardcoded in 5 places, found only via repo-wide grep. |
| D23 | **PII redaction at log-emission** via `redactEmail` / `redactPhone`, PLUS pino redact config for Authorization/cookie/password fields. | Belt + suspenders — one catches app-logs, other catches structured objects. |
| D24 | **Anonymous auth audit** — `AuditService.logAuthEvent(action, masked, reason, ip, ua)` for `AUTH_FAILED`, `OTP_FAILED`, `OTP_LOCKED`, `PASSWORD_RESET`, `LOGIN_SUCCESS`. Nullable `adminId` on `AuditLog`. | Forensics for credential-stuffing detection; must be forensics-ready before public launch. |

### Data model

| # | Decision | Why |
|---|---|---|
| D25 | **All geo fields use a `@Schema({_id:false})` LocationSchema sub-class** with `default: null` on the parent `@Prop`. NEVER inline `{type: {type:String,enum:['Point']}, coordinates:[Number]}`. | Mongoose 9 crashes at schema-build on inline with `default: null` or `default: undefined`. Sub-schema class accepts `null` cleanly. |
| D26 | **`type: String` explicit** on every `string \| null` `@Prop` even when TS type is unambiguous. | Without it NestJS Mongoose throws `CannotDetermineTypeError` at boot for union types. |
| D27 | **Never mix `@Prop({index:true})` and `Schema.index()`** on the same field. `@Prop({index:true})` for single-field; `Schema.index()` for compound. | Duplicate index warnings + Atlas may refuse to build. |
| D28 | **`{returnDocument:'after'}` on `findOneAndUpdate`, never `{new:true}`.** | Mongoose 9 dropped the legacy option; docs may be stale silently. |

### Pricing & config

| # | Decision | Why |
|---|---|---|
| D29 | **Pricing is 100% dynamic via `SystemConfig{type:'price'}`.** No hardcoded rupee constants. `getPricePaise(key)` throws if the key isn't configured. Admin fills at go-live via UI. | Departs from RxJobs4U (which had ₹399/₹299/₹99 in a `pricing.ts` file). Client wants pricing flexibility without deploys. |
| D30 | **SystemConfig settings carry `displayKind` / `unit` / `maxValue` metadata.** FE admin panel branches on `displayKind === 'boolean'` → `<Switch>` render, else `<Input type="number">` + unit suffix. | Otherwise the admin panel shows "Currently set to 1 km" for a 0/1 toggle. |
| D31 | **Boot-time metadata back-fill** for pre-existing SystemConfig docs. Idempotent — only writes changed fields. | Lets us evolve setting metadata without hand-migrating in prod. |

### Forms & UI

| # | Decision | Why |
|---|---|---|
| D32 | **Discriminated forms = discriminated `useForm` instances.** For `type: URGENT \| PERMANENT` posting form, render two separate child components with their own `useForm<VariantValues>()` + variant-specific Zod schema. NEVER one form with a union type. | Otherwise `errors.<field>` becomes uncastable without `as Partial<...>` everywhere. |
| D33 | **Type-aware display helpers** live in `lib/utils/postings-display.ts`. Every card / detail / dialog that renders a Posting branches on `type === URGENT` to use `urgentQualificationLabel`, `urgentFeeDisplay`, `formatShiftAt`, `formatShiftRange` instead of the salary/experience formatters. | Auto-derived legacy columns don't display meaningfully for urgent — showing "0-0 yrs experience" or "₹240 LPA" on a shift is worse than showing nothing. |
| D34 | **Notifications bell fetches on mount** (not only on open). | Otherwise the badge count is wrong on first render until user clicks. |

### Ops

| # | Decision | Why |
|---|---|---|
| D35 | **`COOKIE_DOMAIN` is blank in local dev.** Set only in prod (`.schoolteacher.com`). | Browser rejects `Domain=.schoolteacher.com` on `localhost` → refresh cookie silently dropped → looks like login is broken. |
| D36 | **Next.js 16 uses `proxy.ts`** (not `middleware.ts`). Public paths allow-list is the single source of truth for what's not gated. Any new public route → add to `PUBLIC_PATHS` **same commit**. | RxJobs4U had `/privacy-policy` and `/terms` bounce to `/login` for a week because they weren't in the list. |
| D37 | **Turbopack lazy-compiles per route.** Transient 404s after edits are normal. Fix: hard-refresh browser (`Ctrl+Shift+R`). Persistent: `rm -rf .next && npm run dev`. Not a bug. | Documented so future contributors don't chase ghosts. |

### Chat (Phase 1 planned)

| # | Decision | Why |
|---|---|---|
| D38 | **Chat rooms scoped 1:1 with applications.** `roomId === applicationId`. Room created on first entry to `PAID` state. Both parties (teacher + school-admin) joined server-side; anyone else → `disconnect()`. | Simplest scoping; no leaks; matches user's D8 (basic chat with file upload). |
| D39 | **Chat file uploads** reuse the presign flow with `UploadKind.DOCUMENT` (up to 5 MB, PDF / JPG / PNG). | Reuses infra; no new infra required. |
| D40 | **Message body max 4000 chars**, validated FE + BE. Longer than the D8 "500-char" spec because file attachments carry most of the weight; long text is fine. | Reconciling D8's 500-char intent with practical UX; if client insists on 500, revisit. **OPEN**. |

---

## 10. Explicit Non-decisions (open, client to confirm)

- Subscription auto-renewal: Razorpay Subscriptions API vs manual re-purchase.
- Chat 500-char limit vs 4000-char (see D40).
- Verified badges — who / how.
- Teacher / school ratings.
- Referral programme.
- Actual pricing values (D29 sets the mechanism; values TBD).

