# FRONTEND_GUIDE.md — School Teacher Web (`eduhire-frontend/`)

> Standards for the Next.js app. Tokens, patterns, and Do/Don't.
> Domain rules live in `PROJECT_BLUEPRINT.md`. Read that first if you're new.
> Reusable building blocks already in the repo are catalogued in `REUSABLE_FILE_GUIDE_FRONTEND.md`.

---

## 1. Stack

| Concern | Tool | Notes |
|---|---|---|
| Framework | **Next.js 16** App Router (Turbopack) | RSC-first; `'use client'` only when needed. **APIs differ from older Next versions** — see `eduhire-frontend/AGENTS.md` and `node_modules/next/dist/docs/` before guessing. |
| Runtime | **React 19** | Latest stable; `useRef<T>(initial)` requires an explicit initial value under strict mode. |
| Styling | **Tailwind 4** | CSS-first config via `@theme inline { ... }` in `app/globals.css`. **No `tailwind.config.ts`** — that's Tailwind 3 syntax. |
| Components | shadcn-style primitives in `common-components/ui/` | 33 keepers + radix peers installed. `data-table.tsx` not present yet — Phase 3 will add via TanStack Table v8. |
| Icons | `lucide-react` | Tree-shakeable. |
| Server state | **TanStack Query v5** | All API reads + mutations. |
| Client state | **Zustand v5** | Light UI state only (sidebar open, modal stacks). Not for server data. |
| Forms | **React Hook Form + Zod (v4)** | Schemas defined in `lib/validations/*.ts` (Phase 3 builds them). |
| HTTP | `axios` via `lib/api-client.ts` | Single configured instance. Never instantiate axios elsewhere. |
| Theme | `next-themes` | Wired in Phase 3 via a `ThemeProvider` (`common-components/theme-provider.tsx`). |
| Realtime | `socket.io-client` (Phase 3) | One connection per session, wrapped in a provider. |
| Testing | Vitest + Playwright (Phase 3) | |

## 2. Design Tokens (Tailwind 4 syntax — already wired in `globals.css`)

```css
/* app/globals.css — ALREADY IMPLEMENTED */
@import "tailwindcss";

@theme inline {
  /* Brand */
  --color-brand-primary: #0A6E4F;
  --color-brand-primary-dark: #085940;
  --color-brand-primary-light: #E6F4F0;
  --color-brand-secondary: #1565C0;
  --color-brand-header: #0D1B2A;

  /* Status */
  --color-status-active: #00BFA5;
  --color-status-pending: #F59E0B;
  --color-status-danger: #DC2626;

  /* Surfaces */
  --color-bg-page: #F8FAFC;
  --color-bg-card: #FFFFFF;
  --color-border-default: #E2E8F0;
  --color-text-primary: #0F172A;
  --color-text-muted: #64748B;

  --font-sans: var(--font-sans); /* Inter, set in app/layout.tsx */

  /* shadcn primitive tokens — REQUIRED for Button/Input/etc. to render correctly */
  --color-primary: #0A6E4F;
  --color-primary-foreground: #ffffff;
  --color-secondary: #f1f5f9;
  --color-secondary-foreground: #0f172a;
  --color-muted: #f1f5f9;
  --color-muted-foreground: #64748b;
  --color-accent: #f1f5f9;
  --color-accent-foreground: #0f172a;
  --color-destructive: #ef4444;
  --color-destructive-foreground: #ffffff;
  --color-ring: #0A6E4F;
  --color-border: #E2E8F0;
  --color-input: #E2E8F0;
  --color-background: #F8FAFC;
  --color-foreground: #0F172A;
  --radius: 0.75rem;
}
```

Use the tokens via Tailwind classes: `bg-brand-primary`, `text-text-muted`, `border-border-default`. **No inline hex values in components.**

> **CRITICAL:** The `--color-primary` / `--color-ring` etc. shadcn tokens **must** be present in `globals.css`. Without them `Button` renders as a plain text link (no background). Always check this when creating a new frontend project.

**Application pipeline badge colors** (5-state, canonical for School Teacher — wrap in `<StatusBadge state="..." />` in Phase 3):

| State | Tailwind classes | When shown |
|---|---|---|
| INTERESTED | `bg-blue-100 text-blue-700` | Seeker applied |
| SHORTLISTED | `bg-yellow-100 text-yellow-700` | School shortlisted |
| PAID | `bg-teal-100 text-teal-700` | Seeker paid ₹99 |
| WON | `bg-green-100 text-green-700` | School confirmed |
| CLOSED | `bg-red-100 text-red-700` | Declined or window expired |

> Note: MedPortal had different labels (Applied/Screening/Interview/Offer/Joined/Rejected). School Teacher uses the 5-state flow above.

## 3. Folder Structure

```
eduhire-frontend/
├── app/                          App Router pages
│   ├── (auth)/                    Login, register, OTP, forgot/reset-password  ✅ Built
│   ├── (app)/                     Seeker shell — /dashboard, /jobs, /applications, /profile
│   ├── recruiter/                 School shell — /recruiter/dashboard, /jobs, /applicants, /school, /subscription
│   ├── admin/                     Admin shell — /admin, /admin/users, /schools, /jobs, /payments
│   ├── pricing/                   Public pricing page  ✅ Built
│   ├── layout.tsx                 Root — fonts, providers
│   ├── page.tsx                   Landing  ✅ Built
│   └── globals.css                Tailwind 4 + design tokens  ✅ Built
├── common-components/            Shared React components (the canonical UI library)
│   ├── ui/                       shadcn-style primitives (button, input, dialog, …) — 33 files
│   ├── layout/                   Header / sidebar / breadcrumb / shell  (Phase 3 rebuilds)
│   ├── error-boundary.tsx
│   ├── network-error.tsx
│   ├── no-results.tsx
│   ├── search-bar.tsx
│   ├── theme-provider.tsx
│   └── loading-skeleton.tsx
├── lib/
│   ├── utils.ts                  cn() helper (required by every primitive)
│   ├── api-client.ts             axios instance + interceptors
│   ├── cookies.ts                Cookie helpers
│   ├── jwt-utils.ts              JWT decode without verification
│   ├── shared/                   ← Phase 3: mirrored enums/constants from BE
│   ├── api/                      ← Phase 3: per-feature API clients
│   ├── validations/              ← Phase 3: Zod schemas per form
│   ├── toast.ts                  ← Phase 3: shadcn-toast wrapper (jobToast, applicationToast, …)
│   └── notifications/            ← Phase 3: notification-type → route mapping
├── hooks/
│   ├── use-toast.ts              shadcn toast hook
│   ├── use-mobile.ts             Detect mobile viewport
│   └── use-debounced-value.ts    Debounce values
└── public/
```

**Path alias:** `@/*` → repo root, plus a back-compat alias `@/components/*` → `common-components/*` so older shadcn-style imports resolve. Always prefer `@/common-components/...` in new code.

## 4. Routing Conventions

| Prefix | Audience | Rendering | Status |
|---|---|---|---|
| `/` `/pricing` | Anyone (incl. crawlers) | Static | ✅ Built |
| `(auth)/` | Unauth only | Client (form-heavy) | ✅ Built |
| `(app)/` | Authenticated seekers | Client + RSC mix | ✅ Shell built |
| `recruiter/` | Schools | Client + RSC mix | ✅ Shell built |
| `admin/` | Admins | Client (tables) | ✅ Shell built |

> **Route group note:** `recruiter/` and `admin/` are **real folders** (not route groups in `()`). They have their own `layout.tsx` with role-guard redirect logic. Do not move them into `(recruiter)/` or `(admin)/` — the redirect logic must fire server-side on first render to prevent flash.

### proxy.ts — route protection (CURRENT IMPLEMENTATION)

The project uses `proxy.ts` (Next.js middleware file at the root) for route protection:

```ts
// proxy.ts (acts as middleware.ts)
const PUBLIC_PATHS = ['/', '/pricing', '/about'];
const AUTH_PATHS = ['/login', '/register', '/otp-verify', '/forgot-password', '/reset-password'];
```

- Unauthenticated → unprotected routes: pass through
- Unauthenticated → protected routes: redirect to `/login?next=<path>`  
- Authenticated → auth pages: redirect to role home
- Role mismatch → own role's home

> **CRITICAL: The `/login?next=...` redirect loop bug.** If the refresh token cookie path is NOT `path: '/'`, the browser won't send it on page navigations (only on the exact API path). The proxy then sees no valid session on `/dashboard`, redirects to `/login?next=%2Fdashboard`, which loops. Fix: ensure `path: '/'` in the BE cookie. See BACKEND_GUIDE §6.

### middleware.ts — route protection (Phase 3)

`middleware.ts` at the project root runs on every request before the page renders. It handles two things: unauthenticated redirect + wrong-role redirect.

```ts
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { decodeJwt } from '@/lib/jwt-utils';
import { Role } from '@/lib/shared/enums';

const PUBLIC_PREFIXES = ['/', '/jobs', '/pricing', '/about'];
const AUTH_PREFIXES = ['/login', '/register', '/otp'];

const ROLE_HOME: Record<string, string> = {
  [Role.TEACHER]: '/dashboard',
  [Role.RECRUITER]: '/recruiter/dashboard',
  [Role.ADMIN]: '/admin',
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('access_token')?.value;

  const isPublic = PUBLIC_PREFIXES.some(p => pathname === p || pathname.startsWith(p + '/'));
  const isAuthPage = AUTH_PREFIXES.some(p => pathname.startsWith(p));

  // Unauthenticated user hitting a protected route → login
  if (!isPublic && !isAuthPage && !token) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }

  // Authenticated user hitting auth page → home for their role
  if (isAuthPage && token) {
    const payload = decodeJwt(token);
    const home = ROLE_HOME[payload?.role as string] ?? '/dashboard';
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Wrong role accessing another role's shell → redirect to own home
  if (token) {
    const payload = decodeJwt(token);
    const role = payload?.role as string;
    if (pathname.startsWith('/recruiter') && role !== Role.RECRUITER) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/dashboard', request.url));
    }
    if (pathname.startsWith('/admin') && role !== Role.ADMIN) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
```

### useAuth hook — client-side role access

`hooks/use-auth.ts` (Phase 3) reads from `AuthContext` (provided in each shell layout):

```ts
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx; // { user: User | null; role: Role | null; isLoading: boolean; logout: () => void }
}
```

Use for conditional UI (e.g. showing "Post a Job" only to recruiters). Never use for access enforcement — that's middleware's job.

### Post-login redirect by role

```ts
// lib/auth-redirect.ts
export const ROLE_HOME: Record<Role, string> = {
  [Role.TEACHER]: '/dashboard',
  [Role.RECRUITER]: '/recruiter/dashboard',
  [Role.ADMIN]: '/admin',
};
```

After successful login/OTP, the auth service calls `router.replace(ROLE_HOME[user.role])`. Import from this single source — never hardcode paths in login pages.

## 5. Component Rules

1. **Server Components by default.** Add `'use client'` only if you need state, effects, event handlers, or browser-only APIs.
2. **Always reuse common components.** See Do/Don't §13 — most-violated rule. If a primitive lives in `common-components/ui/`, use it. If it doesn't, add it there (don't inline a one-off).
3. **Colocate types and schemas** at the top of the file. Cross-cutting types go in `lib/shared/types.ts`.
4. **Props destructured with defaults** on the signature line. No `props.x` access.
5. **No inline styles.** Tailwind classes + design tokens only. No arbitrary hex values in components.
6. **Never call `fetch`/`axios` directly inside a component.** Use a TanStack Query hook from `hooks/queries/` (Phase 3).
7. **Loading + empty states are first-class.** Use `<Skeleton />` from `common-components/ui/skeleton.tsx`. Use the empty-state pattern (centered icon + heading + CTA).
8. **Accessibility:** every icon button gets `aria-label`. Color is never the sole differentiator (icon + color together).

### AppHeader (BUILT — reuse everywhere)

`common-components/app-header.tsx` is the single shared header for all authenticated shells. Import it with the `@/` alias:

```tsx
import AppHeader from '@/common-components/app-header';
```

It handles:
- Role-based nav switching (SEEKER_NAV / RECRUITER_NAV / ADMIN_NAV) from `user.role`
- Profile dropdown with initials avatar, display name, role label, logout
- Mobile hamburger drawer
- **Minimal logo-only shell** when `!user` (prevents layout collapse during auth hydration — do NOT return `null`)

> **DO NOT** return `null` or an empty fragment when `!user` in a header/layout component. This collapses the page. Always render a minimal shell.

### UI Pattern: Dashboard Page Layout (ESTABLISHED — maintain going forward)

Every dashboard/feature page follows this structure:

```tsx
<div className="space-y-6">
  {/* 1. Gradient welcome banner */}
  <div className="bg-gradient-to-r from-brand-header to-[#1a2f47] rounded-2xl p-6 text-white relative overflow-hidden">
    {/* Decorative blob */}
    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-brand-primary opacity-20 blur-3xl" />
    {/* Content */}
    <div className="relative z-10 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-brand-primary/30 flex items-center justify-center">
        <Icon className="w-6 h-6 text-green-400" />
      </div>
      <div>
        <p className="text-slate-400 text-sm">Section label</p>
        <h1 className="text-2xl font-bold">Page Title</h1>
      </div>
    </div>
  </div>

  {/* 2. Stats row — colored icon cards */}
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {stats.map(...) => (
      <div className="bg-bg-card border border-border-default rounded-2xl p-5">
        <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center mb-3`}>
          <Icon className={iconColor} />
        </div>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    )}
  </div>

  {/* 3. Quick-action link cards */}
  {/* 4. Data panels */}
</div>
```

This pattern is established on: landing page, seeker dashboard, recruiter dashboard, admin dashboard. All new dashboard-style pages must follow it.

## 6. Form Pattern

```tsx
'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applyToJobSchema, type ApplyToJobInput } from '@/lib/validations/applications';
import { Input } from '@/common-components/ui/input';
import { Button } from '@/common-components/ui/button';

export function ApplyForm({ jobId }: { jobId: string }) {
  const form = useForm<ApplyToJobInput>({
    resolver: zodResolver(applyToJobSchema),
    defaultValues: { coverNote: '' },
  });
  // ...
}
```

**Conventions:**
- Zod schemas live in `lib/validations/<feature>.ts`. Mirror the BE-side validation logic; document the source.
- Errors: inline below field (`text-xs text-red-500` with AlertCircle icon) + optional summary box at top of form on submit error.
- Submit button disabled while `form.formState.isSubmitting || mutation.isPending`.
- On success: toast (via `lib/toast.ts`) + invalidate the relevant query.

## 7. Data Fetching (TanStack Query)

```ts
// hooks/queries/useJobs.ts (Phase 3)
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useJobs(filters: JobFilters) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: ({ signal }) =>
      apiClient.get('/jobs', { params: filters, signal }).then((r) => r.data),
    staleTime: 30_000,
  });
}
```

**Rules:**
- Query key = `[entity, ...distinguishers]`. Always an array.
- Mutations invalidate by tag.
- `apiClient` is the only HTTP entry point. Never raw `axios.get`.
- SSR pages can pre-fetch via `prefetchQuery` in the RSC and hydrate on the client.

## 8. Payments (Razorpay Checkout) — Phase 3

`lib/razorpay.ts` (Phase 3) loads Razorpay's script once and opens checkout. Flow:
1. Click "I'm Interested" → POST `/payments/application/order` → BE returns `{ orderId, amount }`
2. FE opens Razorpay modal
3. On success → BE webhook fires → FE re-fetches `applications` query OR receives Socket.IO event

## 9. Realtime

### Socket.IO (in-app notifications)
- One `SocketProvider` mounted inside `(app)` layout.
- Subscribes to `user:<userId>` room.
- Events: `notification.new`, `application.stateChanged`, `job.filled`.
- All events pass through a Zustand store; components read selectively with shallow selectors.

### Web Push (background push notifications — BUILT, Phase 3b)

Browser-level push using the native Web Push API. **No Firebase/FCM required.**

**Hook: `hooks/use-web-push.ts`**
```ts
export function useWebPush(userId: string | undefined) {
  const subscribed = useRef(false);
  useEffect(() => {
    if (!userId || subscribed.current || !VAPID_PUBLIC_KEY) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    async function subscribe() {
      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await apiClient.post('/users/me/push-subscription', subscription.toJSON());
      subscribed.current = true;
    }
    subscribe().catch(() => {}); // silently fail — push is nice-to-have
  }, [userId]);
}
```

**Service worker: `public/sw.js`** (must be in `public/` for SW scope to cover the whole app)
- `push` event: parse JSON payload → `self.registration.showNotification(title, { body, icon, data: { link } })`
- `notificationclick`: close notification → focus existing window or `clients.openWindow(link)`

**Call site:** `useWebPush(user?.id)` in `AppHeader` — called once after auth loads.

**Env:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<base64url>` in `.env.local`.

**VAPID key conversion:** `applicationServerKey` must be `ArrayBuffer`, not `Uint8Array`. Use:
```ts
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray.buffer; // ← must return .buffer (ArrayBuffer), not the Uint8Array itself
}
```

## 10. Canonical Components (single source of truth)

| Pattern | File | Status |
|---|---|---|
| Class merging | `lib/utils.ts` (`cn`) | ✅ |
| Toast wrapper | `lib/toast.ts` | ❌ Phase 3 (use shadcn toast, not react-hot-toast) |
| Status badge | `common-components/ui/badge.tsx` (base) → `<StatusBadge>` wrapper | ❌ Phase 3 |
| Empty state | inline pattern (centered icon + h + CTA) | (no `<EmptyState>` component yet) |
| Skeletons | `common-components/ui/skeleton.tsx` + `page-skeleton.tsx` | ✅ |
| Notification bell | `<NotificationBell>` | ❌ Phase 3 |
| Razorpay checkout modal | `<RazorpayCheckoutModal>` | ❌ Phase 3 |
| Confirm dialog | `common-components/ui/dialog.tsx` (base) | ✅ base; wrap in Phase 3 |
| Data table | TanStack Table v8 + `common-components/ui/table.tsx` | ❌ Phase 3 — to be added |
| Multi-select chip grid | `common-components/ui/expertise-selector.tsx` → `<ExpertiseSelector>` | ✅ Added Phase 3b |

## 11. Accessibility & SEO

**A11y:** Keyboard nav on all interactive elements · `aria-label` on icon-only buttons · Form errors linked via `aria-describedby` · Color contrast ≥ AA · Focus-visible ring (`focus-visible:ring-2`).

**SEO (public routes only):** `generateMetadata` per job page · `sitemap.ts` for `/jobs/[id]` · `robots.ts` disallows `(app)`/`(recruiter)`/`(admin)` · `JobPosting` JSON-LD per job · ISR `revalidate: 300` on `/jobs` and `/jobs/[id]`.

## 12. Security

- **JWT access token** lives in React context (memory) — **never `localStorage`/`sessionStorage`**. Refresh happens via httpOnly cookie + BE rotation.
- `apiClient` 401 handler → redirect to `/login` (current implementation is a placeholder; Phase 3 wires the proper refresh-then-retry flow per BACKEND_GUIDE.md auth contract).
- **No secrets in client code.** Public env vars use the `NEXT_PUBLIC_*` prefix; server-only secrets stay server-side.
- **CSRF on cookie-auth mutation routes:** Phase 3 wires the double-submit token.
- **Razorpay key ID** is public (`NEXT_PUBLIC_RAZORPAY_KEY_ID`); the secret never reaches the browser.
- **Input validation** is server-authoritative — FE Zod validation is UX, not security.

## 13. Do / Don't

### DO
- ✅ **Use Server Components by default**; drop into client only when you need interactivity.
- ✅ **Always reuse `common-components/ui/*`, `lib/*`, `hooks/*`.** When a needed primitive doesn't exist, add it to `common-components/ui/` and reuse it from there.
- ✅ **One axios instance** (`lib/api-client.ts`). All API calls go through TanStack Query hooks.
- ✅ **Mirror BE enums/constants into `lib/shared/`** with a comment naming the source file.
- ✅ Invalidate queries after mutations; prefer optimistic updates for toggle-style actions.
- ✅ Put JWT access token in React context (memory). Refresh via httpOnly cookie.
- ✅ Use `next/image` for all images; provide `width/height` or `fill`.
- ✅ Use `next/link` for internal navigation; never `<a href="/path">` for internal routes.
- ✅ Use `react-hook-form`'s `formState.isSubmitting` — never a manual loading boolean for forms.
- ✅ Read Next 16's behavioral changes (e.g. `useRef<T>(initial)` required, async `cookies()`, async route params in some contexts) **before guessing** based on older docs.

### DON'T
- ❌ **Never use raw HTML `<select>`/`<input>`/`<button>`/`<textarea>`** when a `common-components/ui/` equivalent exists. (See `REUSABLE_FILE_GUIDE_FRONTEND.md` for the catalog.)
- ❌ **Never import shadcn primitives directly from `@radix-ui/...`** in pages/features — go through `common-components/ui/`.
- ❌ **Never duplicate a component in a feature folder** when one exists (or could be added) in `common-components/ui/`. Tweak the common one with a new prop instead.
- ❌ **Never store JWT in `localStorage` or `sessionStorage`.**
- ❌ **Never fetch in `useEffect`.** Always a TanStack Query hook.
- ❌ **No `any`.** Use `unknown` and narrow.
- ❌ **No inline hex values** in components — use design tokens.
- ❌ **No domain logic in components** (no `if (job.type === 'SOS') ...` walls). Derive in a hook/helper.
- ❌ **No barrel `index.ts`** files in `app/` or `common-components/`.
- ❌ **Never trust client-side price calculations.** Display only what the API tells you; confirm amounts server-side.
- ❌ **Never `router.push` inside RSCs** — use `redirect()` from `next/navigation`.
- ❌ **Never use Tailwind 3 syntax** (`tailwind.config.ts` with `theme.extend`). Tailwind 4 is CSS-first; tokens go in `globals.css` under `@theme inline`.
- ❌ **Never assume Next.js APIs from training data.** Next 16 has breaking changes; check `node_modules/next/dist/docs/` or the official Next 16 docs.

---

## 14. Bug-Prevention Rules (from Phase 3a — do not repeat these)

These bugs occurred and were fixed. The root cause and fix are recorded here so they don't recur.

### React StrictMode double-effect (double OTP send)
**Problem:** `useEffect(() => { api.sendOtp() }, [])` fires **twice** in dev (StrictMode mounts → unmounts → remounts). Two OTPs sent; first is overwritten, second is valid. User enters first OTP → "invalid OTP".  
**Fix:** Gate with a `useRef` guard:
```tsx
const autoSentRef = useRef(false);
useEffect(() => {
  if (!prefillEmail || autoSentRef.current) return;
  autoSentRef.current = true;
  authApi.sendOtp(prefillEmail).then(...);
}, []); // eslint-disable-line react-hooks/exhaustive-deps
```
**Rule:** Any `useEffect` that calls an API endpoint with a side-effect (email, SMS, payment) MUST use a `useRef` guard or a `StrictMode`-safe pattern.

### Login redirect loop (`/login?next=%2Fdashboard`)
**Problem:** Refresh token cookie had `path: '/api/auth/refresh'`. Browser only sent the cookie to that exact path. Proxy couldn't read the session on `/dashboard` page requests → redirected to `/login?next=/dashboard` → loop.  
**Root cause is on the BE** (see BACKEND_GUIDE §6 Bug-Prevention), but if you see this loop on the FE, check cookie path in network dev-tools immediately.

### AppHeader not appearing after login
**Problem:** Layout returned `null` when `!user` during the brief window between `isLoading = false` and user state commit. The shell collapsed, header disappeared.  
**Fix:** Always return a minimal logo-only shell instead of `null`. The `common-components/app-header.tsx` already implements this pattern — check it before building any new shell header.

### `@/` import path for shared components
**Problem:** Relative imports (`../../common-components/app-header`) break when folder depth changes.  
**Rule:** Always import shared components with the alias: `import AppHeader from '@/common-components/app-header'`. The `@/` alias maps to the project root via `tsconfig.json` and resolves reliably regardless of file depth.

### Zod v4 + react-hook-form optional number fields → Resolver type error (Phase 3b)
**Problem:** `z.number().optional()` in a Zod v4 schema produces `number | undefined` in the inferred TypeScript type. `@hookform/resolvers` v5 + react-hook-form 7.73+ has a stricter structural `Resolver<T>` type that doesn't accept `number | undefined` for numeric fields. Build error: *"Two different types with this name exist, but they are unrelated. Type 'number | undefined' is not assignable to type 'number'."*  
**Fix:** Import `type Resolver` from `react-hook-form` and cast the resolver:
```ts
import { useForm, type Resolver } from 'react-hook-form';
// ...
const { register } = useForm<MyFormValues>({
  resolver: zodResolver(mySchema) as Resolver<MyFormValues>,
});
```
**Rule:** Any form using `z.number().optional()` or similar optional number fields needs this cast. It's purely a TypeScript workaround — runtime behavior is unchanged.

### Web Push: `Uint8Array` not assignable to `BufferSource` (Phase 3b)
**Problem:** `PushManager.subscribe({ applicationServerKey: uint8Array })` requires `BufferSource`, which means `ArrayBuffer | ArrayBufferView`. In strict TypeScript, `Uint8Array<ArrayBufferLike>` (the inferred type of `new Uint8Array(...)`) is not directly assignable to `BufferSource`.  
**Fix:** Return `.buffer` from the base64-to-typed-array utility to get a plain `ArrayBuffer`. See the `urlBase64ToUint8Array` implementation in §9 above.

### Web Push: use `web-push` (VAPID), not Firebase (Phase 3b)
**Problem:** Firebase/FCM requires a Firebase project, service account, and separate SDK. The native Web Push API (`PushManager.subscribe()`) works in all modern browsers without any third-party SDK.  
**Fix:** Backend: `npm install web-push`. Frontend: no extra packages needed — just `navigator.serviceWorker` + `PushManager` native APIs.  
**Rule:** Never install `firebase` or `firebase-admin` for the purpose of browser push notifications.

### UI-level nav restriction vs route-level redirect (Phase 3b)
**Problem:** Preventing unverified school recruiters from accessing certain pages was first implemented as a redirect from inside those pages (let page render → check → push('/allowed-page')). This wastes a render and network call.  
**Fix:** Render nav items as non-clickable `<span>` elements with `cursor-not-allowed` and a `title` tooltip. Pages don't even load. See `AppHeader` `isNavDisabled()` pattern:
```ts
const isNavDisabled = (href: string) =>
  isRecruiter && school != null && !school.isVerified &&
  !RECRUITER_ALLOWED.some((p) => href.startsWith(p));
```
**Rule:** For nav-level access control, always prefer a disabled UI element over a page-level redirect. Keep redirects for middleware-level role enforcement only.

---

## Phase 3e patterns (2026-06-23)

### Zod discriminated unions for branched forms
When one page hosts two forms with incompatible field sets (e.g. SOS vs full-time
job creation), define the schema as `z.discriminatedUnion('type', [sosSchema, ftSchema])`
and use **two separate `useForm` instances**, one per variant:
```ts
const [type, setType] = useState<JobType>(defaultType);
return (
  <>
    <TypeToggle value={type} onChange={setType} />
    {type === JobType.SOS ? <SosForm /> : <FullTimeForm />}
  </>
);

function SosForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<CreateSosJobFormValues>({
    resolver: zodResolver(createSosJobSchema),
    defaultValues: { type: JobType.SOS, … },
  });
  // errors.qualification is typed correctly; no cast needed.
}
```
**Do NOT** try to share one `useForm` across both with a wide union — `errors.<field>`
becomes uncastable without ugly `as Partial<…>` everywhere. See `recruiter/jobs/new/page.tsx`.

### `lib/utils/postings-display.ts` helpers
Every job-rendering surface should run SOS jobs through these helpers:
- `sosQualificationLabel(job)` → human-readable qualification (falls back to legacy
  `role` for pre-Phase-3e SOS docs).
- `sosFeeDisplay(job)` → flat ₹ fee (`formatRupees(feeAmount ?? salaryMin)`).
- `formatShiftAt(iso)` → `"23 Jun 2026, 10:00 am"` (null-safe).
- `formatShiftRange(start, end)` → `"<a> → <b>"` or just `<a>` / `<b>` if one is null.

**Rule:** Any `type === JobType.SOS` branch on a job card/detail/dialog uses these,
not `formatLpa()` or raw `experienceMin/Max`.

### `Job` type fields for SOS-native columns are nullable
`lib/api/jobs.ts` declares `qualification`, `startAt`, `endAt`, `feeAmount` as
`?: T | null`. **Every render must null-check** — direct `.toISOString()` or
`QUALIFICATION_LABELS[job.qualification]` on a raw `Job` instance will throw for
pre-Phase-3e docs (or any full-time job). Use the helpers above, or explicit
`{job.startAt ? formatShiftAt(job.startAt) : null}`.

### Notifications bell must fetch on mount
`common-components/notifications-bell.tsx` has two `useEffect` fetch triggers:
1. `useEffect([accessToken], () => fetchFirstPage(false))` — on auth/mount, so the
   badge count is correct on first render. Without this the bell badge shows zero
   until the user clicks.
2. `useEffect([isOpen])` — existing on-open fetch for fresh panel content.
3. Socket.IO `notification.new` listener — real-time delta after mount.

**Rule:** Any header-level counter that depends on server state must fetch on
mount, not only on first interaction.

### Admin Config UI branches on `displayKind`
The Config page (`app/admin/config/page.tsx`) splits settings rendering by
`setting.displayKind`:
- `'boolean'` → render `<Switch>` from `common-components/ui/switch.tsx`. Toggle
  saves immediately; no separate Save button.
- `'number'` (default if null) → existing number input + Save button + dynamic
  `Min: x{unit} · Max: y{unit}` footer using `setting.unit` and `setting.maxValue`.

**Rule:** New settings should be tagged with the right `displayKind` and (where
applicable) a `unit` in the seed; the UI picks the right widget automatically.

### Type-aware state-machine timelines
The applications progress bar (`app/(app)/applications/page.tsx`) uses two `STEPS`
arrays (`SOS_STEPS` 2-step, `FT_STEPS` 4-step) and a small `buildOrder(steps)`
helper that maps each `ApplicationState` to an index or `-1` (unreachable).
Pattern reusable for any state-machine renderer where the path branches by an
entity type.
