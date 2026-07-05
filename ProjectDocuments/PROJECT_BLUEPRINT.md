# PROJECT_BLUEPRINT.md — School Teacher

> The domain, architecture, and cross-cutting rules for this project. Read after
> `CLAUDE.md`, before diving into any guide.

---

## 1. Domain

**School Teacher** connects **Schools** with **Teachers** for teaching roles. Two hiring modes co-exist on the same platform:

- **Substitute / Urgent** — a school needs a teacher immediately (sick leave, sudden vacancy, short-notice cover). Schools subscribe monthly for unlimited urgent posts; teachers pay a monthly access fee to see + apply to these.
- **Permanent / Contract** — a long-term posting (30-day listing). School pays a one-time post fee; teachers apply free, and pay a small shortlist-confirmation fee only after the school shortlists them.

## 2. Actors + Roles

| Role | Description |
|---|---|
| **Teacher** (was JobSeeker) | Individual teacher applying for postings. Profile: name, qualifications, subjects, grades taught, experience, city/state, resume, availability. |
| **School Admin** (was Recruiter) | User acting for a school. One user manages one school. Can post + shortlist applicants + manage subscription. |
| **Admin** | Platform admin. Verifies schools, disables abusive users/postings, edits pricing via SystemConfig, views analytics. |

## 3. Entities

- **User** — auth + role; holds either a `teacherProfile` or a `schoolAdminProfile` sub-doc.
- **School** — the hiring entity. Verification-gated: registration number + address + admin verification → `verificationStatus: PENDING/VERIFIED/REJECTED`.
- **Posting** (was Job) — a teaching role. `type: URGENT | PERMANENT`, `subject`, `gradeLevel`, `city`, `state`, geo location, salary range (paise, monthly), `status: PENDING_PAYMENT/PENDING_SUBSCRIPTION/ACTIVE/FILLED/EXPIRED/AUTO_DISABLED/DISABLED_BY_ADMIN`.
- **Application** — teacher applies to a posting. 5-state machine.
- **Chat** *(Phase 1 planned)* — Socket.IO room scoped to one accepted (`PAID` or later) application. Messages persist in Mongo.
- **Payment** — Razorpay orders + webhooks. Idempotent by `razorpayOrderId` (unique index).
- **Subscription** — school (monthly urgent-post subscription), teacher (monthly urgent-access subscription). Auto-renewal via Razorpay Subscriptions or manual re-purchase depending on integration decision (TBD).
- **SystemConfig** — dynamic pricing, admin-managed API keys (encrypted at rest), settings (`displayKind: boolean | number`, `unit`, `maxValue` metadata for the admin UI).
- **AuditLog** — admin actions + anonymous auth events (`AUTH_FAILED`, `OTP_FAILED`, `OTP_LOCKED`, `PASSWORD_RESET`, `LOGIN_SUCCESS`). Nullable `adminId` + optional `ip`/`userAgent`/`reason`.
- **Notification** — in-app + email + web-push fan-out targets.

## 4. Application State Machine

```
INTERESTED ──shortlist by school──▶ SHORTLISTED ──teacher pays──▶ PAID ──confirm hire──▶ WON
     │                                   │                          │
     │─school declines / TTL──────▶ CLOSED (reason logged, contact never revealed)
```

- **INTERESTED**: teacher applied. No contact reveal.
- **SHORTLISTED**: school shortlisted. Teacher notified. 48-hour payment window opens.
- **PAID**: teacher paid the shortlist-confirmation fee. Contact details unlocked BOTH WAYS. **Chat room created** for this application.
- **WON**: school confirmed the offer. Application terminal-positive.
- **CLOSED**: school declined OR payment window expired OR posting closed. Application terminal-negative. Contact never revealed if teacher never paid.

## 5. Pricing — 100% Dynamic

**No hardcoded rupee constants anywhere in code.** This is a deliberate departure from RxJobs4U where prices lived in `shared/constants/pricing.ts`.

- Every price is stored in `SystemConfig{type:'price'}` with fields `key`, `label`, `description`, `valueNumber` (paise), `minValue`.
- Admin edits any price via **Admin Settings → Pricing** (unit-aware input, min-value validation, audit-logged).
- Server always reads via `systemConfig.getPricePaise(key)` at request time; never assumes a value.
- Adding a new charge kind is admin-driven: add the row via UI, wire the `PaymentKind` enum, done — no deploy for pricing.

Suggested initial keys (values TBD by client, admin seeds them):
```
URGENT_MONTHLY_SCHOOL_PAISE          — school subscription for unlimited urgent posts
URGENT_MONTHLY_TEACHER_PAISE         — teacher subscription for urgent-post access
PERMANENT_POST_PAISE                 — one-time permanent-posting fee
APPLICATION_FEE_PAISE                — shortlist-confirmation fee (teacher pays)
BOOST_PAISE                          — re-activate an expired posting
```

## 6. Auth & Session

- **Registration**: email + password + role (teacher | school_admin) + email OTP verification.
- **Login**: email + password OR email OTP OR Google OAuth (id_token verified server-side via `google-auth-library`).
- **Access token**: JWT, 15 min TTL, in-memory only (never localStorage).
- **Refresh token**: JWT, 7-day TTL, httpOnly cookie, `path: '/'`, `SameSite=Lax`, `Secure` in prod, `Domain=<eTLD+1>` in prod for subdomain split.
- **`tokenVersion`** claim in JWT. Bumped on password change / reset / forced logout — invalidates outstanding access tokens immediately.
- **reCAPTCHA v3** on register / login / OTP-send / forgot-password. Skips silently in dev (localhost scores always fail).
- **Throttles**: register 3/min, login 5/min, OTP-send 3/min, OTP-verify 10/min, forgot 3/min, reset 5/min. Global default: 100/min.
- **CSRF**: `X-Requested-With: XMLHttpRequest` guard on cookie-auth POSTs.

## 7. Payments — Razorpay

- Order created server-side with computed amount from SystemConfig.
- Webhook signature verified with **`safeEqual()` (timing-safe HMAC)** — never plain `!==`.
- Idempotency: `razorpayOrderId` has `unique: true`, handler short-circuits on already-PAID payments.
- Fulfillment inside Mongoose transactions.

## 8. File Uploads — S3 via Presign

- Client asks BE for a presigned PUT (kind + contentType + size). BE validates MIME + size against `MIME_ALLOWLIST` / `SIZE_LIMITS`.
- Client PUTs directly to S3.
- **On the next persist call** (profile update / school update), BE HEAD-verifies the claimed key via `uploads.verifyUploadKey(url, kind)` before writing the URL to the DB. Prevents clients from claiming someone else's key.

## 9. Notifications

- **In-app** — Notification doc persisted + Socket.IO push via `/notifications` namespace (JWT handshake auth).
- **Email** — Gmail OAuth2 via nodemailer.
- **Web Push** — VAPID `web-push` library (no Firebase).
- Each event has an `@OnEvent()` handler in `NotificationsService`. **Enum value + `eventEmitter.emit()` + `@OnEvent()` handler are always a trio** — see BUG_PATTERNS BE-9.

## 10. Chat (Phase 1 — planned)

- Socket.IO namespace `/chat`.
- One room per accepted application (`applicationId` is the room ID). Room created when application enters `PAID` state.
- Both parties (teacher + school-admin) join. All others rejected server-side (per-room membership check on `join`).
- Messages persist in `chat_messages` collection: `{ applicationId, senderId, body, createdAt, readByRecipient }`.
- Presence + typing indicators nice-to-have, not required.

## 11. Data Locality

- **MongoDB Atlas** (single region). All timestamps UTC.
- **AWS S3** private bucket. Signed GET URLs (short TTL) for reads. Bucket policy denies public access.
- **Gmail OAuth2** for outbound email — no static access token stored.
- **Razorpay India** — INR only.

## 12. Environments

- **Local dev**: `localhost:3000` (FE) + `localhost:3001` (BE). `COOKIE_DOMAIN=` (blank). `NODE_ENV=development`.
- **Production**: `schoolteacher.com` (FE) + `api.schoolteacher.com` (BE). `COOKIE_DOMAIN=.schoolteacher.com`. `NODE_ENV=production`. All env values are prod-strength.
- **Env validation** at BE boot via Joi — fails fast on misconfiguration. See `env.validation.ts`.

## 13. Observability

- **Structured logs** via `nestjs-pino` — JSON in prod, pretty in dev. PII redacted (Authorization headers, cookies, password fields).
- **PII in application-level logs** → `redactEmail()` / `redactPhone()` from `common/utils/redact.ts` before any `logger.log/debug/warn/error` call.
- **Tag-prefixed pipeline logs** for fan-outs (`[chat:room:X]`, `[posting:activate:Y]`) — makes grepping one event's full trail easy.
- **Auth audit** for anonymous events — `AuditService.logAuthEvent(action, masked, reason, ip, ua)`.

## 14. Cross-Cutting Rules

1. **All timestamps UTC in the DB.** Format at the UI edge for IST.
2. **All money is integer paise.** Never float rupees. Divide by 100 at the UI edge.
3. **All prices come from SystemConfig at request time.** No hardcoded rupee constants in code.
4. **Every fan-out is batched** (batch size 50) — never a single loop hitting 10k users.
5. **Every schema with an array-nested doc uses a `@Schema({_id:false})` sub-class** — never inline nested paths (BUG_PATTERNS BE-14).
6. **Every geo field uses the `LocationSchema` sub-class** with `default: null` on the parent prop.
7. **Every outbound user-facing URL** goes through `PUBLIC_FRONTEND_URL` env — never hardcoded.
8. **Every non-obvious architectural call** gets a dated entry in `DECISIONS.md`.

## 15. Reference Table — Concept Renames from RxJobs4U

| RxJobs4U | School Teacher |
|---|---|
| Hospital | School |
| JobSeeker / Seeker | Teacher |
| Recruiter / Hospital Admin | School Admin |
| Job / Posting | Posting |
| SOS (24-hour urgent) | Urgent (substitute) |
| Full-time | Permanent |
| Qualification (medical taxonomy) | Subject + GradeLevel |
| Department (medical) | Subject (academic) |
| `jobs-display.ts` | `postings-display.ts` |
| Chat | **Chat (NEW — not in RxJobs4U)** |

## 16. Open Questions (fill as decisions land)

- Pricing values — client to confirm; admin seeds via SystemConfig.
- Subscription cycle — monthly? annual option? Auto-renewal via Razorpay Subscriptions API or manual re-purchase? **Log the decision in `DECISIONS.md`.**
- Multi-user per school (multiple admin users) — schema supports it, UI TBD.
- Multi-school per admin — one-to-one for now, revisit if demand emerges.
- Video interviews inside chat — deferred, not Phase 1.
- Featured / boosted postings — deferred.
