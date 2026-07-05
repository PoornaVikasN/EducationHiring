# DATA_MODEL.md — School Teacher

> Collection schemas, enum registry, indexes, and cross-cutting patterns.
> Types shown as TypeScript for clarity; actual Mongoose `@Prop()` decorators
> in `eduhire-backend/src/modules/*/schemas/*.schema.ts`.

---

## 1. Cross-Cutting Patterns (do these day 1)

### 1.1 Nullable geo location — use a sub-Schema class
Mongoose 9 rejects `default: null` / `default: undefined` on inline nested paths and crashes at schema-build (BUG_PATTERNS BE-14). Every geo field:

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

Apply the 2dsphere index only in `Schema.index({ location: '2dsphere' }, { sparse: true })`.

### 1.2 `tokenVersion` on User
```ts
@Prop({ type: Number, default: 0 })
tokenVersion!: number;
```
Embedded in JWT as `tv`. `JwtStrategy.validate()` rejects tokens where `payload.tv !== user.tokenVersion`. Bump on password change / reset / forced logout via `$inc: { tokenVersion: 1 }`.

### 1.3 Never mix `@Prop({ index: true })` and `Schema.index()`
Two identical indexes → Mongoose warning + Atlas may refuse to build. Use `@Prop({ index: true })` for single-field; `Schema.index()` for compound. Never both for the same field (BUG_PATTERNS BE-4).

### 1.4 Never use `{ new: true }` on `findOneAndUpdate`
Mongoose 9 dropped it. Use `{ returnDocument: 'after' }` (BUG_PATTERNS BE-5).

### 1.5 String-or-null unions need explicit `type: String`
```ts
@Prop({ type: String, default: null })  // ← type: String is REQUIRED even though it looks redundant
field?: string | null;
```
Without it, NestJS Mongoose throws `CannotDetermineTypeError` at boot for `string | null` unions.

### 1.6 Timestamps + soft-delete on every collection
Every collection gets `timestamps: true` (adds `createdAt`, `updatedAt`) and a nullable `deletedAt: Date | null` for soft-deletes. Filter `deletedAt: null` on every read.

---

## 2. Enum Registry (`eduhire-backend/src/shared/enums/index.ts`)

```ts
export enum Role {
  TEACHER = 'TEACHER',
  SCHOOL_ADMIN = 'SCHOOL_ADMIN',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum PostingType {
  URGENT = 'URGENT',      // substitute / short-notice
  PERMANENT = 'PERMANENT', // long-term contract
}

export enum PostingStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING_SUBSCRIPTION = 'PENDING_SUBSCRIPTION',
  ACTIVE = 'ACTIVE',
  FILLED = 'FILLED',
  EXPIRED = 'EXPIRED',
  AUTO_DISABLED = 'AUTO_DISABLED',
  DISABLED_BY_ADMIN = 'DISABLED_BY_ADMIN',
}

export enum ApplicationState {
  INTERESTED = 'INTERESTED',
  SHORTLISTED = 'SHORTLISTED',
  PAID = 'PAID',
  WON = 'WON',
  CLOSED = 'CLOSED',
}

export enum PaymentKind {
  PERMANENT_POST = 'PERMANENT_POST',
  APPLICATION = 'APPLICATION',
  SCHOOL_URGENT_SUBSCRIPTION = 'SCHOOL_URGENT_SUBSCRIPTION',
  TEACHER_URGENT_SUBSCRIPTION = 'TEACHER_URGENT_SUBSCRIPTION',
  BOOST = 'BOOST',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum UploadKind {
  RESUME = 'resume',
  LOGO = 'logo',                    // school logo
  CERTIFICATE = 'certificate',       // teacher certificate
  DOCUMENT = 'document',             // school registration doc etc.
  SCHOOL_PHOTO = 'school_photo',
  PROFILE_PHOTO = 'profile_photo',
}

// Grade taxonomy — TBD by client; placeholder
export enum GradeLevel {
  PRE_PRIMARY = 'PRE_PRIMARY',
  PRIMARY = 'PRIMARY',
  MIDDLE = 'MIDDLE',
  SECONDARY = 'SECONDARY',
  SENIOR_SECONDARY = 'SENIOR_SECONDARY',
  UG = 'UG',
  PG = 'PG',
}

// Subject taxonomy — TBD by client; placeholder
export enum Subject {
  ENGLISH = 'ENGLISH',
  HINDI = 'HINDI',
  MATHS = 'MATHS',
  PHYSICS = 'PHYSICS',
  CHEMISTRY = 'CHEMISTRY',
  BIOLOGY = 'BIOLOGY',
  COMPUTER_SCIENCE = 'COMPUTER_SCIENCE',
  SOCIAL_STUDIES = 'SOCIAL_STUDIES',
  ARTS = 'ARTS',
  SPORTS = 'SPORTS',
  MUSIC = 'MUSIC',
  OTHER = 'OTHER',
}

export enum NotificationKind {
  // Teacher-facing
  APPLICATION_RECEIVED = 'APPLICATION_RECEIVED',
  APPLICATION_SHORTLISTED = 'APPLICATION_SHORTLISTED',
  APPLICATION_WON = 'APPLICATION_WON',
  APPLICATION_CLOSED = 'APPLICATION_CLOSED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  NEW_POSTING_IN_LOCATION = 'NEW_POSTING_IN_LOCATION',
  URGENT_POSTING_BROADCAST = 'URGENT_POSTING_BROADCAST',
  SUBSCRIPTION_ACTIVATED = 'SUBSCRIPTION_ACTIVATED',
  CHAT_MESSAGE = 'CHAT_MESSAGE',              // Phase 1 chat
  // School-Admin-facing
  NEW_INTEREST = 'NEW_INTEREST',
  APPLICANT_PAID = 'APPLICANT_PAID',
  POSTING_FILLED = 'POSTING_FILLED',
  POSTING_EXPIRING_SOON = 'POSTING_EXPIRING_SOON',
  POSTING_AUTO_DISABLED = 'POSTING_AUTO_DISABLED',
  SUB_RENEWED = 'SUB_RENEWED',
  SUB_RENEWAL_FAILED = 'SUB_RENEWAL_FAILED',
  SCHOOL_VERIFIED = 'SCHOOL_VERIFIED',
  SCHOOL_REGISTERED = 'SCHOOL_REGISTERED',
  // System
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}
```

**Every new `NotificationKind` value MUST come with**: (1) an `emit` in the service that produces the event, (2) an `@OnEvent()` handler in `NotificationsService`. Enum + emit + handler are a trio (BUG_PATTERNS BE-9).

---

## 3. Collections

### 3.1 `users`

```ts
{
  _id: ObjectId,
  email: string,                  // lowercase, unique
  phone?: string | null,          // +91XXXXXXXXXX, unique sparse
  passwordHash?: string | null,   // null if Google-only user
  role: Role,
  status: UserStatus,
  isActive: boolean,              // default true; toggled by admin
  emailVerified: boolean,
  tokenVersion: number,           // default 0; bumped on password change/reset
  googleId?: string | null,       // for Google-linked users

  teacherProfile?: {              // only when role === TEACHER
    fullName?: string,
    headline?: string,
    bio?: string,
    subjects?: Subject[],
    gradeLevels?: GradeLevel[],
    experienceYears?: number,
    resumeUrl?: string | null,    // S3 URL, verified via uploads.verifyUploadKey on save
    profilePhotoUrl?: string | null,
    certUrls?: string[],
    city?: string,
    state?: string,
    pincode?: string,
    location?: LocationSchema | null,      // sub-schema, see §1.1
    desiredCities?: string[],
    desiredSubjects?: Subject[],
    whatsappNumber?: string | null,
    whatsappVerified?: boolean,
    alertUrgentPostings?: boolean,          // default true
    alertPermanentPostings?: boolean,       // default true
  } | null,

  schoolAdminProfile?: {          // only when role === SCHOOL_ADMIN
    fullName?: string,
    schoolId?: ObjectId | null,   // populated after school created
  } | null,

  pushSubscription?: string | null,  // JSON-stringified Web Push subscription
  urgentSubscribedUntil?: Date | null,  // teacher's urgent-access subscription expiry

  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null,
}
```

Indexes: `{email:1}` unique, `{phone:1}` unique sparse, `{'teacherProfile.location': '2dsphere'}` sparse, `{'teacherProfile.desiredCities': 1}` sparse.

### 3.2 `schools`

```ts
{
  _id: ObjectId,
  name: string,
  registrationNumber: string,        // unique
  adminUserId: ObjectId,             // ref User
  logoUrl?: string | null,           // verified via uploads.verifyUploadKey
  photos?: string[],                 // hospital_photo kind; each verified
  documents?: string[],              // document kind; each verified
  description?: string | null,
  website?: string | null,
  address: string,
  city: string,
  state: string,
  pincode: string,
  location?: LocationSchema | null,  // sub-schema §1.1
  contactEmail: string,
  contactPhone: string,
  boardAffiliations?: string[],      // CBSE, ICSE, State board, etc.
  gradeLevelsOffered?: GradeLevel[],
  subjectsOffered?: Subject[],
  totalStrength?: number | null,     // student count
  totalStaff?: number | null,
  yearEstablished?: number | null,
  verificationStatus: VerificationStatus,
  rejectionReason?: string | null,
  isVerified: boolean,               // derived from verificationStatus === VERIFIED
  urgentSubscribedUntil?: Date | null,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null,
}
```

Indexes: `{registrationNumber:1}` unique, `{adminUserId:1}`, `{city:1, state:1, isVerified:1}`, `{location: '2dsphere'}` sparse.

### 3.3 `postings`

```ts
{
  _id: ObjectId,
  schoolId: ObjectId,                // ref School
  postedByUserId: ObjectId,          // ref User (the school-admin)
  type: PostingType,
  title: string,
  description: string,
  subject: Subject,
  gradeLevel: GradeLevel,
  experienceMinYears?: number,
  experienceMaxYears?: number,
  salaryMinPaise: number,            // monthly, paise
  salaryMaxPaise: number,
  city: string,
  state: string,
  location?: LocationSchema | null,
  openPositions: number,             // default 1
  filledPositions: number,           // default 0
  status: PostingStatus,
  // URGENT-only optional fields
  startAt?: Date | null,             // shift start
  endAt?: Date | null,               // shift end
  feeAmountPaise?: number | null,    // flat fee for urgent (paise)
  // Common
  jobDocumentUrl?: string | null,    // verified via uploads.verifyUploadKey
  activatedAt?: Date | null,
  expiresAt?: Date | null,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null,
}
```

Indexes: `{schoolId:1, status:1}`, `{status:1, city:1, subject:1}`, `{status:1, expiresAt:1}` (for expiry cron), `{location: '2dsphere'}` sparse, `{createdAt:-1}`.

### 3.4 `applications`

```ts
{
  _id: ObjectId,
  postingId: ObjectId,               // ref Posting
  teacherId: ObjectId,               // ref User
  schoolId: ObjectId,                // denormalized for fast reads
  state: ApplicationState,
  resumeSnapshotUrl?: string | null, // immutable copy at apply time
  coverLetter?: string | null,
  paymentDueBy?: Date | null,        // set when shortlisted; 48h window
  paymentId?: ObjectId | null,       // ref Payment; set on PAID
  decisionReason?: string | null,    // set on CLOSED
  decisionAt?: Date | null,
  chatRoomId?: ObjectId | null,      // Phase 1 — created on PAID
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null,
}
```

Indexes: `{postingId:1, state:1}`, `{teacherId:1, state:1}`, `{schoolId:1, state:1}`, unique `{postingId:1, teacherId:1}` (prevents double-apply).

### 3.5 `payments`

```ts
{
  _id: ObjectId,
  userId: ObjectId,                       // who paid
  kind: PaymentKind,
  amountPaise: number,
  status: PaymentStatus,                  // PENDING → PAID | FAILED
  razorpayOrderId: string,                // UNIQUE — idempotency root
  razorpayPaymentId?: string | null,      // sparse
  entityId?: ObjectId | null,             // postingId | applicationId | schoolId
  fulfilledAt?: Date | null,
  createdAt: Date,
  updatedAt: Date,
  deletedAt: Date | null,
}
```

Indexes: `{razorpayOrderId:1}` unique, `{userId:1, kind:1, status:1}`, `{status:1, createdAt:1}` (reconciliation cron).

### 3.6 `subscriptions`

```ts
{
  _id: ObjectId,
  userId: ObjectId,                       // school-admin OR teacher
  kind: 'SCHOOL_URGENT' | 'TEACHER_URGENT',
  status: 'ACTIVE' | 'CANCELLED' | 'EXPIRED' | 'PAYMENT_FAILED',
  startsAt: Date,
  expiresAt: Date,
  lastPaymentId?: ObjectId | null,
  autoRenew: boolean,                     // decision TBD
  createdAt: Date,
  updatedAt: Date,
}
```

### 3.7 `chat_rooms` *(Phase 1)*

```ts
{
  _id: ObjectId,
  applicationId: ObjectId,                // unique — one room per application
  participants: ObjectId[],               // [teacherId, schoolAdminId]
  lastMessageAt?: Date | null,
  createdAt: Date,
}
```

### 3.8 `chat_messages` *(Phase 1)*

```ts
{
  _id: ObjectId,
  roomId: ObjectId,
  senderId: ObjectId,
  body: string,                           // max 4000 chars
  readByRecipient: boolean,               // default false
  createdAt: Date,
}
```

Indexes: `{roomId:1, createdAt:-1}`, `{roomId:1, senderId:1, readByRecipient:1}` (for unread counts).

### 3.9 `system_config`

```ts
{
  _id: ObjectId,
  key: string,                            // unique
  type: 'price' | 'setting' | 'api_key',
  label: string,
  description: string,
  valueNumber?: number | null,            // for price + setting
  valueString?: string | null,            // encrypted for api_key
  minValue?: number,                      // for price + setting
  maxValue?: number | null,               // optional cap for setting
  displayKind?: 'boolean' | 'number' | null,   // FE render hint
  unit?: string | null,                   // e.g. 'km', '₹', ''
  updatedByAdminId?: ObjectId | null,
  createdAt: Date,
  updatedAt: Date,
}
```

Indexes: `{key:1}` unique.

**Pricing seeding is deferred to admin UI** — the seed loop only sets up settings and empty api_key placeholders. Prices are populated by admin at go-live time. `getPricePaise(key)` throws `InternalServerErrorException` if the key is missing → forces admin to configure before payment endpoints work.

### 3.10 `audit_logs`

```ts
{
  _id: ObjectId,
  adminId?: ObjectId | null,              // null for anonymous auth events
  adminEmail?: string | null,
  action: string,                         // 'AUTH_FAILED' | 'OTP_LOCKED' | 'SCHOOL_VERIFIED' | ...
  targetType?: string | null,
  targetId?: string | null,
  targetLabel?: string | null,
  before?: unknown,
  after?: unknown,
  ip?: string | null,
  userAgent?: string | null,
  reason?: string | null,
  createdAt: Date,
}
```

Indexes: `{createdAt:-1}`, `{action:1, createdAt:-1}`.

### 3.11 `notifications`

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  kind: NotificationKind,
  title: string,
  body: string,
  link?: string | null,
  read: boolean,                          // default false
  createdAt: Date,
}
```

Indexes: `{userId:1, createdAt:-1}`, `{userId:1, read:1, createdAt:-1}`.

### 3.12 `otps`

```ts
{
  _id: ObjectId,
  phoneHash: string,           // legacy field name — actually SHA-256(email.toLowerCase()) OR phone. See BUG_PATTERNS BE-7.
  codeHash: string,            // bcrypt
  attempts: number,            // default 0; lock at 5
  expiresAt: Date,             // TTL index
  createdAt: Date,
}
```

Indexes: `{phoneHash:1}` unique, `{expiresAt:1}` TTL (delete after expiry).

### 3.13 `refresh_token_blacklist`

```ts
{
  _id: ObjectId,
  jti: string,                 // JWT ID; unique
  userId: ObjectId,
  reason: 'LOGOUT' | 'PASSWORD_CHANGE' | 'ADMIN_REVOKE',
  expiresAt: Date,             // TTL index — auto-clean when token would have expired anyway
}
```

---

## 4. Notes on Field Naming

- `resumeUrl`, `logoUrl`, `photos`, `documents`, `jobDocumentUrl` are the **full public URLs** (e.g. `https://<bucket>.s3.amazonaws.com/resume/<userId>/<uuid>.pdf`). BE strips the URL to a key when calling S3 HeadObject via `uploadsService.verifyUploadKey()`.
- `paise` fields are integers. Never floats. Divide by 100 at UI edge.
- Sub-schemas are always `@Schema({_id:false})` — no phantom `_id` on nested objects.
- `deletedAt: Date | null` on every collection; every read filters `deletedAt: null`.
- Dates are stored UTC; formatted IST at UI edge (`formatDateTimeIST` helper).

---

## 5. Migration / Seeding Notes

- **No pricing seed** — admin configures via UI. `SystemConfig` seed only creates rows for **settings** (e.g. `JOB_ALERT_RADIUS_KM` = 30, `URGENT_ALERT_ALL_TEACHERS` = 1) and stub rows for `api_key` types (empty string, admin fills).
- **Reset instructions** for dev: `db.dropDatabase()` then restart BE — `onModuleInit` will re-seed the setting rows and empty api-key placeholders.
