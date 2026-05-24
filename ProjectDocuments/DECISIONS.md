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
</content>
