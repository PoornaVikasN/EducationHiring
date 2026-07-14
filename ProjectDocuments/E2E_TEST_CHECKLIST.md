# E2E_TEST_CHECKLIST.md — School Teacher

> Manual pre-production QA checklist. Written 2026-07-13 against the real route inventory
> (`EduHire-Frontend/app/**/page.tsx`) — every screen listed here actually exists. Run this
> yourself in a real browser; everything verified so far this project (`DECISIONS.md` D50-D59)
> was API-level (curl) only, so this is the first pass that will actually exercise the UI.
>
> **How to use this**: work top to bottom, role by role. Check each box as you go. Anything that
> doesn't behave as described is a bug — note the exact screen + step + what happened, and bring
> it back for a fix. Use 3 separate browser profiles/incognito windows (or 3 different browsers)
> so you can be logged in as Teacher + Recruiter + Admin simultaneously — several flows need two
> roles interacting at once (e.g. chat, shortlist → notification).

---

## 0. Before you start

- [ ] Both servers running: backend `npm run start:dev` (port 3001), frontend `npm run dev` (port 3000)
- [ ] Confirm `EduHire-Backend/.env` has real values for: `MONGO_DB_*`, `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, `GOOGLE_MAPS_API_KEY`, `GOOGLE_CLIENT_ID`, `RECAPTCHA_SECRET_KEY`, `GMAIL_*`, `AWS_*`, `RAZORPAY_*`
- [ ] Open browser DevTools console on every screen as you go — **a clean console with zero red errors is part of "pass."** A page can look fine and still be silently broken.
- [ ] Have 3 test accounts ready (or create fresh ones in section 1): one Teacher, one Recruiter, one Admin (seeded admin: `info@bcognitrix.com` — password is in `app.service.ts`'s `seedAdminAccount` call, ask if you don't have it handy)

---

## 1. Public / Marketing Pages (no login)

- [ ] `/` — landing page loads. Hero renders a single real photo (no typewriter animation, no floating mockup cards). Teacher/School toggle pills switch content without any visual glitch (this was a fixed bug earlier — re-confirm it stays fixed). Header is transparent over the hero and turns solid/dark on scroll.
- [ ] Resize to mobile width (~375px) — hamburger menu appears in the header, opens and closes cleanly, no layout overflow.
- [ ] `/about` — loads, no broken images/links
- [ ] `/pricing` — loads, pricing figures shown make sense (dynamic from `SystemConfig`, not literally "undefined" or "NaN")
- [ ] `/help` — loads
- [ ] `/early-access` — loads, form (if present) doesn't error on submit
- [ ] `/terms` — loads, shows real content (admin-editable legal page, not a 404 or blank page)
- [ ] `/privacy-policy` — loads, shows real content
- [ ] Footer links on the landing page all resolve (no dead links)

## 2. Auth Pages (shared by Teacher + Recruiter)

- [ ] `/register` — centered single-column layout, top brand band (not old split-screen). Role toggle ("I'm a Teacher" / "I'm a School") switches correctly, both label states readable.
  - [ ] Fill the form as a **Teacher**, submit → redirected to `/otp-verify?email=...&sent=1` with a "DEV" OTP hint banner visible (dev-mode only)
  - [ ] Check the real inbox for the registered email — **since Gmail SMTP was just migrated live (D59), a real "Welcome to School Teacher — verify your email" mail should arrive.** Confirm it actually lands (not spam-swallowed), subject/branding correct, OTP code matches the DEV hint.
  - [ ] Enter the OTP → redirected to Teacher dashboard, logged in
  - [ ] Password field show/hide toggle (eye icon) actually toggles visibility
  - [ ] Try submitting with a weak password (<10 chars) — inline validation error, not a raw server error
  - [ ] Try registering the same email twice — clear "already exists" error, not a crash
  - [ ] Repeat registration as a **Recruiter/School** — same checks
- [ ] `/login` — email+password login works for both roles, redirects to the correct home per role (Teacher → `/dashboard`, Recruiter → `/recruiter/dashboard`)
  - [ ] "Forgot password?" link → `/forgot-password`
  - [ ] "Login with OTP" link → `/otp-verify`
  - [ ] "Continue with Google" button — role toggle shown next to it, clicking opens the real Google OAuth popup (not a dead button), completes login for a Google account
  - [ ] Wrong password → clear error message, not a raw 401 dump
- [ ] `/otp-verify` (direct visit, not via register) — step 1 asks for email, "Send OTP →" works, step 2 shows the 6-digit segmented input, "Resend code" respects the 60s cooldown (button disabled + countdown visible)
- [ ] `/forgot-password` — step 1 email → step 2 OTP + new password + confirm password, mismatched confirm-password shows inline error, successful reset redirects to `/login`
- [ ] `/reset-password` (if reachable as a standalone route) — same checks as above's step 2
- [ ] Logout (from wherever the logout control lives in the app header/menu) actually clears the session — after logout, visiting a protected route redirects to `/login`, not a blank/broken page

## 3. Teacher Role — Full Journey

Log in as Teacher for this whole section.

### 3.1 Dashboard (`/dashboard`)
- [ ] Loads with no console errors, shows something sensible for a brand-new account (empty states, not crashes)

### 3.2 Profile (`/profile`)
- [ ] Every field saves correctly: Full Name, Headline, WhatsApp Number, Age, Gender, Marital Status, Location search, **Current School / Institution**, **Employment Type**, Preferred Job Locations (add/remove chips)
- [ ] **Subjects / Specialisation** picker — opens, search works, selecting multiple subjects shows chips, labels are human-readable ("Mathematics" not "MATHEMATICS")
- [ ] **Degrees / Qualifications** picker — same check
- [ ] Years of Experience, Expected Salary, Availability, **Current / Highest Post Held** (was "Academics" before a rename this project — confirm it now shows post titles like "SGT"/"Principal", not university ranks)
- [ ] Available Timings toggle buttons — multi-select, visually indicate selected state
- [ ] **Subjects Willing to Cover (as Substitute)** picker
- [ ] "Registered with Teaching Council / Board" switch — toggling it on reveals the "Council / Board Name" field; toggling off hides it
- [ ] Skills (comma-separated), Bio — save correctly
- [ ] WhatsApp number "Verify" flow — enter a number, click Verify, OTP flow completes (or fails gracefully if WhatsApp isn't configured in this env)
- [ ] Resume upload (PDF) — file picker, upload progress, success state shows "Resume uploaded ✓" with a Replace button
- [ ] Intro Video upload (MP4/MOV, max 10MB) — same check
- [ ] "Save Profile" button — disabled when nothing changed, enabled after an edit, shows "Saving…" during submit, success toast after
- [ ] **Reload the page after saving — every field should show the saved values, not reset to blank** (this exact class of bug was found and fixed multiple times this project — D47, D50, D55 — so it's worth being paranoid here)

### 3.3 Browse & Apply for Jobs (`/jobs`, `/jobs/[id]`)
- [ ] `/jobs` list loads, search/filter controls work (if present), job cards show sensible info (title, school, city, salary)
- [ ] Click into a job → `/jobs/[id]` detail page: header card, highlights (experience/salary/role/positions), description, requirements list, "About the School" card
- [ ] "I'm Interested" button — submits an application with an optional cover note, shows a success state, and the job now shows "You've already applied" with the correct status label on revisit
- [ ] Apply to a job that's already at capacity or expired — button should be disabled/hidden, not silently fail

### 3.4 My Applications (`/applications`)
- [ ] Lists every job applied to, with correct status per application (Under review / Shortlisted / Hired / Closed — matching whatever `TEACHER_PAID_ENABLED` is currently set to)
- [ ] Clicking into an application (if it links somewhere) works

### 3.5 Chat (`/chat`)
**Needs a Recruiter to have shortlisted this Teacher on some application first — coordinate with your Recruiter test session (section 4.5).**
- [ ] Before shortlist: chat for that application is not accessible / shows a locked state, not a broken page
- [ ] After shortlist: chat opens, message list loads, typing and sending a message works, the message appears immediately (no page reload needed)
- [ ] Message sent by the Recruiter (from their session) appears on this side — confirm real-time delivery (Socket.IO), not just on manual refresh
- [ ] Send a very long message (near/over 2000 chars) — confirm the actual enforced limit, note whether the UI gives a clear character-limit warning before hitting the server error
- [ ] Try to send a file/image attachment — **expected to NOT be possible yet** (file uploads in chat are unbuilt, `DECISIONS.md` D39/Phase 4) — confirm there's at least no broken/dead UI control pretending to support it

### 3.6 Notifications (`/notifications`)
- [ ] Bell/notification icon in header shows an unread badge when there's something new
- [ ] List loads, marking as read works, links from a notification (e.g. "you were shortlisted") navigate to the right place

### 3.7 Settings (`/settings`)
- [ ] "Job Alerts" toggle saves correctly (this was a broken field-name bug fixed in D49 — re-confirm)
- [ ] Change Password flow (if this account has a password, not Google-only) — current + new + confirm, wrong current password rejected cleanly
- [ ] If this is a Google-only account, confirm it shows a "Set Password" flow instead (no current-password field) — per `DECISIONS.md` D41
- [ ] Account deactivation control, if present — **do not actually click it on a test account you need**, just confirm the confirm-dialog appears correctly

---

## 4. Recruiter/School Role — Full Journey

Log in as Recruiter for this whole section.

### 4.1 Dashboard (`/recruiter/dashboard`)
- [ ] Loads, shows sensible stats/links for a fresh account, links to School Profile / Post a Job work

### 4.2 School Profile (`/recruiter/school`)
- [ ] Every field saves: Name, Registration Number, Address/City/State/Pincode, Contact Phone/Email, Description, Website
- [ ] **Campus Facilities**, **No. of Classrooms**, **No. of Labs / Special Rooms**, **Total Student Capacity** — these are the fields renamed in D47 (were `hospitalInfra`/`hospitalStrength`/etc.) — confirm they save and reload correctly, this is exactly the class of bug found live-broken once already
- [ ] Departments picker (Subject-enum-based) — multi-select, human-readable labels
- [ ] Logo upload, School Photos upload (up to 3) — both work
- [ ] Accreditations picker
- [ ] Save → reload → values persist
- [ ] Verification status shown somewhere (Pending/Verified/Rejected) — a fresh school should show Pending

### 4.3 Post & Manage Jobs (`/recruiter/jobs`, `/recruiter/jobs/new`, `/recruiter/jobs/[id]/edit`)
- [ ] `/recruiter/jobs` — lists this school's posted jobs, status badges correct
- [ ] `/recruiter/jobs/new` — every field: Title, **Department** (Combobox, searchable), **Role** (Combobox, searchable), City/Location autocomplete, Positions, Description, Requirements, Experience range, Salary range, Shift timing (optional), Students per class (optional), **Department Requirements** (multi-select), **Specializations Required** (multi-select), Required Degree
- [ ] Submit — job appears in the list as ACTIVE (assuming free-tier quota not exhausted) or shows a clear "subscribe" prompt if the free-tier limit (2/month by default) is hit
- [ ] Edit an existing job (`/recruiter/jobs/[id]/edit`) — same fields pre-fill correctly with the job's current values, save works
- [ ] Delete a job (own job) — confirm dialog, deletion removes it from the list, and (if you have a Teacher account with an open application on it) confirm that teacher's application gets closed and they're notified

### 4.4 Applicants (`/recruiter/applicants`)
- [ ] Lists applicants across jobs (or per-job, depending on how this screen is scoped) — verify against what you saw in the Teacher's `/applications` list
- [ ] Click into an applicant — profile view shows: name, headline, location, experience, expertise/degrees chips (human-readable, not raw enum keys like `MATHEMATICS`), **Employment / Current School** fields (renamed in D50 — confirm not blank), **Current Post** (renamed from "Academics" in D50), Teaching Council Reg + Council/Board Name, availability, salary range, marital status, preferred locations, timings, subjects willing to cover, skills, bio, resume link
- [ ] "Shortlist" action — moves the application to Shortlisted, teacher gets notified
- [ ] Contact details (phone/email) — confirm they're hidden until the correct unlock state per whatever `TEACHER_PAID_ENABLED` is currently set to (SHORTLISTED if off, PAID if on)
- [ ] "Mark Won" action — **this exact action was completely broken under the default config until this project's E2E pass found and fixed it (D55) — this is the single most important check in this whole document.** Confirm it actually works: application moves to WON, the job's filled-positions count increments, and if that fills the last open position the job status flips to FILLED and any other open applications on it get auto-closed
- [ ] "Close/Decline" action — application moves to CLOSED, reason recorded, teacher notified

### 4.5 Chat (`/recruiter/chat`)
- [ ] Symmetric checks to Teacher section 3.5 — send/receive both directions, real-time delivery, correct unlock-state gating

### 4.6 Subscription (`/recruiter/subscription`)
- [ ] Shows current subscription status (none/active), and free-tier usage this month (X of 2 used, or whatever `FREE_TIER_JOB_LIMIT` is currently set to)
- [ ] "Subscribe" button — opens a real Razorpay checkout (if `RAZORPAY_KEY_ID` is configured) — **this needs actual test-mode Razorpay credentials and hasn't been exercised at all yet this project.** If you have test credentials, run a full test-mode payment through and confirm the subscription activates and unlimited posting unlocks. If pricing isn't configured in `SystemConfig` yet, confirm you get the clear "Admin must set this via Settings → Pricing" error, not a silent failure or crash.

### 4.7 Settings (`/recruiter/settings`)
- [ ] Recruiter profile fields (fullName, phone, designation) save correctly
- [ ] Password change / set-password flow, same checks as Teacher section 3.7

---

## 5. Admin Role — Full Journey

Log in as Admin (`info@bcognitrix.com` or `schoolteachermarketing@gmail.com`) for this whole section.

### 5.1 Dashboard (`/admin`)
- [ ] Stats load: total users, seekers, recruiters, schools, active jobs, pending schools, filled jobs, revenue figures — sanity-check the numbers against what you've actually created this session

### 5.2 Analytics (`/admin/analytics`)
- [ ] Loads without error, charts/graphs (if any) render with real data, not placeholder/broken

### 5.3 Users (`/admin/users`)
- [ ] List loads, search/filter by role/status/city/join-date work
- [ ] Click into a user — detail dialog shows the right profile shape for Teacher vs Recruiter, all fields populated correctly (same field-rename checks as section 4.4's applicant view — this dialog reuses the same underlying data)
- [ ] Soft-delete a (throwaway test) user — confirm dialog, user disappears from the default list, "Show deleted" toggle (if present) reveals it dimmed/marked, and that user genuinely cannot log in anymore
- [ ] Restore that user — reappears in the normal list, can log in again
- [ ] Export button (CSV) — downloads a file, spot-check it has real data not empty columns

### 5.4 Schools (`/admin/schools`)
- [ ] List loads, filter by verification status works
- [ ] Verify a pending school — status flips to Verified, recruiter gets notified (check their notifications/email)
- [ ] Reject a school with a reason — status flips to Rejected, reason visible somewhere

### 5.5 Jobs (`/admin/jobs`)
- [ ] List loads, filters (status/city/date range) work, export works
- [ ] "Disable" a job — confirm dialog, job status flips to Disabled by Admin, hidden from public listing, open applications on it get closed
- [ ] **"Delete" a job (new this session, D57)** — confirm dialog with the updated warning copy, job disappears from the admin list entirely, audit log shows a `JOB_DELETED` entry with correct before/after

### 5.6 Payments (`/admin/payments`)
- [ ] List loads, filters by kind/status/date work — even with zero real payments yet, confirm the empty state isn't broken

### 5.7 Pricing (`/admin/pricing`)
- [ ] Every price key shown, editable, saves correctly, respects min/unit metadata in the UI
- [ ] Set `RECRUITER_MONTHLY_PAISE` and `APPLICATION_FEE_PAISE` to real values here if they aren't already — needed before section 4.6's subscription checkout can work at all

### 5.8 Config / Settings (`/admin/config`)
- [ ] **Settings tab**: `SCHOOL_PAID_ENABLED`, `FREE_TIER_JOB_LIMIT`, `TEACHER_PAID_ENABLED`, `JOB_ALERT_RADIUS_KM` (renamed from a broken key this session, D55a), and **`JOB_LISTING_DURATION_DAYS`** (new this session, D58 — confirm it's editable here and that changing it actually changes new jobs' expiry, matching what was already curl-verified)
- [ ] Toggling `TEACHER_PAID_ENABLED` on, then re-running a shortlist→pay→won cycle as Teacher+Recruiter, confirms the config-aware paths (D44, D55) genuinely branch correctly in both states, not just the default one
- [ ] **Legal Pages tab**: edit Terms or Privacy Policy content, save, confirm `/terms` or `/privacy-policy` (public page) reflects the change
- [ ] **Email Templates tab**: list of 14 templates, edit one (e.g. toggle `isActive` off), save — confirm a partial update doesn't wipe the subject/body (this exact bug was found and fixed earlier this project). Toggle it back on.
- [ ] **API Keys tab**: confirm `GMAIL_USER`/`GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN` are listed and show as "set" (they're currently borrowed from RxJobs4U for testing — see the pending todo to replace them with EduHire's own before production). Confirm `BREVO_API_KEY` is gone from this list (it should never have been used and wasn't even in the whitelist, but double-check nothing references it in the UI).

### 5.9 Audit Log (`/admin/audit`)
- [ ] Every admin action taken during this whole checklist run should show up here with correct before/after — spot check a few (job delete, user restore, setting change)

### 5.10 Disputes (`/admin/disputes`)
- [ ] **Entirely untested this project so far.** Load the page, check for any existing disputes, and if there's a way to create a test dispute (may require a Teacher/Recruiter-side "raise a dispute" control that hasn't been located yet), run one through Open → Resolved/Rejected and confirm the requester gets notified.

---

## 6. Cross-Cutting Checks

- [ ] **Mobile responsiveness** — repeat at least the auth pages, one Teacher screen, and one Recruiter screen at ~375px width. Nothing should horizontally scroll or overlap.
- [ ] **Session expiry** — leave a tab logged in and idle past the 15-minute access-token TTL, then perform an action. The silent refresh-then-retry should kick in transparently (per `PROJECT_BLUEPRINT.md` §6) — you should NOT get logged out or see a raw 401.
- [ ] **Direct URL access without login** — try visiting `/dashboard`, `/recruiter/dashboard`, `/admin` directly in a fresh incognito tab with no session. Should redirect to `/login`, not show a blank page or leak data.
- [ ] **Wrong-role access** — while logged in as Teacher, try visiting `/recruiter/dashboard` or `/admin` directly. Should be blocked/redirected, not show the other role's UI.
- [ ] **Console errors** — did any screen in this whole checklist throw a red console error or an unhandled promise rejection? List them even if the UI "looked fine."

---

## 7. After this checklist

- [ ] File every bug found as a line in `DECISIONS.md`'s tail (or hand the list back for a fix pass) — don't lose track of anything found here the way earlier live-verification passes this project kept finding real, previously-unnoticed bugs.
- [ ] Once this checklist is clean, revisit the still-open items in `NewChatStartOff.md`: swap the borrowed Gmail credentials for EduHire's own account, remove `NEXT_PUBLIC_GOOGLE_CLIENT_SECRET`, and make the Phase 4 chat-attachments/message-length decisions if you want those before launch (not required — chat already works for text).
