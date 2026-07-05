# MedPortal — Job Application Portal for Hospitals & Medical Institutions
## UI & Design Reference Guide

> Adapted from the CarCart CRM design system. Same component architecture (Next.js 14 + shadcn/ui + Tailwind), new medical/healthcare theme.

---

## 1. Brand Identity

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--primary` | `#0A6E4F` | CTAs, active nav, accents (replaces CarCart's `#D94B00`) |
| `--primary-dark` | `#085940` | Hover states, gradients dark stop |
| `--primary-light` | `#E6F4F0` | Tinted backgrounds, info panels |
| `--secondary` | `#1565C0` | Secondary actions, doctor role highlights |
| `--header-bg` | `#0D1B2A` | Top header bar (deep navy — replaces CarCart's `#000000`) |
| `--accent-teal` | `#00BFA5` | Status pills: active, available |
| `--accent-amber` | `#F59E0B` | Status pills: pending, review |
| `--danger` | `#DC2626` | Rejected, cancelled, delete |
| `--neutral-bg` | `#F8FAFC` | Page background |
| `--card-bg` | `#FFFFFF` | Card surfaces |
| `--border` | `#E2E8F0` | Dividers, card borders |
| `--text-primary` | `#0F172A` | Headings |
| `--text-muted` | `#64748B` | Labels, helper text |

### Typography

- **Font:** `Inter` (400 / 500 / 600 / 700) — clean, clinical feel
- **Heading scale:** `text-3xl font-bold` → `text-xl font-semibold` → `text-base font-medium`
- **Body:** `text-sm text-slate-700`
- **Helper/label:** `text-xs text-slate-500`

### Logo Placement

```
Header: h-10 w-auto  (same pattern as CarCart Logo.png)
Sidebar header: h-8 w-auto
```

---

## 2. Layout Architecture

Identical shell to CarCart — sticky black header + left sidebar + main content area.

```
┌─────────────────────────────────────────────────────────┐
│  HEADER  [#0D1B2A]  Logo | Section Label | Bell | Avatar │  h-[90px]
├───────────────┬─────────────────────────────────────────┤
│               │                                         │
│   SIDEBAR     │          MAIN CONTENT AREA              │
│   (white bg)  │          space-y-6  p-6                 │
│               │                                         │
│               │                                         │
└───────────────┴─────────────────────────────────────────┘
```

### Header (`app-header.tsx` equivalent)

```tsx
<header className="sticky top-0 bg-[#0D1B2A] h-[90px] flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-lg z-50">
  {/* Logo + section divider + section label */}
  {/* Right: NotificationBell + Profile dropdown */}
</header>
```

**Profile dropdown** — keep the same animated pattern:
- Trigger: avatar with `ring-[#0A6E4F]` on hover
- Dropdown: `rounded-2xl` with gradient header `from-[#0A6E4F] to-[#085940]`
- Animation: `opacity/translate-y/scale` CSS transition `cubic-bezier(0.4, 0, 0.2, 1)`
- Box shadow: `0 20px 60px -10px rgba(0,0,0,0.25)`

### Sidebar (`app-sidebar.tsx` equivalent)

```tsx
<Sidebar className="border-r border-gray-200 bg-white">
  {/* Active nav item */}
  className="bg-[#0A6E4F] text-white hover:bg-[#085940]"
  
  {/* Badge on nav items */}
  className="bg-[#0A6E4F] text-white text-xs"
  
  {/* Quick action link color */}
  className="text-[#0A6E4F] hover:bg-[#0A6E4F]/10"
```

---

## 3. Page-Level Patterns

### Hero / Page Banner Card

The top-of-page gradient banner (used in `system-guide.tsx`) — adapt for any "overview" or onboarding page:

```tsx
<Card className="bg-gradient-to-r from-[#0A6E4F] to-[#00BFA5] text-white border-0">
  <CardContent className="p-8">
    <div className="flex items-center gap-4 mb-4">
      <div className="p-3 bg-white/20 rounded-xl">
        <Hospital className="h-8 w-8" />
      </div>
      <div>
        <h1 className="text-3xl font-bold">MedPortal — Job Board</h1>
        <p className="text-white/80 mt-1">Connect hospitals with top medical talent</p>
      </div>
    </div>

    {/* Role stat tiles */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
      <div className="bg-white/10 rounded-lg p-4 text-center">
        <Stethoscope className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm font-medium">Doctors</p>
        <p className="text-xs text-white/70">Apply & Track</p>
      </div>
      {/* ... repeat for Nurse, Admin, HR */}
    </div>
  </CardContent>
</Card>
```

### Standard Content Card

```tsx
<Card>                                         {/* white bg, rounded-xl, shadow-sm */}
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-xl">
      <Stethoscope className="h-5 w-5 text-[#0A6E4F]" />
      Section Title
    </CardTitle>
    <CardDescription>Supporting text in slate-500</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* content */}
  </CardContent>
</Card>
```

### Two-Column Comparison Panel

```tsx
{/* Identical to CarCart's Customer vs Lead split — use for Job vs Application */}
<div className="grid md:grid-cols-2 gap-6">
  <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
    {/* JOB LISTING panel */}
  </div>
  <div className="bg-teal-50 border-2 border-teal-200 rounded-xl p-6">
    {/* APPLICATION panel */}
  </div>
</div>
```

---

## 4. Tabs Navigation Pattern

Copied directly from `system-guide.tsx` — the best pattern for multi-section content:

```tsx
<Tabs defaultValue="overview" className="space-y-6">
  <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-6 h-auto gap-1 p-1">
    <TabsTrigger value="overview"    className="text-xs py-2">Overview</TabsTrigger>
    <TabsTrigger value="jobs"        className="text-xs py-2">Job Listings</TabsTrigger>
    <TabsTrigger value="candidates"  className="text-xs py-2">Candidates</TabsTrigger>
    <TabsTrigger value="pipeline"    className="text-xs py-2">Hiring Pipeline</TabsTrigger>
    <TabsTrigger value="roles"       className="text-xs py-2">Roles</TabsTrigger>
    <TabsTrigger value="automation"  className="text-xs py-2">Automation</TabsTrigger>
  </TabsList>
  <TabsContent value="overview" className="space-y-6">
    {/* ... */}
  </TabsContent>
</Tabs>
```

---

## 5. Status & Badge System

### Application Pipeline Statuses

| Status | Color Class | Icon |
|--------|-------------|------|
| `APPLIED` | `bg-blue-100 text-blue-800 border-blue-300` | `Send` |
| `SCREENING` | `bg-yellow-100 text-yellow-800 border-yellow-300` | `Search` |
| `INTERVIEW_SCHEDULED` | `bg-purple-100 text-purple-800 border-purple-300` | `Calendar` |
| `INTERVIEW_DONE` | `bg-indigo-100 text-indigo-800 border-indigo-300` | `CheckCircle2` |
| `OFFER_SENT` | `bg-teal-100 text-teal-800 border-teal-300` | `Zap` |
| `JOINED` | `bg-green-100 text-green-800 border-green-300` | `UserCheck` |
| `REJECTED` | `bg-red-100 text-red-800 border-red-300` | `XCircle` |
| `WITHDRAWN` | `bg-gray-100 text-gray-800 border-gray-300` | `Pause` |

```tsx
<Badge className="bg-green-100 text-green-800 border-green-300 py-2 px-4 text-sm">
  <UserCheck className="h-4 w-4 mr-2" />
  JOINED
</Badge>
```

### Pipeline Flow Visual (status-flow-diagram pattern)

```tsx
<div className="flex items-center justify-center gap-2 flex-wrap p-4 bg-gray-50 rounded-xl">
  <Badge className="...APPLIED...">  <Send />    APPLIED </Badge>
  <ArrowRight className="h-4 w-4 text-gray-400" />
  <Badge className="...SCREENING..."> <Search />  SCREENING </Badge>
  <ArrowRight />
  <Badge className="...INTERVIEW..."> <Calendar /> INTERVIEW </Badge>
  <ArrowRight />
  <div className="flex flex-col gap-2">
    <Badge className="...OFFER_SENT...">  <Zap />       OFFER SENT  </Badge>
    <Badge className="...REJECTED...">   <XCircle />   REJECTED    </Badge>
  </div>
</div>
```

---

## 6. Info Panel Rows (Icon + Content)

From `system-guide.tsx`'s status detail cards — use for any explanatory section:

```tsx
<div className="grid gap-4">
  <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
    <div className="p-2 bg-blue-100 rounded-lg">
      <Stethoscope className="h-5 w-5 text-blue-600" />
    </div>
    <div className="flex-1">
      <h4 className="font-semibold text-blue-900">Doctor / Specialist</h4>
      <p className="text-sm text-blue-700 mt-1">
        Can apply for positions, track application status, and receive interview schedules.
      </p>
      <div className="mt-2 text-xs text-blue-600">
        <strong>Access:</strong> Own applications only | <strong>Actions:</strong> Apply, Withdraw
      </div>
    </div>
  </div>
</div>
```

---

## 7. Role-Card Grid

Use the `bg-white/10 rounded-lg p-4 text-center` tile pattern from the hero for role summaries:

```tsx
{/* On colored gradient background */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
  {[
    { icon: <Shield />,      label: "Admin",   sub: "Full Access"       },
    { icon: <UserCog />,     label: "HR",      sub: "Manage Hiring"     },
    { icon: <Stethoscope />, label: "Doctor",  sub: "Apply & Track"     },
    { icon: <HeartPulse />,  label: "Nurse",   sub: "Apply for Roles"   },
  ].map(role => (
    <div key={role.label} className="bg-white/10 rounded-lg p-4 text-center">
      {role.icon}
      <p className="text-sm font-medium mt-2">{role.label}</p>
      <p className="text-xs text-white/70">{role.sub}</p>
    </div>
  ))}
</div>
```

---

## 8. Modals

### Dialog Shell

```tsx
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <DialogTitle className="text-xl font-semibold flex items-center gap-2">
      <Briefcase className="h-5 w-5 text-[#0A6E4F]" />
      Post a New Job
    </DialogTitle>

    {/* Section header inside modal */}
    <div className="bg-[#E6F4F0] rounded-lg px-4 py-3 flex items-center gap-2">
      <Building2 className="h-4 w-4 text-[#0A6E4F]" />
      <span className="text-sm font-semibold text-[#0A6E4F]">Hospital Details</span>
    </div>

    {/* Form fields */}
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-slate-600">Department</Label>
        <Input placeholder="e.g. Cardiology" />
      </div>
    </div>

    {/* Footer buttons */}
    <div className="flex justify-end gap-3 pt-4 border-t">
      <Button variant="outline" onClick={onClose}>Cancel</Button>
      <Button className="bg-[#0A6E4F] hover:bg-[#085940] text-white">
        Post Job
      </Button>
    </div>
  </DialogContent>
</Dialog>
```

### Modal Section Color Bands

Use tinted section headers to visually separate form groups (exact pattern from `add-lead-modal.tsx`):

```tsx
{/* Job Info section */}
<div className="bg-[#E6F4F0] rounded-lg px-4 py-3 flex items-center gap-2">
  <Briefcase className="h-4 w-4 text-[#0A6E4F]" />
  <span className="text-sm font-semibold text-[#0A6E4F]">Job Information</span>
</div>

{/* Requirements section */}
<div className="bg-blue-50 rounded-lg px-4 py-3 flex items-center gap-2">
  <ClipboardList className="h-4 w-4 text-blue-600" />
  <span className="text-sm font-semibold text-blue-700">Requirements</span>
</div>

{/* Compensation section */}
<div className="bg-amber-50 rounded-lg px-4 py-3 flex items-center gap-2">
  <DollarSign className="h-4 w-4 text-amber-600" />
  <span className="text-sm font-semibold text-amber-700">Compensation</span>
</div>
```

---

## 9. Data Tables

Standard table layout from `enhanced-data-table.tsx`:

```tsx
<div className="rounded-xl border border-slate-200 overflow-hidden">
  <Table>
    <TableHeader className="bg-slate-50">
      <TableRow>
        <TableHead className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          Candidate
        </TableHead>
        <TableHead>Role Applied</TableHead>
        <TableHead>Hospital</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Applied On</TableHead>
        <TableHead className="text-right">Actions</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {/* Row hover: hover:bg-slate-50 */}
    </TableBody>
  </Table>
</div>
```

### Pagination Footer

```tsx
<div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-white">
  <p className="text-sm text-slate-500">
    Showing <span className="font-medium">{start}</span>–<span className="font-medium">{end}</span> of{" "}
    <span className="font-medium">{total}</span> applications
  </p>
  <div className="flex gap-2">
    <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
      Previous
    </Button>
    <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
      Next
    </Button>
  </div>
</div>
```

---

## 10. Dashboard Stat Cards

```tsx
{/* KPI strip — 4 across on desktop */}
<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
  {[
    { label: "Open Positions",    value: 42,  icon: <Briefcase />,   color: "text-[#0A6E4F]",  bg: "bg-[#E6F4F0]"  },
    { label: "Applications Today", value: 18,  icon: <Send />,        color: "text-blue-600",   bg: "bg-blue-50"    },
    { label: "Interviews Pending", value: 7,   icon: <Calendar />,    color: "text-amber-600",  bg: "bg-amber-50"   },
    { label: "Joined This Month",  value: 5,   icon: <UserCheck />,   color: "text-green-600",  bg: "bg-green-50"   },
  ].map(stat => (
    <Card key={stat.label}>
      <CardContent className="p-5 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${stat.bg}`}>
          <span className={stat.color}>{stat.icon}</span>
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
          <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

---

## 11. Empty States

From `components/ui/empty-state.tsx` pattern:

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
  <div className="p-4 bg-slate-100 rounded-2xl mb-4">
    <Briefcase className="h-10 w-10 text-slate-400" />
  </div>
  <h3 className="text-base font-semibold text-slate-700">No applications yet</h3>
  <p className="text-sm text-slate-400 mt-1 max-w-xs">
    When candidates apply for this position, they'll appear here.
  </p>
  <Button className="mt-4 bg-[#0A6E4F] hover:bg-[#085940] text-white" size="sm">
    Post a Job
  </Button>
</div>
```

---

## 12. Info Callout Boxes

Use for tips, warnings, and notes inside cards/modals:

```tsx
{/* Tip box — teal */}
<div className="bg-[#E6F4F0] rounded-lg p-4 border border-[#0A6E4F]/20">
  <p className="text-[#0A6E4F] font-medium text-sm flex items-center gap-2">
    <Info className="h-4 w-4" />
    Auto-assignment routes applications to the least-loaded HR rep in round-robin order.
  </p>
</div>

{/* Warning box — amber */}
<div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
  <p className="text-amber-800 font-medium text-sm flex items-center gap-2">
    <AlertCircle className="h-4 w-4" />
    Offer letters must be sent within 48 hours of interview completion.
  </p>
</div>

{/* Relationship flow */}
<div className="bg-gray-50 rounded-xl p-6">
  <h4 className="font-semibold text-gray-900 mb-4 text-center">Entity Relationship</h4>
  <div className="flex items-center justify-center gap-4 flex-wrap">
    <div className="bg-blue-100 border border-blue-300 rounded-lg px-4 py-2">
      <span className="font-medium text-blue-800">1 Hospital</span>
    </div>
    <ArrowRight className="h-5 w-5 text-gray-400" />
    <div className="bg-teal-100 border border-teal-300 rounded-lg px-4 py-2">
      <span className="font-medium text-teal-800">N Jobs</span>
    </div>
    <ArrowRight className="h-5 w-5 text-gray-400" />
    <div className="bg-green-100 border border-green-300 rounded-lg px-4 py-2">
      <span className="font-medium text-green-800">M Applications</span>
    </div>
  </div>
</div>
```

---

## 13. Toggle / Switch Groups

For job type toggles (Full-Time / Part-Time, On-site / Remote):

```tsx
<div className="flex gap-3">
  {["FULL_TIME", "PART_TIME", "CONTRACT"].map(type => (
    <button
      key={type}
      onClick={() => setJobType(type)}
      className={`px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
        jobType === type
          ? "bg-[#0A6E4F] text-white border-[#0A6E4F]"
          : "bg-white text-slate-600 border-slate-200 hover:border-[#0A6E4F]"
      }`}
    >
      {type.replace("_", " ")}
    </button>
  ))}
</div>
```

---

## 14. Notification Bell

Reuse `notification-bell.tsx` with these type→route mappings:

| Notification Type | Action on click |
|-------------------|-----------------|
| `APPLICATION_RECEIVED` | Navigate to `/applications?id=<id>` |
| `INTERVIEW_SCHEDULED` | Navigate to `/interviews?id=<id>` |
| `OFFER_ACCEPTED` | Navigate to `/applications?id=<id>` |
| `STATUS_CHANGED` | Mark read, stay on page |
| `REMINDER` | Mark read, stay on page |

Smart click pattern (same as CarCart):
```ts
if (["APPLICATION_RECEIVED", "OFFER_ACCEPTED"].includes(type)) {
  router.push(`/applications?application=${metadata.applicationId}`);
  closeDropdown();
} else {
  markAsRead(notificationId);
}
```

---

## 15. Role System

| Role | Nav Items | Can Post Jobs | Can Apply | Can Shortlist |
|------|-----------|--------------|-----------|---------------|
| `SUPER_ADMIN` | All | Yes | No | Yes |
| `ADMIN` | All | Yes | No | Yes |
| `HR_MANAGER` | Dashboard, Jobs, Applications, Candidates, Leaves, Reports | Yes | No | Yes |
| `HR_EXECUTIVE` | Dashboard, Applications, Candidates, Leaves | No | No | Yes |
| `DOCTOR` | Dashboard, My Applications, Profile, Leaves | No | Yes | No |
| `NURSE` | Dashboard, My Applications, Profile, Leaves | No | Yes | No |
| `STAFF` | Dashboard, My Applications, Profile | No | Yes | No |

### Sidebar nav active state

```tsx
isActive && "bg-[#0A6E4F] text-white hover:bg-[#085940]"
```

---

## 16. Form Field Patterns

### Standard Input with Label

```tsx
<div className="space-y-1.5">
  <Label htmlFor="specialty" className="text-xs font-medium text-slate-600">
    Medical Specialty <span className="text-red-500">*</span>
  </Label>
  <Input
    id="specialty"
    placeholder="e.g. Cardiology, Neurology"
    className={validationErrors.specialty ? "border-red-400 focus:ring-red-400" : ""}
  />
  {validationErrors.specialty && (
    <p className="text-xs text-red-500">{validationErrors.specialty}</p>
  )}
</div>
```

### Select Dropdown

```tsx
<Select onValueChange={(val) => setFormData(p => ({ ...p, department: val }))}>
  <SelectTrigger>
    <SelectValue placeholder="Select Department" />
  </SelectTrigger>
  <SelectContent>
    {DEPARTMENTS.map(d => (
      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
    ))}
  </SelectContent>
</Select>
```

### Validation error display

```tsx
{/* Inline field error */}
<p className="text-xs text-red-500 mt-0.5 flex items-center gap-1">
  <AlertCircle className="h-3 w-3" /> This field is required
</p>

{/* Form-level summary box */}
<div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
  Please fix the errors above before submitting.
</div>
```

---

## 17. Toast Notifications Pattern

```ts
// lib/toast.ts — same pattern, new domain labels
export const jobToast = {
  success: (msg: string) => toast.success(msg, { description: "Job Board" }),
  error:   (msg: string) => toast.error(msg,   { description: "Job Board" }),
  apiError:(msg: string) => toast.error(`Error: ${msg}`, { description: "Please try again" }),
};

export const applicationToast = {
  success: (msg: string) => toast.success(msg, { description: "Applications" }),
  // ...
};
```

---

## 18. Skeleton Loading

```tsx
{/* Page skeleton while data loads */}
<div className="space-y-4">
  <Skeleton className="h-[120px] w-full rounded-xl" />   {/* Hero card */}
  <div className="grid grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => (
      <Skeleton key={i} className="h-24 rounded-xl" />
    ))}
  </div>
  <Skeleton className="h-[400px] w-full rounded-xl" />   {/* Table */}
</div>
```

---

## 19. Key Lucide Icons for Medical Theme

```
Building2        — Hospital / clinic
Stethoscope      — Doctor role
HeartPulse       — Nurse / medical staff
Briefcase        — Job posting
Send             — Applied status
ClipboardList    — Requirements / checklist
UserCog          — HR Manager
Calendar         — Interview scheduled
CheckCircle2     — Joined / confirmed
XCircle          — Rejected
Pause            — Withdrawn
Zap              — Offer sent (urgent)
Shield           — Admin / compliance
FileText         — Resume / document
Search           — Screening
Award            — Top candidate
Bell             — Notifications
LogOut           — Sign out
ChevronDown      — Dropdown arrow
ArrowRight       — Pipeline flow
Info             — Tip callouts
AlertCircle      — Warnings
```

---

## 20. Component File Naming Convention

```
app/
├── (auth)/login/         page.tsx
├── dashboard/            page.tsx  loading.tsx
├── jobs/                 page.tsx  loading.tsx
├── applications/         page.tsx  loading.tsx
├── candidates/           page.tsx  loading.tsx
├── interviews/           page.tsx  loading.tsx
├── hospitals/            page.tsx  loading.tsx
├── users/                page.tsx
├── leaves/               page.tsx
├── reports/              page.tsx
└── settings/             page.tsx

components/
├── layout/
│   ├── app-header.tsx
│   ├── app-sidebar.tsx
│   └── app-layout.tsx
├── modals/
│   ├── post-job-modal.tsx
│   ├── view-application-modal.tsx
│   ├── add-candidate-modal.tsx
│   ├── schedule-interview-modal.tsx
│   └── send-offer-modal.tsx
├── dashboard/
│   ├── KpiCards.tsx
│   ├── RecentApplications.tsx
│   └── UpcomingInterviews.tsx
├── notifications/
│   └── notification-bell.tsx
├── system-guide.tsx      (portal help/docs)
└── ui/                   (shadcn base components)

lib/
├── api/
│   ├── jobs.ts
│   ├── applications.ts
│   ├── candidates.ts
│   ├── interviews.ts
│   └── in-app-notifications.ts
├── types.ts
├── toast.ts              (jobToast, applicationToast, showToast)
└── auth-utils.ts
```

---

## 21. Quick Copy — Primary Button

```tsx
{/* Primary CTA */}
<Button className="bg-[#0A6E4F] hover:bg-[#085940] text-white font-semibold">
  Post Job
</Button>

{/* Destructive */}
<Button variant="destructive">Reject Application</Button>

{/* Outline secondary */}
<Button variant="outline" className="border-[#0A6E4F] text-[#0A6E4F] hover:bg-[#E6F4F0]">
  Save Draft
</Button>

{/* Ghost */}
<Button variant="ghost" className="text-slate-600 hover:bg-slate-100">
  Cancel
</Button>
```

---

## 22. Design Principles (from CarCart)

1. **Tinted section headers** inside modals/cards visually separate sections without hard borders
2. **Gradient hero cards** at the top of overview/guide pages set context immediately
3. **Role-colored stat tiles** (`bg-white/10` on gradient) — quick visual summary of user types
4. **Icon + content rows** with a colored icon box (`p-2 bg-blue-100 rounded-lg`) for readable lists
5. **Animated profile dropdown** with cubic-bezier + shadow — premium feel, single component
6. **No detail pages** — everything in modals (view, edit, delete) to keep UX in-context
7. **10 items per page** for all lists — consistent pagination across tables
8. **Optimistic UI** — mark read / status change reflects instantly, no refetch flicker
9. **Empty states with action** — never a blank table, always a CTA
10. **Round-robin auto-assignment** with leave awareness — same logic applies for HR → recruiter assignment

---

*Reference: CarCart CRM system-guide.tsx + app-header.tsx + app-sidebar.tsx design patterns — replicated for MedPortal medical/healthcare theme.*
