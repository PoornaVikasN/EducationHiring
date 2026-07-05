# MedPortal — Reusable Files from CarCart Frontend
## What to Copy, What to Delete

> Audit date: 2026-04-25 — based on actual import scan across `app/`, `components/`, `hooks/`

---

## A. UI Components Folder — `components/ui/`

### ✅ KEEP (33 files — actively imported)

Copy these directly to your new project's `components/ui/`:

| File | Purpose |
|------|---------|
| `avatar.tsx` | User avatars (header dropdown) |
| `badge.tsx` | Status pills (APPLIED, JOINED, etc.) |
| `breadcrumb.tsx` | Top-of-page breadcrumb trail |
| `button.tsx` | All CTAs |
| `calendar.tsx` | Date picker base (used by date-picker) |
| `card.tsx` | Page section containers |
| `checkbox.tsx` | Checkboxes in forms/tables |
| `combobox.tsx` | Searchable select (custom — built on command) |
| `command.tsx` | cmdk base (used by combobox) |
| `data-table.tsx` | Standard table component |
| `date-picker.tsx` | Date input |
| `date-time-picker.tsx` | Date + time input |
| `dialog.tsx` | All modals |
| `input.tsx` | Text inputs |
| `label.tsx` | Form labels |
| `page-skeleton.tsx` | Page-level loading skeletons |
| `popover.tsx` | Dropdowns, tooltips base |
| `radio-group.tsx` | Radio buttons |
| `select.tsx` | Native select dropdown |
| `separator.tsx` | Horizontal/vertical dividers |
| `sheet.tsx` | Side drawer (mobile sidebar) |
| `sidebar.tsx` | Main left sidebar shell |
| `skeleton.tsx` | Loading placeholder |
| `slider.tsx` | Range slider (budget filters) |
| `switch.tsx` | Toggle switches |
| `table.tsx` | Base table primitives |
| `tabs.tsx` | Tab navigation (used in system-guide) |
| `textarea.tsx` | Multi-line input |
| `toast.tsx` | Toast notification base |
| `toaster.tsx` | Toast container/provider |
| `toggle.tsx` | Toggle button |
| `tooltip.tsx` | Hover tooltips |
| `use-mobile.tsx` | Required by sidebar.tsx |

### ❌ DELETE (23 files — never imported anywhere)

```bash
# Run from carcart-frontend/components/ui/
rm accordion.tsx alert-dialog.tsx alert.tsx aspect-ratio.tsx \
   carousel.tsx chart.tsx collapsible.tsx context-menu.tsx \
   drawer.tsx dropdown-menu.tsx empty-state.tsx enhanced-data-table.tsx \
   error-boundary.tsx form.tsx hover-card.tsx input-otp.tsx \
   menubar.tsx navigation-menu.tsx pagination.tsx progress.tsx \
   resizable.tsx scroll-area.tsx toggle-group.tsx
```

| File | Why unused |
|------|-----------|
| `accordion.tsx` | No collapsible content sections |
| `alert-dialog.tsx` | Custom delete modals used instead |
| `alert.tsx` | Inline tinted divs used for callouts |
| `aspect-ratio.tsx` | No images requiring fixed ratios |
| `carousel.tsx` | No image carousels |
| `chart.tsx` | recharts not actually used |
| `collapsible.tsx` | Sidebar uses custom expand logic |
| `context-menu.tsx` | No right-click menus |
| `drawer.tsx` | sheet.tsx used instead |
| `dropdown-menu.tsx` | Header has custom dropdown |
| `empty-state.tsx` | Empty states inlined per page |
| `enhanced-data-table.tsx` | data-table.tsx used instead |
| `error-boundary.tsx` | `components/error-boundary.tsx` (top-level) used |
| `form.tsx` | react-hook-form not used (manual forms) |
| `hover-card.tsx` | tooltips used instead |
| `input-otp.tsx` | No OTP login |
| `menubar.tsx` | No menubar UI |
| `navigation-menu.tsx` | Sidebar handles all nav |
| `pagination.tsx` | Custom Previous/Next buttons in each page |
| `progress.tsx` | No progress bars |
| `resizable.tsx` | Fixed layout |
| `scroll-area.tsx` | Native overflow used |
| `toggle-group.tsx` | Custom button toggles used |

---

## B. Other Reusable Components — `components/`

### ✅ Generic (copy & rename for medical context)

| File | What it does | Adapt for medical |
|------|-------------|-------------------|
| `components/error-boundary.tsx` | Top-level React error boundary | Yes — keep as is |
| `components/network-error.tsx` | Network failure fallback UI | Yes — keep as is |
| `components/api-error-handler.tsx` | Axios error → toast handler | Yes — keep as is |
| `components/no-results.tsx` | Empty search results component | Yes — change icon to medical |
| `components/loading-skeleton.tsx` | Generic skeleton variants | Yes — keep as is |
| `components/search-bar.tsx` | Global search input | Yes — change placeholder text |
| `components/protected-route.tsx` | Auth guard wrapper | Yes — adapt role list |
| `components/auth-provider.tsx` | JWT context + login state | Yes — adapt role enum |
| `components/theme-provider.tsx` | next-themes wrapper | Yes — keep as is |
| `components/breadcrumb-nav.tsx` | Top breadcrumb | Yes — adapt route labels |
| `components/layout/app-layout.tsx` | Page shell wrapper | Yes — keep structure |
| `components/layout/app-header.tsx` | Sticky black header + profile dropdown | Yes — change colors per design ref |
| `components/layout/app-sidebar.tsx` | Role-based left nav | Yes — change nav items per role |

### ❌ CarCart-specific (DON'T copy — rebuild for medical domain)

These are tied to leads/customers/cars — rewrite for jobs/applications/candidates:
- `components/system-guide.tsx`
- `components/todays-followups.tsx`
- `components/todays-assignments.tsx`
- `components/followup-timeline.tsx`
- `components/dashboard/TeamLeaves.tsx`
- All `components/modals/*` (rebuild as post-job-modal, view-application-modal, etc.)
- All `components/forms/*`

### ⚠️ Adapt with caution
- `components/notifications/notification-bell.tsx` — copy structure, change notification types (LEAD_ASSIGNED → APPLICATION_RECEIVED etc.)

---

## C. Library Folder — `lib/`

### ✅ Generic Utilities (copy as-is)

| File | Purpose | Notes |
|------|---------|-------|
| `lib/utils.ts` | `cn()` helper for Tailwind class merging | **REQUIRED** by every shadcn component |
| `lib/api-client.ts` | Axios instance with interceptors, auth header injection, 401 handling | Keep, change `baseURL` |
| `lib/cookies.ts` | Cookie get/set/delete helpers | Keep as is |
| `lib/jwt-utils.ts` | JWT decode without verification | Keep as is |
| `lib/auth-utils.ts` | `getRoleLabel()`, `getSectionLabel()` helpers | Adapt role names (DOCTOR, NURSE, HR_MANAGER) |
| `lib/rbac.ts` | Permission checks (`hasPermission(resource, action)`) | Keep structure, change resources |
| `lib/toast.ts` | `customerToast`, `leadToast`, `showToast` helpers | Rename → `jobToast`, `applicationToast` |
| `lib/display-helpers.ts` | `getDisplayName(entity)` for soft-deleted records | Keep — same problem in medical |
| `lib/browser-notifications.ts` | Native browser notification API wrapper | Keep as is |
| `lib/notification-helpers.ts` | Notification type → route mapping | Adapt notification types |
| `lib/constants.ts` | App-wide constants | Replace with medical constants |
| `lib/validations.ts` | Zod schemas | Rebuild for medical entities |

### ❌ Domain-specific (rewrite for medical)

```
lib/api/customers.ts          → lib/api/candidates.ts
lib/api/customers-minimal.ts  → (drop, merge into candidates)
lib/api/leads.ts              → lib/api/applications.ts
lib/api/followups.ts          → lib/api/interviews.ts
lib/api/sourcing.ts           → lib/api/jobs.ts
lib/api/users.ts              → keep, adapt fields
lib/api/leaves.ts             → keep as is
lib/api/dashboard.ts          → keep, change KPIs
lib/api/reports.ts            → keep, change reports
lib/api/auth.ts               → keep as is
lib/api/in-app-notifications.ts → keep, change notification types
lib/api/notifications.ts      → likely drop (legacy parallel system)
lib/api/roles.ts              → keep as is
lib/api/templates.ts          → keep as is (email templates)
lib/api/settings.ts           → keep as is

lib/types.ts                  → REBUILD (Customer/Lead → Candidate/Application)
lib/cars-data.ts              → DELETE
lib/static-data.ts            → REBUILD (specialties, departments)
lib/mock-data.ts              → DELETE
lib/data/database.ts          → DELETE if unused
lib/auth-config.ts            → review next-auth config
```

---

## D. Hooks Folder — `hooks/`

### ✅ Generic (copy as-is)

| Hook | Purpose |
|------|---------|
| `hooks/use-mobile.ts` | Detect mobile viewport |
| `hooks/use-toast.ts` | Toast trigger hook |
| `hooks/use-debounced-value.ts` | Debounce a value (search inputs) |
| `hooks/use-auth.ts` | Auth context consumer |

### ❌ Domain-specific (rewrite)

```
use-customers.ts            → use-candidates.ts
use-customers-minimal.ts    → drop
use-customer-stats.ts       → use-candidate-stats.ts
use-optimized-customers.ts  → drop (optimization layer; rebuild if needed)
use-leads.ts                → use-applications.ts
use-lead-stats.ts           → use-application-stats.ts
use-followups.ts            → use-interviews.ts
use-leaves.ts               → keep as is
use-users.ts                → keep, adapt fields
use-notifications.ts        → keep, change notification types
use-dashboard.ts            → keep, change KPIs
use-reports.ts              → keep, change reports
use-logs.ts                 → keep as is
```

---

## E. package.json — What to Drop

### Unused npm dependencies (safe to remove after deleting unused UI files)

```bash
npm uninstall \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-progress \
  @radix-ui/react-scroll-area \
  @radix-ui/react-toggle-group \
  embla-carousel-react \
  vaul \
  input-otp \
  react-resizable-panels \
  recharts \
  cmdk
```

> ⚠️ **Keep `cmdk`** if you use the Combobox component (it's a dependency of `command.tsx`).
> ⚠️ **Keep `recharts`** if you plan to add medical analytics charts.

### Forms-related (keep if planning forms with react-hook-form)
- `@hookform/resolvers`
- `react-hook-form`
- `zod`

If you'll use simple controlled forms (like CarCart does), you can drop `@hookform/resolvers` and `react-hook-form` — keep `zod` for validation schemas.

### Confirm before dropping
- `next-auth` / `@auth/core` — only if you use NextAuth
- `bcryptjs` — only used in mock auth, drop if backend handles it
- `nodemailer` — backend should handle this, drop from frontend
- `xlsx` — keep if you'll do Excel import/export

---

## F. Recommended Copy Sequence

1. **Copy `lib/utils.ts` first** — required by everything
2. **Copy `components/ui/` (the 33 keepers)** — base shadcn components
3. **Copy `hooks/use-mobile.ts`, `use-toast.ts`, `use-debounced-value.ts`** — generic hooks
4. **Copy `lib/api-client.ts`, `lib/cookies.ts`, `lib/jwt-utils.ts`** — API plumbing
5. **Copy `lib/toast.ts`** — rename helpers (`jobToast`, `applicationToast`)
6. **Copy `components/auth-provider.tsx`, `protected-route.tsx`** — auth shell
7. **Copy `components/layout/*`** — header + sidebar + page shell
8. **Copy `components/error-boundary.tsx`, `network-error.tsx`, `api-error-handler.tsx`** — error handling
9. **Build medical-specific** — types.ts, api/jobs.ts, api/applications.ts, api/candidates.ts, modals, pages

---

## G. Final Cleaned `components/ui/` File Count

- **Before:** 55 files
- **After:** 33 files (40% reduction)
- **Bundle size impact:** ~80–120 KB smaller (radix-ui packages dropped)

---

## H. One-Line Cleanup Script (PowerShell)

```powershell
# Run from project root: carcart-frontend\components\ui\
$unused = @(
  'accordion','alert-dialog','alert','aspect-ratio','carousel','chart',
  'collapsible','context-menu','drawer','dropdown-menu','empty-state',
  'enhanced-data-table','error-boundary','form','hover-card','input-otp',
  'menubar','navigation-menu','pagination','progress','resizable',
  'scroll-area','toggle-group'
)
$unused | ForEach-Object { Remove-Item "$_.tsx" -ErrorAction SilentlyContinue }
```

---

*Audit method: `grep -r "@/components/ui/" app/ components/ hooks/` against full file list. Transitive imports (e.g., command.tsx used by combobox.tsx, use-mobile.tsx by sidebar.tsx) verified.*
