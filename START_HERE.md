# START HERE — EduHire build handoff

> **New chat? Read this file first, then `ProjectDocuments/DECISIONS.md`.** Those two together
> are the complete spec. This file tells you what to do, in what order, and where to look.

---

## What this project is
**EduHire** — a Teacher Hiring Platform (Schools/Recruiters hire Teachers). It is a **copy of a
finished, shipped healthcare job marketplace (RxJobs4U)**, rebranded to education. We are NOT
writing the app from scratch — we copy the proven code and adapt it.

**Today's goal:** a clickable **demo** for a client — a premium landing page + all 3 role logins
+ relabeled role dashboards/screens ("Stronger" demo depth). Deeper domain rename, chat, and
job-approval come in later phases.

## The reference codebase (READ-ONLY — never modify it)
RxJobs4U lives at: **`C:\Users\VIKKI\OneDrive\Desktop\RxJobs4U`**
- Apps: `rxjobs4u-frontend/`, `rxjobs4u-backend/`
- Its docs: `RxJobs4U/ProjectDocuments/*.md` (BLUEPRINT, FRONTEND_GUIDE, BACKEND_GUIDE,
  DATA_MODEL, SCREEN_MAP, BUG_PATTERNS, CLAUDE.md) — these encode the patterns to follow.
- You can `Read`/`Grep`/`Glob` that path directly, or spawn `Explore` agents pointed at it.
  If a read is ever blocked, run `/add-dir C:\Users\VIKKI\OneDrive\Desktop\RxJobs4U`.
- **Rule: copy patterns FROM it, never edit it.** When unsure how something works in EduHire,
  read its RxJobs4U equivalent.

## Current repo state (already done)
- Both apps copied → `EduHire/EduHire-Frontend`, `EduHire/EduHire-Backend` (no `node_modules`).
- `.env` files came across but **point at RxJobs4U** — must be fixed (step 3 below).
- Leftover `EduHire-Frontend/.next` build cache exists — delete it (step 2).
- No git repo yet at the EduHire root.

---

## Phase 0 — DO THIS, IN ORDER (today's demo)

### 1. Install
```
cd EduHire-Backend  && npm install
cd ../EduHire-Frontend && npm install
```

### 2. Clean stale cache
Delete `EduHire-Frontend/.next` (stale from the source repo).

### 3. Fix backend `.env`
In `EduHire-Backend/.env`: set `MONGO_DB_NAME=eduhire` (fresh empty DB on the same Atlas
cluster), change the email sender name to "EduHire". **Keep** the existing JWT secrets / Google
OAuth / Razorpay / Brevo / MSG91 / S3 keys (reused for the demo). Boot the backend once and
confirm it connects to Mongo before going further.

### 4. Seed an admin user
Find how RxJobs4U seeds its admin (grep the backend for `admin@rxjobs4u` or a seed
script/command) and mirror it for EduHire (e.g. `admin@eduhire.com`). Needed for admin login.

### 5. Run (only EduHire — stop RxJobs4U so ports :3000/:3001 are free)
```
EduHire-Backend:  npm run start:dev   # http://localhost:3001/api
EduHire-Frontend: npm run dev         # http://localhost:3000
```
Confirm the landing page renders and you can register/login.

### 6. PREMIUM LANDING REBUILD (the demo centerpiece — see `DECISIONS.md §6`)
~3x better than RxJobs4U's landing. **Keep RxJobs4U's header/hero CSS mechanics**
(transparent→solid sticky header, full-bleed 100vh banner image + slogan, scroll-reveal,
4-property gradient-text rule) but rebuild richer education sections.
- `EduHire-Frontend/app/globals.css` — swap `@theme` brand colors to education indigo/blue
  (`~#3949ab`) + warm accent.
- `EduHire-Frontend/app/page.tsx` — rebuild per the section stack in `DECISIONS.md §6`
  (hero slogan → For Teachers → For Schools → subjects/posts chips → Why EduHire → Intl
  Training teaser → pricing 2-cards → testimonials → final CTA). Remove the SOS section.
- `EduHire-Frontend/common-components/site-header.tsx` — logo "Edu"(accent)+"Hire"(white).
- Use education imagery from Pexels/Unsplash (free, hotlinkable).

### 7. Rebrand the rest of the visible surface
- `app/layout.tsx` — title/description/favicon → EduHire.
- `common-components/app-header.tsx` — nav + role labels: "Job Seeker"→"Teacher",
  "Hospital"→"School".
- `app/(auth)/layout.tsx`, `app/(auth)/login|register|otp-verify/page.tsx` — role selector
  "I'm a Teacher" / "I'm a School".

### 8. Relabel key role screens ("Stronger" depth — D11)
Make these read as education (they already exist from the copy):
- Teacher `app/(app)/*`: dashboard, profile, browse jobs + detail.
- Recruiter `app/recruiter/*`: dashboard, post-job form, applicants, school profile.
- Admin `app/admin/*`: dashboard, users table, jobs table, payments, config.
- Relabel display strings in `lib/shared/enums.ts` + `lib/shared/constants.ts`. Steer the demo
  walkthrough around raw healthcare enum dropdowns (full enum swap is Phase 2).

### 9. Verify the demo golden path (in a browser)
Landing → Select Role → register/login as **Teacher** → teacher dashboard/profile/jobs;
register/login as **School** → recruiter dashboard/post-job/applicants; **Admin** login →
admin dashboard/users/jobs. Check mobile width (hamburger nav). Note which screens are live
vs relabeled-static.

---

## Money model (FINAL — admin-controlled, both sides). Full detail in `DECISIONS.md §2`.
- School posting: **₹500/mo = unlimited**; **free tier = 2 posts/month**. (`SCHOOL_PAID_ENABLED=true`)
- Teacher: **free** (`TEACHER_PAID_ENABLED=false`). Teacher-fee machinery is **kept but gated**.
- Admin can change every amount + flip either side paid/free via SystemConfig.
- Flow (teacher-pay off): **INTERESTED → SHORTLISTED → WON | CLOSED**. School revealed at
  SHORTLISTED; chat unlocks at SHORTLISTED.

## What is NEW vs RxJobs4U (not a pure copy)
- **Per-job admin approval** (`PENDING_APPROVAL` → Approve/Reject → resubmit) — Phase 2.
- **Basic chat with file upload** (reuses Socket.IO + S3) — Phase 3.
- **Intro-video upload**, International Teacher Training page, recommendations — Phase 4.
- SOS is **removed** entirely. CRM omitted. Chatbot later (third-party widget link).

## Demo shortcut (be honest about it)
For the demo we keep role enum VALUES as `JOB_SEEKER`/`RECRUITER`/`ADMIN` and just relabel the
UI to Teacher/School/Admin. The proper backend rename (Hospital→School, JobSeeker→Teacher, new
enums) is **Phase 2**, after the demo.

## Hard rules to honor (from RxJobs4U — full list in its BUG_PATTERNS.md)
- **FE: always reuse common components** (`common-components/`, `lib/`, `hooks/`) — never raw
  shadcn / native HTML. Tweak existing, don't duplicate.
- No `any`. No secrets in code. Money = integer paise, convert at UI edge only.
- All React hooks before any early return.
- Refresh cookie `path:'/'`. Auth context = `useState`, not React Query.
- `@InjectModel(X)` ⇒ add `MongooseModule.forFeature` to that module immediately.
- Every `NotificationKind` needs a matching `@OnEvent()` handler.
- Gradient text needs all 4 CSS properties together.

---

## After the demo
Generate the full 6 foundation docs in `EduHire/ProjectDocuments/` by adapting RxJobs4U's
(CLAUDE, PROJECT_BLUEPRINT, DATA_MODEL, FRONTEND_GUIDE, BACKEND_GUIDE, SCREEN_MAP, BUG_PATTERNS),
then do Phase 2 (backend domain rename + job-approval), Phase 3 (chat), Phase 4 (features).

## Files in this folder to read
- `ProjectDocuments/DECISIONS.md` — the full spec (pricing, domain map, enums, landing §6, phases).
- `START_HERE.md` — this file.
</content>
