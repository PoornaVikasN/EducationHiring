# BUG_PATTERNS.md — School Teacher

> **Lineage: inherited verbatim from RxJobs4U's Phase 3a–3f (June 2026).**
> Every one of these 35+ patterns emerged from real production or dev-loop pain
> in the sibling project. Same Node/Nest/Next/Mongoose stack, same libraries,
> same operating system — every pattern applies here from day 1.
>
> **Use as a pre-commit checklist.** If you're touching a related area, skim the
> relevant section. The whole point of copying this file over is to skip the
> months of pain the sibling project took to discover them.

---


## Backend Patterns

### BE-1 — Cookie path too narrow → refresh loop
**Root cause:** Refresh token cookie set with `path: '/api/auth/refresh'` instead of `path: '/'`.  
**Symptom:** Browser only sends the cookie on requests matching that exact path. Middleware/proxy can't read the session → redirects to `/login?next=<path>` → infinite loop.  
**Fix:** Always `path: '/'` on the refresh token cookie. See `BACKEND_GUIDE §6`.  
**Prevention:** After any auth cookie change, test page navigation (not just API calls).

---

### BE-2 — Two cookies after path change
**Root cause:** Changed cookie path without clearing the old one. Browser accumulates both cookies; server receives the blacklisted old-path token → 401.  
**Symptom:** Logout or refresh fails immediately after deploying a cookie-path change.  
**Fix:** `res.clearCookie(REFRESH_COOKIE, { path: '/api/auth/refresh' })` before setting the new `path: '/'` cookie.  
**Prevention:** In `issueTokens()`, always clear all known historical cookie paths before setting.

---

### BE-3 — `@Public()` missing on logout
**Root cause:** `JwtAuthGuard` is global. Without `@Public()`, an expired access token blocks the logout endpoint with 401.  
**Symptom:** User with expired token cannot log out; session is stuck.  
**Fix:** `@Public()` on every `logout` endpoint.  
**Prevention:** Any endpoint that should succeed regardless of auth state → check for `@Public()`.

---

### BE-4 — Mongoose duplicate index warning
**Root cause:** `@Prop({ index: true })` AND a separate `Schema.index({ field: 1 })` call for the same field. Creates two identical indexes.  
**Symptom:** Mongoose deprecation warning; Atlas may refuse to build the index.  
**Fix:** `@Prop({ index: true })` for single-field, `Schema.index()` for compound. Never mix both for the same field.  
**Prevention:** Review `Schema.index()` calls whenever adding `@Prop({ index: true })`.

---

### BE-5 — `findOneAndUpdate { new: true }` deprecated in Mongoose 9
**Root cause:** `new: true` is a Mongoose 6/7 option; Mongoose 9 expects `returnDocument: 'after'`.  
**Symptom:** Mongoose logs `"new is not a supported option"`; the returned document may be stale.  
**Fix:** Replace `{ new: true }` with `{ returnDocument: 'after' }` everywhere.  
**Prevention:** Global search-replace when porting any code written against Mongoose < 9.

---

### BE-6 — Basic SMTP password auth instead of Gmail OAuth2
**Root cause:** Basic username+password Gmail SMTP auth is blocked by Google for GSuite accounts in production.  
**Symptom:** Emails not delivered in prod; nodemailer silently fails or throws auth error.  
**Fix:** `EmailService` uses `nodemailer.createTransport({ service: 'gmail', auth: { type: 'OAuth2', user, clientId, clientSecret, refreshToken } })`. Credentials via `GMAIL_USER/CLIENT_ID/CLIENT_SECRET/REFRESH_TOKEN` env vars. Brevo was removed.  
**Prevention:** Never set `auth.pass` on the Gmail transport. Never add a static `GMAIL_ACCESS_TOKEN` (expires). nodemailer fetches fresh access tokens automatically via the refresh token.

---

### BE-7 — OTP keyed by email, field named `phoneHash`
**Root cause:** OTP collection was originally keyed by phone. The flow was switched to email-based, but the field name was kept to avoid a migration.  
**Symptom:** Code looks wrong (phone field stores email hash) but works correctly. Renaming breaks things.  
**Fix:** `phoneHash` = `SHA-256(email.toLowerCase())`. OTP endpoints accept `{ email }`. Do not rename without a migration.  
**Prevention:** Document this legacy field name in any code that touches the `otps` collection.

---

### BE-8 — DTO `@Max` too low for admin bulk fetch → empty charts
**Root cause:** Pagination DTO had `@Max(50)` on `limit`. Admin dashboard called `adminList({ limit: 100 })`. Backend returned 400; React Query stored `undefined`; charts showed "No data" silently.  
**Symptom:** Admin charts or tables show empty state with no error visible to the user.  
**Fix:** `@Max(200)` on all `limit` fields. Admin bulk-fetches legitimately need 100+.  
**Prevention:** Never set `@Max` below 200 on any `limit` field.

---

### BE-9 — New `NotificationKind` added but no `@OnEvent` handler wired
**Root cause:** Adding a value to the `NotificationKind` enum and emitting the event from a service does nothing without a matching `@OnEvent()` handler in `NotificationsService`.  
**Symptom:** Recruiter or admin gets zero notifications even though the emit code looks correct.  
**Fix:** Always add all three — enum value + `eventEmitter.emit('event.name', payload)` + `@OnEvent('event.name') async onXxx(payload) {...}` — as a trio.  
**Prevention:** When adding a `NotificationKind`, immediately write the handler before committing.

---

### BE-10 — Service has `@InjectModel(X.name)` but module missing `MongooseModule.forFeature`
**Root cause:** A service added a new model injection but the owning module's imports were not updated.  
**Symptom:** NestJS startup error: "Nest can't resolve dependencies of XService. Please make sure that the argument XModel at index [N] is available in the XModule context."  
**Fix:** `MongooseModule.forFeature([{ name: X.name, schema: XSchema }])` in the module's imports array must be added whenever a new `@InjectModel(X.name)` is added to the service constructor.  
**Prevention:** Code-review any constructor change that adds an `@InjectModel` — check the module immediately.

---

## Frontend Patterns

### FE-1 — `useEffect` with side-effect, no `useRef` guard → StrictMode double-fire
**Root cause:** React StrictMode mounts/unmounts/remounts in dev. Any `useEffect` that calls an API (email, OTP, payment) fires twice.  
**Symptom:** Two OTPs sent; first overwritten; user enters first code → "invalid OTP". Double API calls in dev.  
**Fix:**
```ts
const sentRef = useRef(false);
useEffect(() => {
  if (!condition || sentRef.current) return;
  sentRef.current = true;
  api.doSideEffect();
}, []);
```
**Prevention:** Any `useEffect` calling an API with a side-effect MUST have a `useRef` guard.

---

### FE-2 — AppHeader or layout returning `null` during auth hydration
**Root cause:** `if (!user) return null` in a header/layout causes the entire page shell to collapse during the brief window between `isLoading = false` and user state commitment.  
**Symptom:** Blank flash between page load and content appearing; layout jumps.  
**Fix:** Always return a minimal logo-only shell, never `null`. `AppHeader` implements this pattern — copy it.  
**Prevention:** Grep for `if (!user) return null` or `if (!user) return <></>` in any layout or header component.

---

### FE-3 — Missing shadcn CSS tokens → Button renders as plain text
**Root cause:** Tailwind 4 shadcn-style primitives rely on CSS variables like `--color-primary`, `--color-ring`, `--color-border`. If `globals.css` doesn't include these, `bg-primary` resolves to nothing.  
**Symptom:** Buttons appear as unstyled text links; inputs have no border.  
**Fix:** Copy the full `@theme inline { ... }` token block from `FRONTEND_GUIDE.md §2` into `globals.css` of any new frontend project.  
**Prevention:** After scaffolding any new Next.js app, immediately verify a Button renders correctly before writing any pages.

---

### FE-4 — Zod v4 optional number + react-hook-form Resolver type error
**Root cause:** `z.number().optional()` produces `number | undefined` in Zod v4. `@hookform/resolvers` v5 + react-hook-form 7.73+ has a stricter structural `Resolver<T>` that rejects `number | undefined` for numeric fields.  
**Symptom:** TS build error: *"Two different types with this name exist, but they are unrelated. Type 'number | undefined' is not assignable to type 'number'."* Only appears at `tsc` / `next build`, not in dev.  
**Fix:**
```ts
import { useForm, type Resolver } from 'react-hook-form';
resolver: zodResolver(mySchema) as Resolver<MyFormValues>
```
**Prevention:** Any form with optional number fields needs this cast. No runtime impact.

---

### FE-5 — `Uint8Array<ArrayBufferLike>` not assignable to `BufferSource`
**Root cause:** `PushManager.subscribe({ applicationServerKey })` expects `BufferSource` = `ArrayBuffer | ArrayBufferView`. In strict TypeScript, `Uint8Array<ArrayBufferLike>` is not assignable.  
**Symptom:** TS compile error in Web Push key conversion utility.  
**Fix:** Return `outputArray.buffer` (an `ArrayBuffer`) from `urlBase64ToUint8Array`, not the `Uint8Array` itself.  
**Prevention:** Type the return of any VAPID key utility as `ArrayBuffer`, not `Uint8Array`.

---

### FE-6 — Firebase/FCM installed for browser push (wrong package)
**Root cause:** Firebase is not needed for browser push notifications. The native Web Push API + VAPID keys cover all modern browsers.  
**Symptom:** Large dependency added; Firebase project + service account required; much more configuration overhead than needed.  
**Fix:** Backend: `npm install web-push`. Frontend: native `navigator.serviceWorker` + `PushManager` APIs — no extra package.  
**Prevention:** Never install `firebase` or `firebase-admin` for push notification purposes.

---

### FE-7 — Route-level redirect for nav restriction instead of UI-level disabled element
**Root cause:** Preventing unverified hospital recruiters from accessing pages was implemented as a page-level redirect (render page → check state → `router.push('/allowed-page')`). Wastes a render + API call.  
**Symptom:** Brief flash of restricted page content before redirect; unnecessary network requests.  
**Fix:** Render nav items as disabled `<span>` with `cursor-not-allowed` and a `title` tooltip. See `AppHeader.isNavDisabled()`.  
**Prevention:** For nav-level access control, always use disabled UI elements. Reserve page-level redirects for middleware role enforcement.

---

### FE-8 — `useQuery` / hook called after early return → Rules of Hooks violation
**Root cause:** A `useQuery` or any hook declared after a conditional early return (`if (isLoading) return …` or `if (!data) return …`) violates React's Rules of Hooks. React tracks hooks by call order per render; an early return causes a different number of hooks to fire on subsequent renders.  
**Symptom:** React runtime error: *"Rendered more hooks than during the previous render"*. Typically surfaces when the page transitions from loading→loaded or empty→populated state (e.g. SOS job detail on first navigation).  
**Fix:** Move every `useState`, `useQuery`, `useMutation`, and derived-value computation to **before** the first early return. Use `enabled: condition` on `useQuery` calls that should not fire during certain states instead of moving the call below a guard.  
**Prevention:** Before adding any early return to a component, scan below it for hooks. There must be zero hooks after any `return` statement.

---

### FE-9 — Salary stored as monthly rupees, displayed with paise-conversion helper
**Root cause:** Job `salaryMin` / `salaryMax` fields store integer **rupees-per-month** (e.g. `30000` for ₹30,000/mo). The shared `formatRupees(paise)` helper divides its argument by 100 (designed for paise inputs). Passing monthly rupees to it displays a salary 100× too small (₹300 instead of ₹30,000).  
**Symptom:** Salary on job cards and job detail page shows ₹200–₹400 instead of ₹20,000–₹40,000. No TS error — both are `number`.  
**Fix:** Use the `formatLpa(minRupees, maxRupees)` helper which converts monthly rupees → LPA (`min * 12 / 100_000`). Display as "₹X.X–Y.Y LPA" everywhere. Never pass salary fields to `formatRupees()`.  
**Prevention:** When displaying any money value, verify whether the field stores paise or rupees before choosing a helper. Only payment/fee fields (APPLICATION_FEE, BOOST, etc.) are in paise. Job salary fields are in monthly rupees.

---

### FE-10 — Populated reference field vs raw ID in URL (`app.jobId` vs `app.job._id`)
**Root cause:** When Mongoose populates a reference (e.g. `populate('jobId')`), the original string field may become the populated document while the raw string value is no longer directly accessible. On the frontend, using `app.jobId` (expected string) when the API returns a populated `app.job` object produces `undefined` → URLs like `/jobs/undefined`.  
**Symptom:** Clicking a job link navigates to `/jobs/undefined`. The job sub-object is fully populated and visible, but the string ID field is `undefined`.  
**Fix:** Use the populated sub-document's `_id`: `app.job?._id`. Never rely on the raw reference field name when the API is known to populate that field.  
**Prevention:** In frontend API types, when a field can be either an ID string OR a populated object (depending on the endpoint), model it as the populated object type and access `._id`. Do not model it as `string` if it's always populated.

---

## Cross-Cutting Patterns

### X-1 — Shared enum/constant defined in only one app
**Root cause:** `rxjobs4u-backend/src/shared/` is the canonical source. If FE uses the enum without mirroring it to `rxjobs4u-frontend/lib/shared/`, runtime errors occur (or wrong string values are sent to the API).  
**Symptom:** Frontend sends an enum value the backend rejects; or FE and BE use different string values for the same concept.  
**Fix:** Any time a new enum value is added to the BE, immediately mirror it to the FE. Add `// Mirrored from rxjobs4u-backend/src/shared/enums/index.ts` comment.  
**Prevention:** When adding any `NotificationKind`, `JobStatus`, `ApplicationState`, etc. to the BE enum, open the FE file in the same commit.

---

### X-2 — Admin and recruiter notification flows assumed, never explicitly wired
**Root cause:** Seeker notifications were implemented first; recruiter and admin notification handlers were assumed to "just work" because enum values were defined.  
**Symptom:** Seekers receive all notifications; recruiters get zero; admins get zero. No error — events are emitted and silently dropped.  
**Fix:** Explicitly implement `@OnEvent()` handlers for every user role. Recruiter-facing: `NEW_INTEREST`, `APPLICANT_PAID`, `JOB_FILLED`, `HOSPITAL_VERIFIED`, etc. Admin-facing: `HOSPITAL_REGISTERED`.  
**Prevention:** When building any flow that should notify a non-seeker role, immediately verify with a logged-in recruiter or admin account before marking the feature done.

---

### X-3 — Local repo env files (`.env.local` / `.env.production`) drift from what's actually deployed on the VPS
**Root cause:** `rxjobs4u-frontend/.env.production` in the local git checkout has stale/placeholder values (`NEXT_PUBLIC_API_URL=https://www.rxjobs.com/api` — wrong domain, should be `rxjobs4u.com`; `NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_XXXXXXXX` — a literal placeholder; `NEXT_PUBLIC_RECAPTCHA_SITE_KEY=` — empty). None of these match observed live behavior (site correctly calls `api.rxjobs4u.com`, reCAPTCHA verifies with a real score), confirming the actual files on the VPS have been hand-corrected independently and were never synced back into this local checkout. Also found `NEXT_PUBLIC_GOOGLE_CLIENT_SECRET` set in `.env.local` — unused anywhere in the FE codebase (grepped, zero references) and shouldn't be `NEXT_PUBLIC_`-prefixed even if it were used, since that inlines it into the client bundle.
**Symptom:** No live symptom today (VPS copies are correct) — but rebuilding/redeploying the frontend from this exact local checkout without first reconciling these files would silently push the wrong API domain, a fake Razorpay key, and a blank reCAPTCHA key to production.
**Fix:** None applied — confirmed with the user that the VPS's real `.env.local`/`.env.production` are correct. No code or file change made.
**Rule:** Before any frontend redeploy that touches env files, diff the local checkout's `.env.production`/`.env.local` against what's actually on the VPS (`cat` over SSH) rather than assuming they're in sync — these files are typically gitignored and can silently diverge over time as one side gets hand-edited. Also: never prefix a real secret (OAuth client secret, API secret key) with `NEXT_PUBLIC_` — that inlines it into the shipped client JS regardless of whether it's actually used.

---

---

## Backend Patterns (continued)

### BE-11 — Suspended / deleted user not blocked at JWT validate
**Root cause:** `JwtStrategy.validate()` was synchronous and only decoded the token payload — never checked MongoDB for `isActive` or `deletedAt`. A suspended user who still had a valid access token could continue making API calls until that token expired (15 min window).  
**Symptom:** Admin suspends a user; the user's in-flight requests succeed for up to 15 minutes.  
**Fix:** Make `validate()` async — query `userModel.findOne({ _id: payload.sub, isActive: true, deletedAt: null })`. Throw `UnauthorizedException` if not found.  
**Prevention:** Any time a user's status can change (suspend, delete, deactivate), verify that `JwtStrategy.validate()` gates on that status synchronously per-request.

---

### BE-12 — Job delete/disable does not cascade-close active applications
**Root cause:** `jobs.service.remove()` and `adminDisableJob()` soft-deleted the job but left `Application` docs in `INTERESTED`, `SHORTLISTED`, or `PAID` state orphaned — pointing at a job that no longer exists.  
**Symptom:** Seekers see applications stuck in active states for deleted/disabled jobs; no notification; misleading dashboard counts.  
**Fix:** After soft-deleting a job, run `appModel.updateMany({ jobId, state: { $in: [INTERESTED, SHORTLISTED, PAID] } }, { $set: { state: CLOSED, decisionReason: '...', decisionAt: now } })` then emit `application.closed` for each affected seeker.  
**Prevention:** Any service that changes job status (delete, admin-disable, account-deactivate cascade) must also cascade-close active applications and emit per-seeker events.

---

## Frontend Patterns (continued)

### FE-11 — OTP verify page skips email collection
**Root cause:** `otp-verify/page.tsx` was designed assuming `?email=` is always present in the URL (registration flow passes `?email=xxx&sent=1`). The login page linked directly to `/otp-verify` with no query param, so `prefillEmail` was empty. The page rendered the OTP code field with "your email" as placeholder and called `sendOtp('')` — sending to nothing.  
**Symptom:** User clicks "Use email OTP" on login → lands on OTP verify with no email field, code field shown with wrong description.  
**Fix:** Two-step state machine in `otp-verify/page.tsx`: step 1 (email form + "Send OTP →" button) when `prefillEmail` is absent; step 2 (OTP code entry + "Change" link) always. Registration flow (`?email=xxx`) still skips step 1.  
**Prevention:** Any OTP verify page must handle the case where email is not known from URL. Two-step approach is the canonical pattern.

---

### FE-12 — Gradient text on dark background renders as solid block
**Root cause:** Gradient text requires all four CSS properties together: `background`, `WebkitBackgroundClip: 'text'`, `WebkitTextFillColor: 'transparent'`, `backgroundClip: 'text'`, AND `color: 'transparent'`. Missing the last one leaves the element's CSS `color` property as white/inherited — the browser uses the solid color as the fallback, ignoring the gradient clip.  
**Symptom:** Text element shows a solid colored block instead of gradient-clipped text. Adding Tailwind `text-white` class on the parent makes it worse.  
**Fix:** All five style properties must be on the **same element**:
```jsx
<span style={{ background: 'linear-gradient(...)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', color: 'transparent' }}>
  text
</span>
```
**Prevention:** Never add `text-white` / `text-*` Tailwind class on a parent when a child uses gradient-clip text — the inherited `color` fights the `WebkitTextFillColor`. Always put all five properties on the same element.

---

---

### BE-13 — `user.save()` triggers 2dsphere geo-index failure (Mongoose nested schema defaults)
**Root cause:** `coordinates: { type: [Number] }` in a Mongoose nested schema has an implicit default of `[]`. When Mongoose loads a user whose `seekerProfile.location` is absent from the DB, it initialises `seekerProfile.location = { coordinates: [] }` in memory. Any subsequent `user.save()` writes this invalid GeoJSON to MongoDB, which the 2dsphere sparse index rejects with `MongoServerError: Can't extract geo keys — unknown GeoJSON type: { coordinates: [] }`.  
**Symptom:** HTTP 500 on any endpoint that calls `user.save()` for a seeker — even completely unrelated saves (password reset, OTP verify, SOS subscription). The geo field doesn't even need to be in the `$set`.  
**Fix:** Replace all `user.save()` with `userModel.findByIdAndUpdate(user._id, { $set: { specificField: value } }).exec()`. A targeted `$set` only writes the named fields and never triggers geo-index re-evaluation on unchanged fields.  
**Files fixed:** `auth.service.ts` (emailVerified, googleId, passwordHash), `payments.service.ts` (seekerSosSubscribedUntil).  
**Prevention:** Never call `.save()` on a Mongoose document that has a 2dsphere-indexed nested schema. Always use `findByIdAndUpdate($set)` for field-level updates.

---

### FE-13 — Auth context is plain useState — `invalidateQueries(['auth-user'])` does nothing
**Root cause:** `AuthContext` stores the current user in React `useState`, not in TanStack Query. Calling `queryClient.invalidateQueries({ queryKey: ['auth-user'] })` only refreshes the Query cache — it never reaches the context state. The UI never re-renders with changed user fields.  
**Symptom:** After SOS subscription payment, the "SOS access is active" banner doesn't appear. User must hard-refresh. The `seekerSosSubscribedUntil` field on the auth user object is stale.  
**Fix:** After any mutation that changes the current user's own data: `const { data: freshUser } = await authApi.getMe(); updateUser(freshUser);` (from `useAuth()`).  
**Prevention:** Whenever writing a payment or profile-update success handler, ask "does this change the logged-in user object?" If yes, call `getMe` + `updateUser`.

---

### FE-14 — Query key mismatch between mutation invalidation and active queries
**Root cause:** Multiple components/pages fetch overlapping data with different query keys (e.g. `['recruiter-jobs']`, `['recruiter-jobs-list']`, `['recruiter-jobs-summary']`). Invalidating only one key leaves the others serving stale data.  
**Symptom:** After Mark Hired / Shortlist / Decline, the position count in the applicants page job selector and the recruiter dashboard stats remain stale. Data only updates on hard refresh.  
**Fix:** Extract an `invalidateAll()` helper listing every related query key, and call it from all mutation `onSuccess` handlers in the feature.  
**Prevention:** Before writing mutation `onSuccess`, grep for all query keys that read from the same backend data. Invalidate all of them together.

---

### BE-14 — Soft-deleted user triggers E11000 on Google auth or re-register
**Root cause:** `googleAuth()` and `register()` in `auth.service.ts` both query with `{ ..., deletedAt: null }` to find an existing user. A soft-deleted user (admin deleted, `deletedAt` set) is not found. The code proceeds to `userModel.create()` with the same email — which hits the unique email index and throws `MongoServerError E11000 duplicate key`, surfaced to the client as an unhandled HTTP 500.  
**Symptom:** Deleted user tries to sign in with Google or re-register → browser sees `{"statusCode":500,"message":"E11000 duplicate key error ..."}` instead of a meaningful error. The real cause (account removed) is invisible.  
**Fix:** After the `deletedAt: null` query returns null, run a second check: `findOne({ email, deletedAt: { $ne: null } })`. If found, throw a clean `401 UnauthorizedException` ("This account has been removed. Please contact support.") or `409 ConflictException` for register. Never let `create()` run when a soft-deleted record exists for the same unique key.  
**Prevention:** Any `create()` call that is gated by a `deletedAt: null` existence check is at risk. Add the soft-deleted conflict check wherever `userModel.create()` is preceded by a "not found" branch.

---

### BE-15 — Mongoose `string | null` union type on `@Prop` → `CannotDetermineTypeError` at startup
**Root cause:** Mongoose uses `reflect-metadata` to infer the schema type from TypeScript type annotations. It cannot resolve a union type like `string | null` — only scalar types like `String`, `Number`, `Boolean` are resolvable. NestJS throws `CannotDetermineTypeError` at startup; `tsc` compiles fine, so the crash is runtime-only.  
**Symptom:** Server fails to start with `Error: Cannot determine a type for the "X.field" field (union/intersection types are not supported).` TypeScript shows no errors.  
**Fix:** Add explicit `type: String` (or `type: Number`, etc.) to the `@Prop` decorator: `@Prop({ type: String, default: null }) field!: string | null`.  
**Prevention:** Every nullable schema field must have the explicit `type:` in `@Prop`. Convention: `@Prop({ type: String, default: null }) field!: string | null` — the TS union type documents intent; the decorator `type:` satisfies Mongoose.

---

### FE-15 — React `useEffect` fires after paint — role layout children flash before redirect
**Root cause:** `useEffect` is scheduled after the browser paints the committed DOM. For one frame, the wrong-role layout (seeker layout for an admin, recruiter layout for a seeker) renders its children before the redirect effect fires. On fast connections this is a visible flash; on slow ones it's a brief wrong-page render.  
**Symptom:** Logging in as admin after being logged in as recruiter briefly shows the recruiter dashboard before snapping to admin. The `useEffect` redirect is correct but fires too late.  
**Fix:** Add a render-path guard IN ADDITION to the `useEffect`:
```tsx
useEffect(() => {
  if (isLoading) return;
  if (!user) { router.replace('/login'); return; }
  if (user.role !== Role.X) { router.replace('...'); return; }
}, [user, isLoading, router]);

if (isLoading || !user || user.role !== Role.X) return <Spinner />;
return <>{children}</>;
```
The `useEffect` triggers navigation; the render guard blocks the wrong children from painting at all.  
**Prevention:** Every role-gated layout must have both a `useEffect` redirect AND a render-path spinner guard checking the same conditions.

---

### FE-16 — `router.push('/login')` on logout creates a back-navigable history entry
**Root cause:** `router.push('/login')` adds `/login` on top of the browser history stack. After logout, pressing Back navigates back to the protected route URL. The page then tries to mount, the edge guard (proxy.ts) redirects to `/login` — creating a confusing redirect loop or, if the cookie was already cleared, a flash of the protected shell.  
**Symptom:** User logs out, presses browser Back → navigates to a protected dashboard URL.  
**Fix:** Use `window.location.replace('/login')` for all security-initiated redirects. `replace()` overwrites the current history entry so Back goes to whatever was before the protected page, not back into the app.  
**Prevention:** Never use `router.push` or `router.replace` (Next.js client-side) for logout/auth-failure redirects. Use `window.location.replace` for hard navigations that should break the history stack.

---

### FE-17 — Missing `queryClient.clear()` on logout causes cross-session stale data
**Root cause:** React Query persists its in-memory cache across SPA navigations. If a recruiter logs out and an admin logs in on the same tab, the admin's first render shows the recruiter's cached data (hospital profile, job list, etc.) until refetch completes. Visually, the wrong user's data appears briefly or, worse, stays until manual refresh.  
**Symptom:** After role switch (logout + login as different role), dashboard shows previous user's data for 1–2 seconds.  
**Fix:** Call `queryClient.clear()` in the logout handler before navigating: `await logout().catch(() => {}); queryClient.clear(); window.location.replace('/login');`.  
**Prevention:** Every logout path (manual, forced by auth guard, session expiry) must call `queryClient.clear()` before or immediately after clearing auth state.

---

### FE-15 — Dashboard "open vacancies" stat ignores `filledPositions`
**Root cause:** `openVacancies = activeJobs.reduce((sum, j) => sum + (j.openPositions ?? 1), 0)` sums total slots. It never subtracts `filledPositions`, so marking a candidate as hired never decrements the stat.  
**Symptom:** "Open Vacancies" stat card and bar chart always show the original total positions even after hires. Dashboard is misleading.  
**Fix:** `openVacancies = activeJobs.reduce((sum, j) => sum + Math.max(0, (j.openPositions ?? 1) - (j.filledPositions ?? 0)), 0)`. Apply the same formula to per-job bar/progress labels (show `remaining/total`).  
**Prevention:** Any stat labeled "open" or "remaining" must always be `total - filled`, never just `total`.

---

## Phase 3e patterns (2026-06-23)

### BE-14 — Mongoose 9 inline nested-path doesn't accept `default`
**Problem:** Defining a GeoJSON location inline as
```ts
@Prop({
  type: { type: { type: String, enum: ['Point'] }, coordinates: { type: [Number] } },
  default: null,            // ← Mongoose 9 throws TypeError at schema-build
})
location?: ...;
```
crashes Mongoose at boot with `Invalid value for schema path 'location.default', got value "null"`.
Same crash with `default: undefined`. The inline object is interpreted as a nested-path
definition, and nested paths don't accept `default`.
**Fix:** Use a proper `@Schema({_id:false})` sub-class (same pattern as
`Job.LocationSchema`):
```ts
@Schema({ _id: false })
class LocationSchema {
  @Prop({ type: String, enum: ['Point'], default: 'Point' }) type!: string;
  @Prop({ type: [Number], required: true }) coordinates!: [number, number];
}
const LocationSubSchema = SchemaFactory.createForClass(LocationSchema);
// in the parent:
@Prop({ type: LocationSubSchema, default: null })
location?: LocationSchema | null;
```
Sub-document type accepts `default: null` cleanly. The 2dsphere index treats `null`
as missing.
**Rule:** Any geo field on a Mongoose 9 schema must use a sub-Schema class. Never inline.

### BE-15 — Cross-site refresh cookie blocked when `Domain` doesn't match host
**Problem:** Login succeeds (200, `Set-Cookie` on the response) but the next
`/auth/refresh` has no cookie and the FE middleware bounces back to `/login`. Two
flavours:
1. Prod with subdomain split (`rxjobs4u.com` ↔ `api.rxjobs4u.com`): `Set-Cookie`
   without a `Domain` attribute scopes the cookie to `api.rxjobs4u.com` only; the
   FE host can't see it.
2. Local dev with a stale `COOKIE_DOMAIN=.rxjobs4u.com` in `.env`: cookie's `Domain`
   doesn't match the response host (`localhost`) → browser silently rejects.
**Fix:** Set `COOKIE_DOMAIN=.<eTLD+1>` ONLY in prod. **Local `.env` must keep
`COOKIE_DOMAIN` blank** so the cookie defaults to the actual response host.
**Rule:** Don't share `.env` literally between local and prod. `COOKIE_DOMAIN` is
the canonical "split me by environment" var.

### BE-16 — `formatLpa()` mis-annualises paise inputs
**Problem:** `formatLpa(salaryMin, salaryMax)` assumes input is **monthly rupees**
(`min * 12 / 100_000` → LPA). For SOS jobs we auto-derive
`salaryMin = salaryMax = feeAmount` where `feeAmount` is in **paise**. So a ₹20,000
shift fee (2,000,000 paise) gets rendered as "₹240 LPA" — a 1200× error.
**Fix:** Any SOS view branch must use `sosFeeDisplay()` from
`lib/utils/jobs-display.ts` (returns formatted rupees, flat amount) instead of
`formatLpa()`.
**Rule:** `formatLpa()` is for monthly rupees only. SOS fees go through `sosFeeDisplay()`.

### BE-17 — Hardcoded outbound URLs leak wrong TLD
**Problem:** `https://rxjobs4u.in/jobs/<id>` was hardcoded in two BE places (email
button link, WhatsApp template URL) and three FE places (help-page support /
noreply emails). Production domain is `rxjobs4u.com` — every alert link 404'd.
Found only via repo-wide `grep rxjobs4u\.in`.
**Fix:** All BE outbound user-facing links go through `PUBLIC_FRONTEND_URL` env
(`config.get<string>('PUBLIC_FRONTEND_URL', 'https://rxjobs4u.com')`).
**Rule:** No hardcoded FE domain anywhere in BE. Hostname literals are an
anti-pattern; repo grep should return zero matches outside `env.validation.ts`.

### FE-16 — One-form discriminated union → cast hell on `errors.field`
**Problem:** A single `useForm<CreateJobFormValues>()` where the schema is
`z.discriminatedUnion('type', [sosSchema, ftSchema])` makes `errors.salaryMin`
type-error because TS can't narrow the union without runtime checks.
**Fix:** Use **two `useForm` instances** with separate schemas, and branch which
one renders based on local `type` state. Each child has its own
`useForm<CreateSosJobFormValues>` / `useForm<CreateFullTimeJobFormValues>` with the
relevant Zod schema as resolver. Zero casts at the call sites.
**Rule:** Discriminated forms = discriminated `useForm` instances.

---

---

## Phase 3f patterns (2026-07-04)

### BE-18 — WebSocket gateway crash: partial optional chaining on `server.sockets.adapter.rooms`
**Problem:** `this.server?.sockets.adapter.rooms.get(...)` guards only the first access. During NestJS startup (before Socket.IO bootstraps), `sockets.adapter` is `undefined`, causing `TypeError: Cannot read properties of undefined (reading 'rooms')`.
**Fix:** Full chain: `this.server?.sockets?.adapter?.rooms?.get(`user:${userId}`)?.size ?? 0`.
**Rule:** Any `@WebSocketServer() server` access chain must use optional chaining on every property — `sockets`, `adapter`, `rooms` — not just the root.

---

### BE-19 — Hospital rejection does not cascade to active jobs
**Problem:** `admin.service.ts rejectHospital()` changed hospital `status` to `REJECTED` but left all `ACTIVE` jobs visible. Seekers continued seeing jobs for a rejected hospital; seekers browsing jobs could still apply.
**Fix:** After updating the hospital, run `jobModel.updateMany({ hospitalId, status: JobStatus.ACTIVE, deletedAt: null }, { $set: { status: JobStatus.DISABLED_BY_ADMIN } })`.
**Rule:** Any status-change on a Hospital (reject, suspend, delete) must cascade `DISABLED_BY_ADMIN` to all its `ACTIVE` jobs in the same service method.

---

### BE-20 — SOS subscription two-path race: webhook marks PAID before fulfill, client verify early-returns
**Problem:** Razorpay webhook flow: `handleWebhook()` marks payment `PAID` first (atomically), then calls `fulfill()` which writes `seekerSosSubscribedUntil`. If `fulfill()` fails silently (e.g. network error, unhandled exception), the payment is PAID but the user has no subscription. The client-confirm path `verifySeekerSosSub()` then finds `status === PAID` and returns early with "Already activated" — never writing `seekerSosSubscribedUntil`.
**Fix:** Remove the early-return-on-PAID guard in `verifySeekerSosSub()`. Always write `seekerSosSubscribedUntil` regardless of prior payment status. Gate event emission only on `alreadyPaid` flag (to avoid duplicate emails). Both webhook path and client-verify path now act as idempotent safety nets.
**Rule:** The webhook-confirm and client-verify paths for payment fulfillment must both be idempotent and both write the fulfillment field. Never use an early return that skips the field write.

---

### BE-21 — Wylto WhatsApp URL-button template requires `buttons` parameter
**Problem:** `verify_account` template has a URL button whose parameter must be supplied at send-time. Calling `POST /api/v1/wa/send` without a `buttons` array returns Meta error `#131008: Required parameter is missing, buttons: Button at index 0 of type Url requires a parameter`. The message is not delivered.
**Fix:** Always include `buttons: [{ index: 0, type: 'url', text: '<domain>' }]` in the template object alongside the `body` array when sending `verify_account`.
**Rule:** Any Wylto template that has a URL button component requires a corresponding entry in the `buttons` array. Check the template definition in Wylto dashboard when integrating a new template — if it has a URL button, the call site must supply `buttons`.

---

### BE-22 — Admin dashboard stats never invalidated after user mutations
**Problem:** After the admin deleted/suspended/activated/restored/created a user in `app/admin/users/page.tsx`, the Admin Dashboard (`/admin`) and Analytics page (`/admin/analytics`) kept showing stale `totalUsers`/`totalSeekers`/`totalRecruiters`/`totalHospitals` counts — appearing as if deletions "didn't take." Root cause: all five mutations (`suspendMutation`, `activateMutation`, `deleteMutation`, `restoreMutation`, and the create-user dialog's `onSuccess`) invalidated only `['admin-users']`, never `['admin-stats']` — even though `app/admin/jobs/page.tsx` and `app/admin/hospitals/page.tsx` already invalidate `['admin-stats']` after their own mutations. With the 30s global TanStack Query `staleTime` (`common-components/providers.tsx`), the dashboard only self-corrected after a stale-cache lapse or a hard refresh. Separately, `getDashboardStats()` in `admin.service.ts` computed `activeJobs`/`sosActiveJobs`/`fullTimeActiveJobs`/`filledJobs` without a `deletedAt: null` filter (unlike the correctly-filtered user/hospital counts) — masked today only because the delete-user cascade flips a deleted hospital's jobs to `AUTO_DISABLED`, but not guaranteed for every future soft-delete path.
**Fix:** Added `qc.invalidateQueries({ queryKey: ['admin-stats'] })` to all five mutations in `app/admin/users/page.tsx`. Added `deletedAt: null` to the four job-status count queries in `getDashboardStats()`.
**Rule:** Any mutation that changes a User/Hospital/Job's `deletedAt`/`isActive`/`status` field and lives on an admin list page must invalidate **both** its own list query key and `['admin-stats']` — the dashboard and analytics screens share that one cache key. Any new `countDocuments`/`aggregate` added to `getDashboardStats()` must filter `deletedAt: null` even if a cascade currently makes it redundant.
**Note (verified, not a bug):** Recruiter dashboard (`jobsApi.myJobs`) intentionally keeps closed/`AUTO_DISABLED` jobs visible — the recruiter's "delete" action is actually a "close" action and correctly invalidates `['recruiter-jobs-summary']`. JobSeeker dashboard queries (`jobsApi.list`, `applicationsApi.myApplications`) are scoped to the seeker's own/public live data and already filter `deletedAt: null`. Restoring a user brings back user/hospital counts immediately but jobs stay `AUTO_DISABLED` (recruiter must manually reactivate) and applications/subscriptions are never restored — all by design.

---

### BE-23 — Production backend running with `NODE_ENV=development`
**Problem:** After a MongoDB credential rotation + restart, the backend's `.env` had no `NODE_ENV` value (defaults to `'development'` per `env.validation.ts:25`). This silently disabled five separate production-hardening gates simultaneously, all keyed off the same variable: reCAPTCHA verification skipped entirely (`recaptcha.service.ts:17-19` — logged `DEBUG: reCAPTCHA skipped`), refresh-token cookie missing `Secure` flag (`auth.service.ts:478`), raw exception details potentially leaking to API clients instead of a generic message (`all-exceptions.filter.ts:45`), pino logging stuck at verbose `debug` level with human-readable `pino-pretty` transport instead of `info`-level structured JSON (`logger.config.ts:16-28`), and required-in-production env-var validation (`CORS_ORIGINS` etc., `env.validation.ts`) silently skipped instead of failing boot on a missing secret.
**Fix:** Set `NODE_ENV=production` explicitly in the backend's `.env` on the VPS, restart via pm2. No code change — confirmed by the log line flipping from `DEBUG: reCAPTCHA skipped` to `INFO: reCAPTCHA verify action=login success=true score=0.9`.
**Rule:** Whenever the backend `.env` is touched for any reason (credential rotation, new deploy, restore from backup), explicitly verify `NODE_ENV=production` is present — it isn't validated as "required" today (`env.validation.ts:25` has a default), so a missing value fails silently rather than refusing to boot. Consider making `NODE_ENV` a hard-required var with no default, or adding an `OnApplicationBootstrap` warning log if it's not `'production'` outside of local dev, so this can't regress unnoticed again.

---

*Last updated: 2026-07-05 (41 patterns — BE: 23, FE: 16, X: 3). Add new patterns here as they're discovered; also update `memory/feedback_phase3a_bug_patterns.md` and the relevant guide's bug-prevention section.*
