# BACKEND_GUIDE.md — School Teacher API (`eduhire-backend/`)

> Standards for the NestJS app. Module layout, Mongoose, auth, payments, and Do/Don't.
> Domain rules live in `PROJECT_BLUEPRINT.md`. Read that first.

---

## 1. Stack

| Concern | Tool | Notes |
|---|---|---|
| Framework | **NestJS 10** | Feature modules, DI, Express adapter |
| ODM | **Mongoose 9** | `@nestjs/mongoose` integration |
| Auth | **Passport** (jwt, google, local) + custom OTP guard | Phase 3 |
| Validation | **class-validator + class-transformer** | Global `ValidationPipe` (whitelist + forbidNonWhitelisted in `main.ts`) |
| Shared schemas with FE | None — manually mirror enums/constants from `src/shared/` into FE's `lib/shared/` | No `packages/shared`; manual sync is the discipline |
| Payments | `razorpay` SDK (Phase 3) | Webhook signature via HMAC SHA256 |
| File storage | `@aws-sdk/client-s3` + presigner (Phase 3) | Presigned PUT URLs |
| WhatsApp OTP | **Wylto WhatsApp API** (`WYLTO_API_TOKEN` env) | `POST https://server.wylto.com/api/v1/wa/send?sync=true` — template `verify_account` (Utility, approved). URL-button templates need `buttons: [{index:0, type:'url', text:'<domain>'}]`. Wrapped in `WhatsAppService` + `dispatchWhatsAppOtp()` in `UsersService`. MSG91 removed. |
| Email | **Gmail OAuth2 via nodemailer** — `GMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` env vars | Wrapped in `EmailService` (`src/modules/notifications/email.service.ts`). Uses `nodemailer.createTransport({ service: 'gmail', auth: { type: 'OAuth2', ... } })`. Brevo removed. Do NOT use basic SMTP password — only OAuth2 refresh-token flow works with GSuite. |
| Realtime | `@nestjs/websockets` + `socket.io` (Phase 3) | Gateway emits to `user:<id>` rooms |
| Scheduled jobs | `@nestjs/schedule` cron sweeps (Phase 3) | URGENT expiry (24h), full-time expiry (30d), shortlist pay-window (48h), payment reconciliation. **No Redis/BullMQ in MVP** — see §11. |
| Scheduling | `@nestjs/schedule` (Phase 3) | Cron for recurring checks |
| Logging | `Logger` (Nest default) → migrate to **Pino** (`nestjs-pino`) in Phase 3 | JSON logs, request-id correlation |
| Rate limit | `@nestjs/throttler` (already wired global at 100 req/min) | Stricter on `/auth/*` in Phase 3 |
| Security headers | `helmet` (already wired in `main.ts`) | CORS allowlist via `CORS_ORIGINS` env |
| Testing | **Jest** + **Supertest** + `mongodb-memory-server` (Phase 3) | Real Mongo for integration tests |
| Package manager | **npm** | `package-lock.json` is the lockfile of record |

## 2. Folder & Module Structure

Current state (Phase 1 — clean foundation):
```
eduhire-backend/src/
├── main.ts                      Bootstrap (helmet, CORS allowlist, ValidationPipe)
├── app/
│   ├── app.module.ts            Root: ConfigModule, MongooseModule, ThrottlerModule
│   ├── app.controller.ts        / (401 stub) and /health
│   └── app.service.ts           Health check (mongo + memory + uptime)
├── common/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   └── guards/
│       ├── jwt-auth.guard.ts    (extends AuthGuard('jwt'); strategy in Phase 3)
│       └── roles.guard.ts       (reads @Roles() metadata)
├── shared/                      ← Single source of truth for enums + constants
│   ├── enums/index.ts           Role, JobType, JobStatus, ApplicationState, ...
│   ├── constants/pricing.ts     APPLICATION_FEE_PAISE, FULL_TIME_POST_PAISE, ...
│   └── index.ts                 Barrel
└── utils/
    ├── index.ts                 getObjectId
    ├── date-ist.ts              IST formatters
    └── phone-normalizer.ts      E.164 helpers
```

**Phase 3 will add** `src/modules/` with one folder per feature:
```
src/modules/
├── auth/                        register, login, OTP, refresh, Google OAuth
│   ├── auth.module.ts · auth.controller.ts · auth.service.ts
│   ├── strategies/              jwt.strategy.ts, google.strategy.ts
│   ├── schemas/                 token.schema.ts, blacklist.schema.ts
│   ├── dto/ · guards/
├── users/                       seekers, recruiters, admins (single polymorphic collection)
│   ├── schemas/                 user.schema.ts (with embedded SeekerProfile)
├── schools/
│   ├── schemas/                 school.schema.ts
├── jobs/
│   ├── schemas/                 job.schema.ts
├── applications/
│   ├── schemas/                 application.schema.ts
├── payments/                    Razorpay order + webhook (idempotent)
│   ├── schemas/                 payment.schema.ts
├── subscriptions/               URGENT weekly subscriptions
├── notifications/               persisted notifications + Socket.IO gateway
├── uploads/                     S3 presigned URL endpoint
├── admin/                       admin-only endpoints
└── scheduler/                   @nestjs/schedule cron handlers (job-expiry, shortlist-expiry, payment-reconcile)
```

**Module rules:**
- One feature = one module. No god modules.
- Schemas live inside their owning module's `schemas/` folder. **No central `domain/schemas/` directory.**
- Controllers are thin: validate, call service, return. No logic.
- Services own business rules. Cross-module reactions go through `EventEmitter2`, not direct service calls across boundaries.

## 3. Mongoose Schema Conventions

```ts
@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({ type: String, enum: JobType, required: true, index: true })
  type!: JobType;

  @Prop({ type: String, enum: JobStatus, default: JobStatus.PENDING_PAYMENT, index: true })
  status!: JobStatus;

  @Prop({ type: Types.ObjectId, ref: 'School', required: true, index: true })
  schoolId!: Types.ObjectId;

  @Prop({ type: LocationSchema, required: true })
  location!: Location;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: Number, default: 0 })
  paidApplicationsCount!: number;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

JobSchema.index({ 'location.coords': '2dsphere' });
JobSchema.index({ status: 1, type: 1, 'location.city': 1 });
```

**Rules:**
1. `timestamps: true` everywhere — `createdAt` / `updatedAt` are free.
2. **Soft delete** via `deletedAt` (nullable Date). Never hard-delete; add a global query helper that filters `deletedAt: null` by default.
3. **Compound indexes** for every listing query — especially `(status, type, location.city)` for `/jobs`.
4. **Geo:** `location.coords` is `[lng, lat]` tuple with `2dsphere` index.
5. **ObjectId refs** for relations. Populate sparingly; prefer projected lookups.
6. **Enum values** imported from `src/shared/enums` — never inline string unions in schemas.
7. **No `Mixed` type** unless genuinely necessary. Define sub-schemas.
8. **Unique indexes** for natural keys: `users.email`, `schools.registrationNumber`, `payments.razorpayPaymentId`.

## 4. DTOs & Validation

**Single layer:** transport DTOs using class-validator. No shared Zod (since there's no `packages/shared`). The frontend defines its own Zod schemas mirroring the BE DTOs — manual sync.

```ts
export class CreateJobDto {
  @IsEnum(JobType) type!: JobType;
  @IsString() @MinLength(5) title!: string;
  @ValidateNested() @Type(() => LocationDto) location!: LocationDto;
}
```

`ValidationPipe` is wired globally in `main.ts` with `whitelist: true` + `forbidNonWhitelisted: true` + `transform: true` — extra fields are stripped, not just ignored.

## 4a. REST Conventions & Query Patterns

### URL & verb conventions

| Verb | Path | Action |
|---|---|---|
| `GET` | `/resource` | Paginated list with filters |
| `GET` | `/resource/:id` | Single document — ObjectId validated |
| `POST` | `/resource` | Create; return 201 + created document |
| `PATCH` | `/resource/:id` | Partial update; return updated document |
| `DELETE` | `/resource/:id` | Soft-delete (`deletedAt = now`); return 204 No Content |

Nested resources: `GET /jobs/:jobId/applications` — list scoped to parent. Same pagination shape.

### ObjectId param validation

Every `:id` param goes through `ParseObjectIdPipe` (in `src/common/pipes/parse-object-id.pipe.ts`). This throws a clean 400 before Mongoose ever sees a malformed value:

```ts
@Get(':id')
findOne(@Param('id', ParseObjectIdPipe) id: string) { ... }

@Patch(':id')
update(@Param('id', ParseObjectIdPipe) id: string, @Body() dto: UpdateJobDto) { ... }
```

`ParseObjectIdPipe` implementation:
```ts
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';

@Injectable()
export class ParseObjectIdPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`Invalid ObjectId: ${value}`);
    }
    return value;
  }
}
```

### Aggregation/Lookup pattern (never `.populate()` on hot paths)

Use `$aggregate` with `$lookup` for all GET list and GET one endpoints — single round-trip, projected at the DB layer:

```ts
// GET /jobs — list with school name + logo attached
const [results, total] = await Promise.all([
  this.jobModel.aggregate([
    { $match: { status: JobStatus.ACTIVE, deletedAt: null, ...buildMatchFilter(query) } },
    {
      $lookup: {
        from: 'schools',
        localField: 'schoolId',
        foreignField: '_id',
        as: 'school',
        pipeline: [{ $project: { name: 1, logoUrl: 1, city: 1 } }],
      },
    },
    { $unwind: '$school' },
    { $sort: { createdAt: -1 } },
    { $skip: (query.page - 1) * query.limit },
    { $limit: query.limit },
  ]),
  this.jobModel.countDocuments({ status: JobStatus.ACTIVE, deletedAt: null }),
]);
```

For GET one, same pattern — `{ $match: { _id: new Types.ObjectId(id), deletedAt: null } }` + any required lookups.

`$aggregate` returns plain POJOs — no `.toObject()` needed. Map to a response DTO before returning.

### Pagination & filter query params

Every list endpoint uses a typed `PaginationDto` base:

```ts
// src/common/dto/pagination.dto.ts
export class PaginationDto {
  @IsOptional() @IsInt() @Min(1) @Type(() => Number) page = 1;
  @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) limit = 20;
}

// Feature-level: extend PaginationDto
export class JobsQueryDto extends PaginationDto {
  @IsOptional() @IsString() search?: string;        // title text search
  @IsOptional() @IsEnum(JobType) type?: JobType;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsEnum(JobStatus) status?: JobStatus;
}
```

**Always return this shape from list endpoints:**
```json
{
  "data": [...],
  "meta": { "page": 1, "limit": 20, "total": 142, "totalPages": 8 }
}
```

Never return an unbounded array. The FE pagination component relies on this exact shape.

> **DTO `@Max` on `limit`:** Never set `@Max` below 200 on any `limit` pagination field. Admin bulk-fetch calls (dashboard charts, analytics) routinely send `limit: 100`. A lower `@Max` causes a 400 validation error; the React Query result is `undefined`; charts show "No data" silently. The default `@Max(200)` is safe — it's not unbounded because the field still requires an explicit value.

## 5. Error Envelope

Global filter (Phase 3) enforces uniform shape:

```json
{ "statusCode": 400, "error": "BadRequest", "message": "...", "details": { "field": "..." } }
```

Custom domain errors extend Nest exceptions:

```ts
export class ShortlistPayWindowExpiredException extends ConflictException {
  constructor() {
    super({
      code: 'SHORTLIST_PAY_WINDOW_EXPIRED',
      message:
        'The 48-hour payment window for this shortlist has expired. Ask the school to shortlist you again.',
    });
  }
}
```

FE's fetch wrapper reads `message` and `details.field` for form errors.

## 6. Auth (Phase 3)

### JWT
- **Access:** 15m, HS256, payload `{ sub, role, email }`. Signed with `JWT_ACCESS_SECRET`. Sent as `Authorization: Bearer <token>`.
- **Refresh:** 7d, signed with `JWT_REFRESH_SECRET` (different key). Delivered as httpOnly + `SameSite=lax` cookie **with `path: '/'`**. Rotated on every refresh — previous token hash blacklisted for its remaining lifetime.
- Env vars: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`.
- `JwtAuthGuard` is **global**; routes opt out with `@Public()`.
- `RolesGuard` reads `@Roles(Role.RECRUITER)` metadata.

> **CRITICAL: Cookie path MUST be `path: '/'`** (not `path: '/api/auth/refresh'`). If the path is scoped to a specific API route, the browser only sends the cookie on requests to that exact path. Navigation requests (middleware, page loads) never receive the cookie → proxy sees no session → redirect loop to `/login`. See also: FE Guide §14 "Login redirect loop".

> **CRITICAL: Clear the old cookie when issuing a new one.** If you ever change the cookie path, issue a `clearCookie` for the old path before setting the new one. Otherwise the browser accumulates two cookies and sends both — the server may receive the blacklisted old token.

> **CRITICAL: `@Public()` on logout.** The `POST /auth/logout` endpoint MUST be decorated with `@Public()`. When a user's access token is expired, the JwtAuthGuard blocks the logout request with 401 — the user can never log out. Logout should always succeed regardless of access token state.

### Admin account
The admin user is seeded automatically at startup via `AppService.onApplicationBootstrap()`:
- Email: `admin@rxjobs4u.com`
- Password: `Andhra@1234`
- No phone required (phone is optional in the User schema)
- Seeded only once — idempotent check on email before creating.

### Google OAuth
- `@nestjs/passport` Google strategy.
- On callback: find-or-create user; email pre-verified.

### OTP (Email-primary, SMS-secondary)
- `POST /auth/otp/send` — accepts `{ email }`; generates 6-digit, persists to Mongo `otps` collection (TTL index, expires 5 min) keyed by `SHA-256(email.toLowerCase())` stored in `phoneHash` field (legacy field name — do NOT rename without migration).
- `POST /auth/otp/verify` — accepts `{ email, code }`; consumes OTP; max 5 attempts; marks `emailVerified = true`; returns session.
- Delivery: email via Gmail OAuth2/nodemailer (auth OTP) + WhatsApp via Wylto `verify_account` template (seeker WhatsApp OTP, separate flow — `POST /users/me/whatsapp/otp/send`). MSG91 removed.
- Rate limits: 3 sends per email per 15 min; 10 verifies per email per 15 min.
- OTP screen URL param: `?email=<encoded>` (not `?phone=`). The FE reads `searchParams.get('email')`.

> **Why `phoneHash` field for email?** The OTP collection was originally keyed by phone. Rather than a schema migration, we hash the email and store it in the same field. Future: rename the field to `keyHash` in a migration and update references.

### Password
- bcrypt cost 12. Never log plaintext passwords. Reject passwords < 10 chars or in common-password list.

## 7. Lifecycle State Machines (Phase 3)

### Job — URGENT
```
PENDING_SUBSCRIPTION → ACTIVE → AUTO_DISABLED (at createdAt+24h, via cron sweep every 5 min)
                            └── FILLED (when school marks any app WON; auto-closes other apps)
```

### Job — Full-time
```
PENDING_PAYMENT → ACTIVE → FILLED (when school marks a PAID app WON; auto-closes other apps)
                        └── EXPIRED (at createdAt+30d)
                                 └── ACTIVE (via Boost payment)
```

### Application — Full-time (5-state)
```
INTERESTED ──(school shortlists)──→ SHORTLISTED ──(seeker pays ₹99)──→ PAID
                                            │                              │
                                            └─(48h timer expires)──┐       ├─→ WON  (school confirms)
                                                                   ▼       └─→ CLOSED (school declines)
                                                                CLOSED
```

### Application — URGENT (3-state, no payment)
```
INTERESTED ──(school decides)──→ WON | CLOSED
```

**Implementation (cron-based, no queue infrastructure):**
- Each Job stores `expiresAt: Date` (24h or 30d from creation).
- Each Application in `SHORTLISTED` state stores `paymentDueBy: Date` (= `shortlistedAt + 48h`).
- A single cron handler runs every 5 minutes:
  1. `Job.updateMany({ status: 'ACTIVE', expiresAt: { $lte: now } }, { $set: { status: ... } })` — flips URGENT → AUTO_DISABLED, full-time → EXPIRED.
  2. `Application.updateMany({ state: 'SHORTLISTED', paymentDueBy: { $lte: now } }, { $set: { state: 'CLOSED', decisionReason: 'PAY_WINDOW_EXPIRED' } })` — auto-closes shortlisted apps that didn't pay in time.
  3. Emits `JOB_AUTO_DISABLED` / `APPLICATION_CLOSED` notifications for each row touched (small N per tick, in a transaction).
- Boost: just bumps `expiresAt = now + 30 days` and flips status to ACTIVE. Cron handles the rest.
- Filling (any WON): a single transactional `updateMany` flips all sibling ACTIVE/SHORTLISTED/PAID apps on that job to CLOSED, and the job to FILLED. No timer to cancel.

## 8. Payments — Razorpay (Phase 3)

### Order creation
`POST /payments/:kind/order` where kind = `job-post` | `application` | `subscription` | `boost`:
1. Validate entity exists and user is authorized.
2. **Compute amount server-side** from `src/shared/constants/pricing.ts`. Never trust client input.
3. **For `application` kind:** also assert the application's `state === SHORTLISTED` and `paymentDueBy > now`. Reject otherwise.
4. Create Razorpay order via SDK.
5. Persist `Payment` in `PENDING` state with `razorpayOrderId`.
6. Return `{ orderId, amount, currency: 'INR', keyId }` to FE.

### Client-side verify (frontend calls after checkout)
`POST /payments/verify` — called by the frontend with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`. Verifies HMAC as `SHA256(order_id|payment_id, KEY_SECRET)`. No raw body needed.

### Server-to-server webhook (Razorpay → your server)
`POST /payments/razorpay-webhook` — `@Public()`. Requires `rawBody: true` in `NestFactory.create()`. Verifies `x-razorpay-signature` header as `SHA256(rawBodyBuffer, WEBHOOK_SECRET)`. `WEBHOOK_SECRET` stored in admin panel (encrypted). Handles `payment.captured` and `order.paid` events. Idempotent — skips if already PAID.

Registered at: `https://rxjobs4u.com/api/payments/razorpay-webhook`

1. Verify `x-razorpay-signature` header against `HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)`.
2. Load `Payment` by `razorpayOrderId`. If status already `PAID` → return 200 (idempotent).
3. Transition `Payment` to `PAID`, then fulfill based on kind:
   - `job-post` → Job `PENDING_PAYMENT → ACTIVE`; enqueue expiry.
   - `application` → Application `SHORTLISTED → PAID`; set `paidAt = now`; flip `schoolRevealed = true`; cancel the 48h auto-close timer; emit `APPLICANT_PAID` to recruiter, `PAYMENT_SUCCESS` to seeker.
   - `subscription` → upsert Subscription `ACTIVE` with `nextBillingAt = now + 30 days`.
   - `boost` → Job `EXPIRED → ACTIVE`; re-enqueue expiry with `+30 days`.
4. Emit notification (Socket.IO + email).

**All fulfillment inside a Mongo transaction** (replica set required).

### Shortlist endpoint (no payment, but triggers payment flow)
`POST /jobs/:jobId/applications/:appId/shortlist`:
1. Auth: must be a recruiter user belonging to the job's school.
2. Assert application's `state === INTERESTED` and the job is full-time + ACTIVE.
3. Update: `state = SHORTLISTED`, `shortlistedAt = now`, `shortlistedByUserId = currentUser._id`, `paymentDueBy = now + SHORTLIST_PAY_WINDOW_MS`.
4. (No timer to enqueue — the every-5-min cron sweep picks up `paymentDueBy` deadlines automatically.)
5. Emit `APPLICATION_SHORTLISTED` notification (Socket.IO + email + SMS) to the seeker.

## 9. Notifications

### In-App (Socket.IO)
- `notifications` collection persists every notification (for in-app bell).
- `NotificationsGateway` emits `notification.new` to `user:<userId>` room.
- Fan-out: email (Gmail OAuth2/nodemailer) sent inline. On failure: log + continue (in-app notification already persisted).

### Event-Driven Dispatch
All notification triggers use `@nestjs/event-emitter`. Services emit an event; `NotificationsService` listens with `@OnEvent()`. **Never call `NotificationsService` directly from another module's service.**

```ts
// Emitter side (e.g. ApplicationsService)
this.eventEmitter.emit('application.new', { jobId, seekerId, schoolId });

// Listener side (NotificationsService)
@OnEvent('application.new')
async onApplicationNew(payload: { jobId: string; seekerId: string; schoolId: string }) { ... }
```

**CRITICAL: Every `NotificationKind` enum value MUST have a matching `@OnEvent()` handler.** Adding a value to the enum but omitting the handler means that notification silently never fires. Checklist when adding a new `NotificationKind`:
1. Add enum value to `src/shared/enums/index.ts`
2. Mirror to `eduhire-frontend/lib/shared/enums.ts`
3. Add `@OnEvent('event.name') async onXxx(payload) { ... }` to `NotificationsService`
4. Emit the event from the appropriate service action

### Web Push (VAPID — no Firebase)

Browser push notifications delivered via the native Web Push API using `web-push` npm library.

**Required env vars (backend):**
```
VAPID_PUBLIC_KEY=<base64url>
VAPID_PRIVATE_KEY=<base64url>
VAPID_SUBJECT=mailto:admin@rxjobs4u.com
```

Generate with: `npx web-push generate-vapid-keys`

**Backend pattern (`notifications.service.ts`):**
```ts
import webpush from 'web-push';

// In constructor:
webpush.setVapidDetails(
  this.config.get('VAPID_SUBJECT'),
  this.config.get('VAPID_PUBLIC_KEY'),
  this.config.get('VAPID_PRIVATE_KEY'),
);

// Private helper:
private async sendWebPush(userId: string, payload: { title: string; body: string; link?: string }) {
  const user = await this.userModel.findById(userId).select('pushSubscription').lean();
  if (!user?.pushSubscription) return;
  try {
    await webpush.sendNotification(
      JSON.parse(user.pushSubscription),
      JSON.stringify(payload),
    );
  } catch (err: any) {
    if (err.statusCode === 410 || err.statusCode === 404) {
      // Subscription expired — auto-clean
      await this.userModel.findByIdAndUpdate(userId, { pushSubscription: null });
    }
  }
}
```

**Frontend subscription endpoint:** `POST /users/me/push-subscription` — saves `JSON.stringify(subscription.toJSON())` to `user.pushSubscription`. `DELETE /users/me/push-subscription` clears it.

**Frontend env:** `NEXT_PUBLIC_VAPID_PUBLIC_KEY=<same public key>`

**Call site:** `useWebPush(user?.id)` in `AppHeader` — runs once per session, guarded by `useRef(subscribed)`.

**Service worker:** `public/sw.js` handles `push` event → `showNotification()`, and `notificationclick` → window focus or open at `data.link`.

## 10. File Upload (Phase 3)

`POST /uploads/presign` body:
```ts
{ contentType: string; size: number; kind: 'resume' | 'logo' | 'certificate' }
```

**Validation:**
- Size caps by kind (resume: 5MB, logo: 2MB, certificate: 5MB).
- MIME allowlist (PDF for resume/cert; JPEG/PNG/WebP for logo).
- Deterministic key: `<kind>/<userId>/<uuid>.<ext>` — no user-controlled filenames.

Returns `{ url, key, expiresAt }`. Client PUTs directly to S3. On form submit, BE does `HeadObject` on the key to confirm the upload actually happened before persisting.

## 11. Scheduled Jobs (Phase 3)

**Single mechanism: `@nestjs/schedule` cron handlers in `src/scheduler/`.** No Redis. No BullMQ. No queue infrastructure.

| Cron expression | Handler | What it does |
|---|---|---|
| `*/5 * * * *` (every 5 min) | `JobLifecycleSweeper` | Find ACTIVE jobs past `expiresAt` → flip URGENT to `AUTO_DISABLED`, full-time to `EXPIRED`. Emit notifications. |
| `*/5 * * * *` | `ShortlistPayWindowSweeper` | Find SHORTLISTED applications past `paymentDueBy` → flip to `CLOSED` with reason `PAY_WINDOW_EXPIRED`. Emit notifications. |
| `0 * * * *` (hourly) | `PaymentReconciler` | Find PENDING payments > 30 min old → query Razorpay status; finalize if paid (handles missed webhooks). |
| `0 0 * * *` (daily) | `OtpCleanup` | Defensive sweep — TTL index handles expiration automatically, this is a fallback for any leftover OTP docs. |

OTPs themselves expire **automatically** via Mongo TTL index (`expireAfterSeconds: 300`) — no app-level work needed.

**Trade-off accepted:** ±5 min slop on expiry timers vs. precise BullMQ delayed jobs. Acceptable for 24h/30d/48h deadlines. If precision becomes critical (e.g., ~minute-level expiry timers), add Redis + BullMQ then.

## 12. Logging & Observability

**Phase 1 (current):** Nest default `Logger`.
**Phase 3:** migrate to **Pino** via `nestjs-pino` — structured fields `{ reqId, userId, route, status, durationMs }`. Request-id middleware generates `x-request-id` if missing; logger child-bound to it.

**Never log** PII (email, phone, DOB, resume content, payment amounts attached to identifiable user). Redact via Pino `redact` paths.

**Audit log** collection (Phase 3) for: login/logout, password change, money transfers (every successful fulfillment), role changes, admin actions. Retention: 2 years.

## 13. Security Checklist

Currently wired:
- [x] `helmet()` global (in `main.ts`)
- [x] CORS allowlist via `CORS_ORIGINS` env (no `*` in prod)
- [x] `ThrottlerGuard` global at 100 req/min
- [x] Global `ValidationPipe` with `whitelist: true` + `forbidNonWhitelisted: true`
- [x] TS `strict: true` in `tsconfig.json`

Phase 3 additions:
- [ ] Stricter throttle on `/auth/*` (10/min)
- [ ] bcrypt cost 12 for passwords
- [ ] CSRF protection on cookie-auth mutation routes (double-submit token)
- [ ] Encryption-at-rest via MongoDB Atlas (default). Field-level encryption (Atlas CSFLE) for `phone` + `dob` deferred to P1.
- [ ] TLS-only in production
- [ ] Razorpay webhook signature **always** verified; reject on mismatch
- [ ] Raw-body middleware for webhook routes only
- [ ] Pino redact for PII paths

## 14. Testing (Phase 3)

- **Unit:** service methods, pure functions (pricing calc, state transitions). Fast, no DB.
- **Integration:** controller + service + Mongo (`mongodb-memory-server`). Covers validation, guards, and DB interaction.
- **e2e:** full app via Nest test harness + Supertest. Covers critical flows: register+OTP+login, post job + pay + webhook, apply + pay + webhook, webhook idempotency.

**Coverage gates:**
- Payments module: **100% line + branch**. Non-negotiable.
- Auth module: ≥ 90%.
- Everything else: ≥ 70%.

## 15. Do / Don't

### DO
- ✅ Use feature modules; one module per domain concern. Schemas live inside the owning module.
- ✅ Keep controllers thin; business logic in services.
- ✅ Re-compute every price on the server from `src/shared/constants/pricing.ts`.
- ✅ Make webhook handlers idempotent.
- ✅ Use Mongo transactions for any multi-doc write that touches money.
- ✅ Emit events (via `EventEmitter2`) for cross-module reactions — don't let `JobsService` call `NotificationsService` directly.
- ✅ Guard all routes; explicitly `@Public()` only auth and health.
- ✅ Paginate every list endpoint. Never return unbounded arrays.
- ✅ Store money as integer paise. Always.
- ✅ Log request-id + user-id on every request (Phase 3 Pino).
- ✅ Use `ConfigService` (not `process.env` directly) for typed env access.

### DON'T
- ❌ Don't trust any client-sent amount. Ever.
- ❌ Don't hard-delete. Soft delete with `deletedAt`.
- ❌ Don't put business logic in controllers.
- ❌ Don't `console.log`. Use `Logger` or the Pino child logger.
- ❌ Don't store plaintext OTP or password. OTPs go in the Mongo `otps` collection with a TTL index; passwords are bcrypt-hashed.
- ❌ Don't return Mongoose documents directly — always map through a response DTO or plain serialization, filtering sensitive fields.
- ❌ Don't skip webhook signature verification in dev. Use the test secret.
- ❌ Don't call another module's service directly across boundaries for event-style flows. Emit an event.
- ❌ Don't create a new collection without a compound index plan for its queries.
- ❌ Don't use `find({})` without `.limit()`.
- ❌ Don't couple controllers to the DB shape. Map to response DTOs.
- ❌ Don't skip the reconciliation job for payments — webhooks can be missed.
- ❌ Don't inline env var reads in services. Use the typed `ConfigService`.
- ❌ Don't reintroduce a central `domain/schemas/` folder. Schemas live in their feature module.

---

## 16. Bug-Prevention Rules (from Phase 3a — do not repeat these)

### Mongoose duplicate index warning
**Problem:** `@Prop({ index: true })` + a separate `Schema.index({ field: 1 })` call below the class creates **two identical indexes** on the same field. Mongoose logs a deprecation warning and Atlas may reject the build.  
**Fix:** Use `@Prop({ index: true })` OR `Schema.index(...)` — never both for the same field. Use the schema-level call for compound indexes; use `@Prop` for single-field indexes.

### `findOneAndUpdate` with `new: true`
**Problem:** `{ new: true }` is deprecated in Mongoose 9. Mongoose warns `"new is not a supported option"`.  
**Fix:** Use `{ returnDocument: 'after' }` instead of `{ new: true }` in all `findOneAndUpdate` calls.

### Two refresh_token cookies in the browser
**Problem:** After changing the cookie path from `'/api/auth/refresh'` to `'/'`, both cookies coexist. The browser sends both to `/api/auth/refresh`. The server sees the blacklisted old-path token → 401.  
**Fix:** In `issueTokens()`, before setting the new cookie, explicitly clear the old cookie path:
```ts
res.clearCookie(REFRESH_COOKIE, { path: '/api/auth/refresh' }); // clear old-path remnant
res.cookie(REFRESH_COOKIE, token, { path: '/', httpOnly: true, sameSite: 'lax', ... });
```

### Email service: Gmail OAuth2 via nodemailer
The email service uses `nodemailer` with Gmail OAuth2 (`service: 'gmail'`, `auth.type: 'OAuth2'`). Credentials come from env vars: `GMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`. nodemailer fetches a fresh access token per send via the refresh token — do NOT set a static `GMAIL_ACCESS_TOKEN` (it expires and breaks silently). Brevo was removed. Basic username+password SMTP does not work with GSuite.

### `@Public()` on logout — always required
See JWT section above. Without `@Public()`, an expired access token prevents logout. This must be present on every `logout` endpoint.

### DTO `@Max` too low for admin bulk fetch (Phase 3b)
**Problem:** `JobsQueryDto` had `@Max(50)` on the `limit` field. Admin dashboard called `adminList({ page: 1, limit: 100 })`. Backend rejected with 400; React Query stored `undefined`; donut charts showed "No data".  
**Fix:** Set `@Max(200)` on all `limit` fields. Admin bulk-fetches legitimately need 100+.  
**Rule:** Never set `@Max` below 200 on any pagination `limit` field.

### Missing `@OnEvent` handler for new `NotificationKind` (Phase 3b)
**Problem:** Adding a new enum value to `NotificationKind` and emitting the event from a service does nothing unless `NotificationsService` has a matching `@OnEvent()` handler. Symptom: recruiter / admin gets zero notifications even though the code "looks right".  
**Fix:** Any time you add a `NotificationKind`, add the `@OnEvent('event.name')` handler in `notifications.service.ts` before committing.  
**Rule:** Enum value + emit + handler are always a trio — never add just one or two.

### Module missing Mongoose schema import (Phase 3b)
**Problem:** Service uses `@InjectModel(School.name)` but `notifications.module.ts` didn't have `MongooseModule.forFeature([{ name: School.name, schema: SchoolSchema }])`. NestJS injection failed at runtime with a cryptic "provider not found" error.  
**Fix:** When a service gains a new `@InjectModel(X.name)` dependency, immediately add the corresponding `MongooseModule.forFeature` entry to its owning module.  
**Rule:** `@InjectModel(X.name)` in service ↔ `MongooseModule.forFeature([{name: X.name, schema: XSchema}])` in module — always paired.

---

## Phase 3e patterns (2026-06-23)

### Type-discriminated DTO + service validation
When a single endpoint accepts two shapes (URGENT vs FULL_TIME job posts), keep one
DTO with all fields **optional at the class-validator layer**, and assert the
per-type required set in the service. The DTO can't enforce "required only when
`type === URGENT`" cleanly with class-validator; doing it in the service keeps the
validation explicit and grep-able.

### URGENT auto-derive convention
When a feature is built to accept a smaller-than-legacy field set (URGENT = 4 fields
vs full-time = 15+), **auto-derive** the legacy columns in the service so downstream
readers (notifications, search, browse cards, emails) don't need branching. For URGENT:
- `title = "<qualification-label> needed in <school city>"`
- `role = qualification-label`
- `department = QUALIFICATION_TO_DEPARTMENT[qualification]`
- `salaryMin = salaryMax = feeAmount`
- `experienceMin = experienceMax = 0`
- `city/state/location = school.city/state/location`
- `openPositions = 1`

Net effect: zero downstream code touches needed. FE views that want to *display*
the auto-derived value differently use type-aware helpers
(`lib/utils/jobs-display.ts`).

### Outbound user-facing URLs via env
Never hardcode the FE domain in BE link constructors. Use:
```ts
const frontendUrl = this.config.get<string>('PUBLIC_FRONTEND_URL', 'https://rxjobs4u.com');
const link = `${frontendUrl}/jobs/${jobId}`;
```
Default lives in Joi schema. One source of truth, one place to flip for
staging/preview environments.

### PII redaction in logs
Email/phone go through `redactEmail()` / `redactPhone()` from
`src/common/utils/redact.ts` before any `logger.log/debug/warn/error` call:
```ts
this.logger.error(`OTP send failed for ${redactEmail(email)}`);
```
Pino also has a `redact` config (Authorization headers, password fields, etc.) that
catches anything that slips into structured log objects.

### Anonymous auth audit
`AuditService.logAuthEvent(action, maskedEmail, reason, ip, userAgent)` writes an
`AuditLog` row for auth events that have no authenticated admin context. Actions:
`AUTH_FAILED`, `OTP_FAILED`, `OTP_LOCKED`, `PASSWORD_RESET`, `LOGIN_SUCCESS`.
Records masked email + IP + UA + reason; enough to detect abuse without storing PII.

### Tag-prefixed verbose logs
Pipelines that fan out across many channels (URGENT notifications) tag every log line
with `[<feature>][<id>][<step>]` so the operator can grep one event's full trail:
```
[URGENT-alert][job:abc][event-received] type=URGENT city=PALASA
[URGENT-alert][job:abc][city-match] filter=… batch skip=0 found=2
[URGENT-alert][job:abc][in-app] seeker=… → notify queued
[URGENT-alert][job:abc][email] ✓ p***s@gmail.com
[URGENT-alert][job:abc][done] cityHits=2 emailAttempts=2 …
```
`logger.log` for milestones (shown in prod info level); `logger.debug` for per-user
detail (dev only).

### `SystemConfig` setting kinds
Settings carry FE render hints: `displayKind: 'boolean' | 'number'`,
`unit: string`, `maxValue: number`. New helper:
```ts
async getSettingBoolean(key: string, fallback: boolean): Promise<boolean> {
  const num = await this.getSettingNumber(key, fallback ? 1 : 0);
  return num !== 0;
}
```
Seeded settings are upserted on `onModuleInit`. New metadata fields back-fill onto
pre-existing docs idempotently — see `system-config.service.ts`. `updateSetting`
enforces `valueNumber <= maxValue` when `maxValue` is set.

### Env validation is fail-fast
`src/config/env.validation.ts` defines a Joi schema for every var. Boot dies with
a clear error if anything's wrong. Critical vars (`JWT_ACCESS_SECRET`,
`JWT_REFRESH_SECRET`, `CONFIG_ENCRYPTION_KEY`) are always required ≥32 chars and
must differ from each other. Integration vars (Razorpay/AWS/Wylto/Google/Gmail)
are required only in `NODE_ENV=production`. Dead vars (`SMTP_HOST/USER/PASSWORD`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_CALLBACK_URL`) are explicitly relaxed.

### `tokenVersion` for immediate access-token revocation
JWT payload carries `tv` (`user.tokenVersion`). `JwtStrategy.validate()` rejects any
token where `payload.tv !== user.tokenVersion`. Bump `$inc tokenVersion: 1` on
password change / reset / forced logout. Avoids the 15-minute "old access token
still works" window after a credential change.
