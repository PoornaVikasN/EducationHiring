# DATA_MODEL.md — School Teacher

> Collection schemas, enum registry, indexes, and cross-cutting patterns.
> Rewritten 2026-07-09 directly from the current codebase (previous version predated
> implementation and had drifted badly — wrong Role values, a `postings`/`PostingType`/
> `PostingStatus`/`GradeLevel` model that was never built, `teacherProfile`/`schoolAdminProfile`
> field names that don't exist). This version is ground truth as of that date; re-verify against
> `eduhire-backend/src/modules/*/schemas/*.schema.ts` and `eduhire-backend/src/shared/enums/index.ts`
> before trusting field-level detail on anything touched since.

---

## 1. Cross-Cutting Patterns

### 1.1 Geo location — two different patterns are actually in use
`School.location` and `Job.location` use a real embedded sub-schema class:
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
`User.seekerProfile.location`, by contrast, is typed as a bare `{ type: Object, default: null }` —
not a real sub-schema, just a generic object shaped like GeoJSON. Don't assume the two are
interchangeable when writing geo-query code.

2dsphere indexes are applied separately: `SchoolSchema.index({ location: '2dsphere' }, { sparse: true })`,
`JobSchema.index({ location: '2dsphere' })`, `UserSchema.index({ 'seekerProfile.location': '2dsphere' }, { sparse: true })`.

### 1.2 `tokenVersion` on User
```ts
@Prop({ type: Number, default: 0 })
tokenVersion!: number;
```
Embedded in JWT as `tv`. `JwtStrategy.validate()` rejects tokens where `payload.tv !== user.tokenVersion`.
Bumped on password change/reset and admin delete/restore (`DECISIONS.md` D46) to force-invalidate
existing access tokens. Tokens issued before this field existed lack `tv`, treated as version 0.

### 1.3 Never mix `@Prop({ index: true })` and `Schema.index()`
Two identical indexes → Mongoose warning + Atlas may refuse to build. Use `@Prop({ index: true })`
for single-field; `Schema.index()` for compound (BUG_PATTERNS BE-4).

### 1.4 Never use `{ new: true }` on `findOneAndUpdate`
Mongoose 9 dropped it. Use `{ returnDocument: 'after' }` (BUG_PATTERNS BE-5).

### 1.5 String-or-null unions need explicit `type: String`
```ts
@Prop({ type: String, default: null })  // ← type: String is REQUIRED even though it looks redundant
field?: string | null;
```
Without it, NestJS Mongoose throws `CannotDetermineTypeError` at boot for `string | null` unions.

### 1.6 Timestamps + soft-delete — not actually universal
Most collections get `timestamps: true` and a nullable `deletedAt: Date | null`, filtered to
`null` on reads. But it's not universal — check before assuming:
- `SystemConfig`, `LegalPage`, `EmailTemplate`, `AuditLog`, `Otp` have `timestamps: true` but
  **no `deletedAt`** (they're not soft-deletable domain entities).
- `RefreshTokenBlacklist` has **neither** `timestamps` nor `deletedAt` — it's a pure TTL-expiring
  record (`expireAfterSeconds: 0` index on `expiresAt`), self-cleaning by design.
- `ChatMessage` has `timestamps: true`, no `deletedAt` (messages aren't soft-deleted).

### 1.7 Partial-update anti-pattern (the recurring real bug in this codebase)
`Object.assign(doc, { ...dto }); await doc.save();` on a partial-update DTO will overwrite
`required` schema fields with `undefined` if the caller omits them — class-transformer sets every
declared DTO property as an own key, including `undefined` ones. Filter to defined keys only, or
assign field-by-field with explicit `!== undefined` guards. This exact bug was found and fixed in
`EmailTemplatesService.update()` (`DECISIONS.md`, Phase 1/rigor-verification pass) — grep for the
pattern before adding a new partial-update method.

---

## 2. Enum Registry (`eduhire-backend/src/shared/enums/index.ts`)

Ground truth as of 2026-07-09 — 19 enums, verbatim member lists. Some are defined but not
currently referenced by any schema field (noted inline); don't assume "exists in this file" means
"enforced somewhere."

```ts
export enum Role { TEACHER = 'TEACHER', RECRUITER = 'RECRUITER', ADMIN = 'ADMIN' }

export enum UserStatus { ACTIVE = 'ACTIVE', SUSPENDED = 'SUSPENDED', PENDING_VERIFICATION = 'PENDING_VERIFICATION' }

// Defined but NOT referenced by User.seekerProfile.gender, which is a plain unenforced String prop.
export enum Gender { MALE = 'MALE', FEMALE = 'FEMALE', OTHER = 'OTHER', PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY' }

export enum Availability {
  IMMEDIATE = 'IMMEDIATE', WITHIN_2_WEEKS = 'WITHIN_2_WEEKS', WITHIN_1_MONTH = 'WITHIN_1_MONTH',
  READY_TO_SERVE_NOTICE = 'READY_TO_SERVE_NOTICE', NOT_LOOKING = 'NOT_LOOKING',
}

export enum JobStatus { ACTIVE = 'ACTIVE', FILLED = 'FILLED', EXPIRED = 'EXPIRED', AUTO_DISABLED = 'AUTO_DISABLED', DISABLED_BY_ADMIN = 'DISABLED_BY_ADMIN' }

// INTERESTED → SHORTLISTED → PAID → WON       (TEACHER_PAID_ENABLED on)
// INTERESTED → SHORTLISTED → WON | CLOSED     (TEACHER_PAID_ENABLED off — default)
export enum ApplicationState { INTERESTED = 'INTERESTED', SHORTLISTED = 'SHORTLISTED', PAID = 'PAID', WON = 'WON', CLOSED = 'CLOSED' }

export enum PaymentKind { APPLICATION = 'APPLICATION', SUBSCRIPTION = 'SUBSCRIPTION', BOOST = 'BOOST' }
export enum PaymentStatus { PENDING = 'PENDING', PAID = 'PAID', FAILED = 'FAILED', REFUNDED = 'REFUNDED' }
export enum SubscriptionStatus { ACTIVE = 'ACTIVE', CANCELLED = 'CANCELLED', EXPIRED = 'EXPIRED', PAYMENT_FAILED = 'PAYMENT_FAILED' }
export enum VerificationStatus { PENDING = 'PENDING', VERIFIED = 'VERIFIED', REJECTED = 'REJECTED' }

// Defined but not referenced by any @Prop() anywhere in src/ — dead enum, kept for future use.
export enum SchoolSize { SMALL_UNDER_50 = 'SMALL_UNDER_50', MEDIUM_50_200 = 'MEDIUM_50_200', LARGE_200_500 = 'LARGE_200_500', XLARGE_OVER_500 = 'XLARGE_OVER_500' }

export enum MaritalStatus { SINGLE = 'SINGLE', MARRIED = 'MARRIED', DIVORCED = 'DIVORCED', WIDOWED = 'WIDOWED', PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY' }
export enum TypeOfPractice { FREELANCE = 'FREELANCE', REGULAR_JOB = 'REGULAR_JOB', PRIVATE = 'PRIVATE' }
export enum SalaryRange { BELOW_25K = 'BELOW_25K', RANGE_25_50K = 'RANGE_25_50K', RANGE_50K_1L = 'RANGE_50K_1L', RANGE_1L_1_5L = 'RANGE_1L_1_5L', RANGE_1_5L_2L = 'RANGE_1_5L_2L', ABOVE_2L = 'ABOVE_2L' }

// 26 values, expanded 2026-07-09 (DECISIONS.md §3/D48). Used by: User.seekerProfile.expertise[],
// User.seekerProfile.interestedToCover[], School.departments[], Job.specializations[].
export enum Subject {
  PRIMARY, ENGLISH, MATHEMATICS, SCIENCE, PHYSICS, CHEMISTRY, BIOLOGY, SOCIAL_STUDIES, HINDI,
  COMPUTER_SCIENCE, TELUGU, HISTORY, GEOGRAPHY, ECONOMICS, BUSINESS_STUDIES, ACCOUNTANCY,
  INFORMATION_TECHNOLOGY, ART_CRAFTS, MUSIC, DANCE, ENVIRONMENTAL_SCIENCE, PRE_PRIMARY_EDUCATION,
  SPECIAL_EDUCATION, SCHOOL_ADMINISTRATION, COUNSELING, OTHERS,
}

// 14 values, expanded 2026-07-09 (DECISIONS.md §3/D48). Used by: Job.role, User.seekerProfile.academics
// (repurposed from a dead "Academics" enum in Phase 3, DECISIONS.md D50 — see §4 note below).
export enum TeacherPost {
  SGT, TGT, PGT, PRE_PRIMARY_TEACHER, HM, PRINCIPAL, VICE_PRINCIPAL, SPECIAL_EDUCATOR,
  LAB_ASSISTANT, LIBRARIAN, COUNSELOR, IIT_JEE_FACULTY, NEET_FACULTY, OTHER,
}

// New 2026-07-09 (DECISIONS.md §3/D48). Grade-level/section for a job posting — distinct from
// Subject (what's taught). Used only by Job.department (required) and Job.departmentRequirements[].
export enum JobDepartment {
  PRE_PRIMARY, PRIMARY, SECONDARY, SENIOR_SECONDARY, ARTS_CRAFTS, COMPUTER_SCIENCE,
  PHYSICAL_EDUCATION, ADMINISTRATION, LIBRARY, COUNSELING, OTHER,
}

export enum AvailableTimings { TWENTY_FOUR_SEVEN = '24_7', MORNING = 'MORNING', NIGHT = 'NIGHT', NINE_TO_FIVE = '9_TO_5', EVENING = 'EVENING' }

export enum NotificationKind {
  // Teacher-facing
  APPLICATION_SHORTLISTED, APPLICATION_WON, APPLICATION_CLOSED, PAYMENT_SUCCESS, PAYMENT_FAILED, NEW_JOB_IN_LOCATION,
  // Recruiter-facing
  NEW_INTEREST, APPLICANT_PAID, JOB_FILLED, JOB_EXPIRING_SOON, JOB_AUTO_DISABLED, SUB_RENEWED, SUB_RENEWAL_FAILED, SCHOOL_VERIFIED,
  // Admin-facing
  SCHOOL_REGISTERED, SYSTEM_ALERT,
}
```
(`Subject`/`TeacherPost`/`JobDepartment`/`NotificationKind` member lists abbreviated to names only
above for scannability — values are the same string as the name in every case except
`AvailableTimings`. Full `= '...'` assignments are in the source file.)

**`GradeLevel` does not exist** — the old doc's placeholder was never implemented. `JobDepartment`
is the nearest real concept but is scoped only to `Job`, not `User`/`School`.

**Locally-defined enums NOT in this registry file** (defined inline in their own schema file
instead): `DisputeStatus`, `DisputeKind` in `modules/disputes/schemas/dispute.schema.ts`.
`SystemConfig.type` is a bare string-literal union (`'price' | 'api_key' | 'setting'`), not a
`shared/enums` reference.

**Frontend mirror**: `eduhire-frontend/lib/shared/enums.ts` — manually kept in sync, no
build-time check. When editing an enum, grep both files.

**Every new `NotificationKind` value MUST come with**: (1) an `emit` in the service that produces
the event, (2) an `@OnEvent()` handler in `NotificationsService`. Enum + emit + handler are a trio
(BUG_PATTERNS BE-9).

---

## 3. Collections

### 3.1 `users`

```ts
{
  _id: ObjectId,
  role: Role,                        // required, indexed
  email?: string,                    // unique sparse, lowercase, trim
  phone?: string,                    // unique sparse, trim
  passwordHash: string | null,       // null = Google-only account
  googleId: string | null,           // indexed, sparse
  emailVerified: boolean,
  phoneVerified: boolean,
  isActive: boolean,                 // default true; admin suspend toggle
  deletedAt: Date | null,
  pushSubscription: string | null,   // JSON-stringified Web Push subscription
  alertNewJobs: boolean,             // default true — seeker job-alert preference
  tokenVersion: number,              // default 0 — see §1.2

  seekerProfile: SeekerProfile | null,     // only when role === TEACHER
  recruiterProfile: RecruiterProfile | null, // only when role === RECRUITER

  createdAt: Date,
  updatedAt: Date,
}
```

**`SeekerProfile` sub-schema** (`_id: false`, embedded on `User.seekerProfile`):
```ts
{
  fullName: string,                  // required
  headline: string | null,
  bio: string | null,
  skills: string[],
  resumeUrl: string | null,
  introVideoUrl: string | null,
  certUrls: string[],
  city: string | null,
  state: string | null,
  availability: Availability | null,
  desiredCities: string[],
  experienceYears: number | null,
  age: number | null,
  gender: string | null,             // NOT enum-constrained despite Gender enum existing
  maritalStatus: MaritalStatus | null,
  degrees: string[],                 // free text — no Degree enum exists (deliberate, DECISIONS.md §15)
  whatsappNumber: string | null,
  whatsappVerified: boolean,
  pincode: string | null,
  currentSchool: string | null,      // renamed from placeOfPractice (DECISIONS.md D41/D50)
  employmentType: TypeOfPractice | null,   // renamed from typeOfPractice
  expertise: Subject[],              // renamed from a loose string[]; enum-enforced since Phase 3 (D50)
  academics: TeacherPost | null,     // repurposed from a dead Academics enum since Phase 3 (D50) —
                                      // "current/highest post held", NOT an academic-rank concept
  salaryRange: SalaryRange | null,
  availableTimings: AvailableTimings[],
  interestedToCover: Subject[],      // enum-enforced since Phase 3 (D50)
  indemnityInsurance: boolean | null,      // dead field — no UI control, pending client call (DECISIONS.md §14)
  isRegisteredWithBoard: boolean | null,   // renamed from isRegisteredInCouncil
  boardRegistrationName: string | null,    // renamed from medicalCouncilName
  location: { type: 'Point'; coordinates: [number, number] } | null,  // generic Object, not a real sub-schema — see §1.1
}
```

**`RecruiterProfile` sub-schema** (`_id: false`, embedded on `User.recruiterProfile`):
```ts
{
  fullName: string,                  // required
  schoolId: ObjectId | null,         // ref School, indexed
}
```

Indexes: `{email:1}` unique sparse, `{phone:1}` unique sparse, `{'seekerProfile.location':'2dsphere'}` sparse.

### 3.2 `schools`

```ts
{
  _id: ObjectId,
  name: string,                      // required
  registrationNumber: string,        // required, unique
  adminUserId: ObjectId,             // ref User, required, indexed
  logoUrl: string | null,
  address: string,                   // required
  city: string,                      // required, indexed
  state: string,                     // required
  pincode: string,                   // required
  contactEmail: string,              // required, lowercase, trim
  contactPhone: string,              // required, trim
  description: string | null,
  website: string | null,
  noOfClassrooms: number | null,     // renamed from noOfOperationTheatres (D47)
  campusFacilities: string[],        // renamed from hospitalInfra (D47)
  noOfLabsOrSpecialRooms: number | null,   // renamed from noOfCabinsAndBeds (D47)
  photos: string[],
  scopeOfServices: string | null,
  schoolStrength: number | null,     // renamed from hospitalStrength (D47)
  studentCapacity: number | null,    // renamed from noOfBeds (D47)
  accreditations: string[],
  departments: Subject[],            // enum-enforced (Object.values(Subject)) — this is Subject, not a distinct enum
  isVerified: boolean,
  verificationStatus: VerificationStatus,  // default PENDING
  location: { type: 'Point'; coordinates: [number, number] } | null,   // real LocationSchema sub-schema — see §1.1
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date,
}
```

Indexes: `{city:1, isVerified:1}`, `{location:'2dsphere'}` sparse. `SchoolSize` enum exists but is
not referenced here or anywhere else.

### 3.3 `jobs`

```ts
{
  _id: ObjectId,
  status: JobStatus,                 // default ACTIVE, indexed
  schoolId: ObjectId,                // ref School, required, indexed
  title: string,                     // required, trim
  description: string,               // required
  requirements: string[],
  city: string,                      // required, indexed
  state: string,                     // required
  location: { type: 'Point'; coordinates: [number, number] } | null,   // real LocationSchema sub-schema
  department: JobDepartment,         // required
  role: TeacherPost,                 // required
  experienceMin: number,             // required
  experienceMax: number,             // required
  salaryMin: number,                 // required, monthly rupees (not paise — see §5 caveat)
  salaryMax: number,                 // required
  expiresAt: Date,                   // required, indexed
  postPaymentId: string | null,      // legacy — retained for data compat, no longer set by create()
  isBoosted: boolean,
  jobTimingStart: string | null,
  jobTimingEnd: string | null,
  noOfCasesPerMonth: number | null,
  departmentRequirements: JobDepartment[],
  openPositions: number,             // default 1
  filledPositions: number,           // default 0
  jobDocumentUrl: string | null,
  specializations: Subject[],
  requiredDegree: string | null,     // free text — no Degree enum (shared with seekerProfile.degrees decision)
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date,
}
```

Indexes: `{location:'2dsphere'}`, `{status:1, city:1}`, `{schoolId:1, status:1}`, `{expiresAt:1, status:1}` (expiry cron).

Note: collection name is `jobs`, not `postings` — the old doc's `PostingType`/`PostingStatus`/
urgent-vs-permanent model was never built (superseded, `DECISIONS.md` D42-superseding: "no job
types at all, only FT jobs").

### 3.4 `applications`

```ts
{
  _id: ObjectId,
  jobId: ObjectId,                   // ref Job, required, indexed
  schoolId: ObjectId,                // ref School, required, indexed (denormalized)
  seekerId: ObjectId,                // ref User, required, indexed
  state: ApplicationState,           // default INTERESTED, indexed
  coverNote: string | null,
  shortlistedAt: Date | null,
  shortlistedByUserId: ObjectId | null,    // ref User
  paymentDueBy: Date | null,         // indexed — 48h window when TEACHER_PAID_ENABLED is on
  paidAt: Date | null,
  razorpayPaymentId: string | null,
  schoolRevealed: boolean,
  decisionReason: string | null,
  decisionAt: Date | null,
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date,
}
```

Indexes: `{jobId:1, seekerId:1}` unique sparse (prevents double-apply), `{seekerId:1, state:1}`,
`{jobId:1, state:1}`, `{state:1, paymentDueBy:1}` (pay-window sweep cron).

### 3.5 `payments`

```ts
{
  _id: ObjectId,
  userId: ObjectId,                  // ref User, required, indexed
  kind: PaymentKind,                 // required, indexed
  amountPaise: number,               // required — integer paise
  status: PaymentStatus,             // default PENDING, indexed
  razorpayOrderId: string,           // required, unique — idempotency root
  razorpayPaymentId: string | null,  // sparse
  entityId: ObjectId | null,         // polymorphic — jobId | applicationId | schoolId; no `ref` set
  fulfilledAt: Date | null,
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date,
}
```

Indexes: `{userId:1, kind:1, status:1}`, `{status:1, createdAt:1}` (reconciliation cron).

### 3.6 `subscriptions`

```ts
{
  _id: ObjectId,
  schoolId: ObjectId,                // ref School, required, indexed — NOT userId (school-level, not per-admin-user)
  status: SubscriptionStatus,        // default ACTIVE, indexed
  expiresAt: Date,                   // required, indexed
  razorpayPaymentId: string,         // required
  razorpayOrderId: string,           // required
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date,
}
```

Indexes: `{schoolId:1, status:1, expiresAt:1}`.

### 3.7 `chat_messages`

Flat message collection keyed by `applicationId` — **there is no separate `chat_rooms`
collection**; a "room" is just the set of messages sharing an `applicationId`. Defined at
`modules/chat/chat.schema.ts` (not under a `schemas/` subfolder, unlike every other module).

```ts
{
  _id: ObjectId,
  applicationId: ObjectId,           // required, indexed — no `ref` set
  senderId: ObjectId,                // required — no `ref` set
  senderRole: string,                // required — 'TEACHER' | 'RECRUITER', plain string not enum-typed
  text: string,                      // required, maxlength 2000
  read: boolean,                     // default false
  createdAt: Date,
  updatedAt: Date,
}
```

Indexes: `{applicationId:1, createdAt:1}`.

File-upload attachments (D39) are not implemented — text-only. Message length is 2000 chars (an
accidental split between the originally-discussed 500/4000 figures — still an open decision, see
`DECISIONS.md` §14/D40).

### 3.8 `system_configs`

```ts
{
  _id: ObjectId,
  key: string,                       // required, unique
  type: 'price' | 'api_key' | 'setting',   // required — bare string-literal union, not a shared enum
  label: string,                     // required
  description: string,               // required
  minValue: number,                  // required, default 100
  maxValue: number | null,
  valueNumber?: number,
  valueString?: string,
  displayKind: 'boolean' | 'number' | null,  // FE render hint
  unit: string,                      // default '' — display-only suffix (e.g. '₹', 'km')
  updatedByAdminId: ObjectId | null, // no `ref` set
  createdAt: Date,
  updatedAt: Date,
}
```

No compound indexes beyond field-level `unique: true` on `key`. Pricing rows are populated by
admin at go-live time, not auto-seeded — `SystemConfigService.getPricePaise(key)` throws if the
key is missing, forcing admin configuration before payment endpoints work.

### 3.9 `legal_pages`

```ts
{
  _id: ObjectId,
  key: string,                       // required, unique — 'terms' | 'privacy-policy'
  title: string,                     // required
  lastUpdatedLabel: string,          // required
  sections: { heading: string; body: string }[],   // body is an HTML string, rendered as-is on FE
  updatedByAdminId: ObjectId | null,
  createdAt: Date,
  updatedAt: Date,
}
```

### 3.10 `emailtemplates`

Collection name is the Mongoose-default pluralization (`emailtemplates`, no `collection` option
set) — inconsistent with every other collection's explicit snake_case name, worth knowing if
you're ever querying this collection directly via `mongosh`.

```ts
{
  _id: ObjectId,
  key: string,                       // required, unique
  name: string,                      // required
  trigger: string,                   // required
  description: string,               // required
  subject: string,                   // required
  body: string,                      // required
  variables: string[],
  isActive: boolean,                 // default true
  isSystem: boolean,                 // default true
  channels: {                        // inline object, not a separate @Schema class; _id: false
    seekerEmail: boolean,            // default true
    seekerInApp: boolean,            // default false
    recruiterEmail: boolean,         // default false
    recruiterInApp: boolean,         // default false
  },
  inAppSeekerTitle: string | null,
  inAppSeekerBody: string | null,
  inAppRecruiterTitle: string | null,
  inAppRecruiterBody: string | null,
  updatedByAdminId: ObjectId | null,
  createdAt: Date,
  updatedAt: Date,
}
```

### 3.11 `audit_logs`

```ts
{
  _id: ObjectId,
  adminId: ObjectId | null,          // indexed — nullable for anonymous/system events (failed logins, OTP lockouts)
  adminEmail: string | null,         // denormalized, avoids a User lookup on the audit page
  action: string,                    // required, indexed — e.g. PRICE_UPDATED, USER_SUSPENDED, AUTH_FAILED
  entityType: string,                // required, indexed — 'price' | 'user' | 'school' | 'api_key' | 'job' | 'auth'
  entityId?: string,
  entityLabel?: string,
  before?: Record<string, unknown>,
  after?: Record<string, unknown>,
  ip: string | null,
  userAgent: string | null,
  reason: string | null,
  createdAt: Date,                   // no updatedAt used
}
```

Indexes: `{createdAt:-1}`. No `deletedAt` — audit logs are immutable/append-only.

### 3.12 `notifications`

```ts
{
  _id: ObjectId,
  userId: ObjectId,                  // ref User, required, indexed
  kind: NotificationKind,            // required
  title: string,                     // required
  body: string,                      // required
  link: string | null,
  read: boolean,                     // default false
  deletedAt: Date | null,
  createdAt: Date,
  updatedAt: Date,
}
```

Indexes: `{userId:1, read:1, createdAt:-1}`.

### 3.13 `otps`

```ts
{
  _id: ObjectId,
  phoneHash: string,                 // required — SHA-256 hash; despite the name, holds email OR phone (BUG_PATTERNS BE-7)
  codeHash: string,                  // required — bcrypt
  attempts: number,                  // default 0
  expiresAt: Date,                   // required
  createdAt: Date,
  updatedAt: Date,
}
```

Indexes: `{expiresAt:1}` TTL (`expireAfterSeconds: 0`), `{phoneHash:1}` unique.

### 3.14 `refresh_token_blacklist`

No `timestamps`, no `deletedAt` — pure self-expiring record.

```ts
{
  _id: ObjectId,
  tokenHash: string,                 // required, indexed
  expiresAt: Date,                   // required
}
```

Indexes: `{expiresAt:1}` TTL (`expireAfterSeconds: 0`) — auto-deletes when the token would have
expired anyway.

### 3.15 `disputes`

Not documented in the previous version at all. Uses locally-defined enums (not in
`shared/enums/index.ts`): `DisputeStatus` (`OPEN`, `IN_REVIEW`, `RESOLVED`, `REJECTED`),
`DisputeKind` (`PAYMENT_REFUND`, `APPLICATION_DISPUTE`, `OTHER`).

```ts
{
  _id: ObjectId,
  raisedBy: ObjectId,                // ref User, required, indexed
  kind: DisputeKind,                 // required
  subject: string,                   // required, maxlength 200
  description: string,               // required, maxlength 2000
  referenceId?: string,
  status: DisputeStatus,             // default OPEN, indexed
  adminNote?: string,                // maxlength 2000
  resolvedAt?: Date,
  createdAt: Date,
  updatedAt: Date,
}
```

---

## 4. Notes on Field Naming

- `resumeUrl`, `logoUrl`, `photos`, `jobDocumentUrl`, `introVideoUrl`, `certUrls` are **full
  public URLs** (e.g. `https://<bucket>.s3.amazonaws.com/resume/<userId>/<uuid>.pdf`). The
  backend strips the URL to a key when calling S3 `HeadObject` via `UploadsService.verifyUploadKey()`
  before persisting it to any of these fields (`DECISIONS.md` D46/D18).
- `amountPaise` (`Payment`) is integer paise, never a float. `Job.salaryMin`/`salaryMax` are
  **plain monthly rupees**, not paise — don't assume every money-shaped field follows the paise
  convention; check the field name/comment.
- Sub-schemas are always `@Schema({_id:false})` — no phantom `_id` on nested objects, **except**
  `User.seekerProfile.location` and `School`/`Job`'s embedded `channels`-style objects, which
  aren't real `@Schema` classes at all (see §1.1 and §3.10).
- `deletedAt: Date | null` is present on most domain collections but not universal — see §1.6
  before assuming a collection is soft-deletable.
- Several rename waves have happened (`DECISIONS.md` D41 backend domain rename, D47 School field
  fixes, D50 Teacher profile field fixes) — if you find a field name in old code, a stale doc, or
  a screenshot that doesn't match what's listed above, the schema in this file is more current;
  re-verify against the actual `.schema.ts` file if in doubt, don't trust memory or old docs.

---

## 5. Migration / Seeding Notes

- **No pricing auto-seed.** `SystemConfig` seed only creates `setting`-type rows and stub
  `api_key` rows; `price`-type rows are configured by admin at go-live via Admin Settings →
  Pricing. `getPricePaise(key)` throws `InternalServerErrorException` if a price key is missing.
- **Reset instructions for dev**: drop the `eduhire` database, then restart the backend —
  `onModuleInit` seed hooks re-create admin users, `SystemConfig` setting rows, the 14 email
  templates, and the 2 legal pages. This was done once already this project (pre-Phase-1) to
  clear demo/seed data cleanly; safe to repeat as long as no real user data exists yet.
- As of 2026-07-09, the `eduhire` database holds only test/seed data from this session's live
  API verification passes (Phase 1/2/3) — no real production users. Re-check this assumption
  before treating any future schema change as migration-free.
