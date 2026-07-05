# Secrets Rotation Runbook — School Teacher

> Every credential currently in `eduhire-backend/.env` has been visible in
> chat history and MUST be rotated before the public launch. This runbook
> walks each one end-to-end: portal URL → rotate steps → which env vars to
> update on which app/process → restart command → verification.
>
> Walk it **top to bottom**. The order is shortest-blast-radius first; the
> last item (`CONFIG_ENCRYPTION_KEY`) invalidates all stored encrypted
> SystemConfig api-keys, so you'll re-enter them in Admin → Config at the end.
>
> Allocate ~60–90 minutes uninterrupted. Have a second device / browser
> open for portal logins.

---

## Before you start

1. **Set up your prod `.env` source-of-truth**. If it lives in a password
   manager / Vault / hostinger admin panel, open it now. We'll be updating
   one or two lines per step.
2. **Open a terminal on the prod VPS** (Hostinger SSH). You'll need:
   ```bash
   cd /apps/School Teacher/eduhire-backend
   pm2 logs rxjobs-backend --lines 50      # tail logs as you change things
   # in another tab:
   pm2 restart rxjobs-backend              # after each env update
   ```
3. **Two browser tabs**: one on `https://schoolteacher.com` (anon — to test
   login + payment) and one on `https://schoolteacher.com/admin` (logged in as
   admin).
4. **Sanity baseline** before you rotate anything: log in, post a test job,
   complete a test payment, send a test email (the OTP flow). If anything is
   broken now, fix it BEFORE rotating — otherwise you can't tell whether
   rotation broke it.

---

## Step 1 — Razorpay TEST key (low blast radius)

If you're still on Razorpay test mode, the key being public is mostly
fine — test mode can't move real money — but rotate anyway for hygiene
and to confirm the rotation procedure works. **For production mode this
step is critical.**

| Where | What |
|---|---|
| Portal | https://dashboard.razorpay.com/app/keys |
| Steps | "Regenerate Test Key" (or "Regenerate Live Key" for prod). Razorpay shows the new `key_id` + `key_secret` exactly once — copy both. |
| Env vars | `eduhire-backend/.env`: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` |
| Restart | `pm2 restart rxjobs-backend` |
| Verify | Log in as a seeker, attempt to subscribe to SOS Access. Should reach the Razorpay checkout. Use the test card from memory `reference_razorpay_test_card`. |

> **Also rotate the Razorpay webhook secret** in `Settings → Webhooks` and
> update `RAZORPAY_WEBHOOK_SECRET` in the same env file. Restart again.
> Verify by completing a test payment end-to-end and confirming the BE
> logs show `[webhook] signature OK` (no "Invalid payment signature" 400).

---

## Step 2 — Brevo API key (now unused, can also delete)

The codebase migrated to Gmail SMTP in commit `f8ced4b`. `BREVO_API_KEY` is
no longer read by any code path. **Easiest fix: just delete the line from
`.env`**.

| Where | What |
|---|---|
| Portal | https://app.brevo.com/security/api |
| Steps | Disable / delete the existing key. (No replacement needed.) |
| Env vars | `eduhire-backend/.env`: **DELETE** the `BREVO_API_KEY=…` line |
| Restart | `pm2 restart rxjobs-backend` |
| Verify | BE boots. No "Brevo" warnings in `pm2 logs`. (There won't be — the code doesn't reference it.) |

---

## Step 3 — Google reCAPTCHA v3 secret key

| Where | What |
|---|---|
| Portal | https://www.google.com/recaptcha/admin |
| Steps | Open your reCAPTCHA site. Under "Reset Secret Key" → confirm → copy the new secret. The **site key** (public, in FE) does NOT need to change. |
| Env vars | `eduhire-backend/.env`: `RECAPTCHA_SECRET_KEY` |
| Restart | `pm2 restart rxjobs-backend` |
| Verify | Open `https://schoolteacher.com/login` in an incognito window, attempt login. The reCAPTCHA challenge silently runs in v3; BE logs should show "reCAPTCHA verified score=0.9" (or similar). A wrong secret would log "reCAPTCHA verification failed". |

---

## Step 4 — Google Maps API key

This one is in the **frontend** env (it's a browser-exposed key), restricted
by HTTP referrer + API. Lowest priority because the API restrictions
already limit damage — but rotate for hygiene.

| Where | What |
|---|---|
| Portal | https://console.cloud.google.com/apis/credentials |
| Steps | Find the existing Maps API key. Confirm the HTTP-referrer restriction is `https://schoolteacher.com/*` (and `localhost:3000/*` for dev). "Regenerate Key". |
| Env vars | `eduhire-frontend/.env.local` (local dev) AND prod FE env: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` (or whatever the FE actually reads — grep the FE for the key name). The BE `.env` line `GOOGLE_MAPS_API_KEY` is unused if the key is only embedded in the FE — confirm via grep before deleting. |
| Restart | `pm2 restart rxjobs-frontend` (rebuild required: `rm -rf .next && npm run build`) |
| Verify | Open `/recruiter/hospital` (or wherever the map autocomplete is used). Search a city — should resolve. Browser DevTools Network tab → no 403 / "API key invalid" on `maps.googleapis.com`. |

---

## Step 5 — Google OAuth (sign-in with Google) client secret

| Where | What |
|---|---|
| Portal | https://console.cloud.google.com/apis/credentials |
| Steps | Find the OAuth 2.0 Client ID for "School Teacher". Open it. Under "Client secrets" → "Add secret" (Google allows two secrets concurrently — add the new one BEFORE deleting the old, so there's zero downtime). Copy the new secret. |
| Env vars | `eduhire-backend/.env`: `GOOGLE_CLIENT_SECRET` |
| Restart | `pm2 restart rxjobs-backend` |
| Verify | Sign in with Google in an incognito window. Works → delete the OLD secret from the Google console. |

The `GOOGLE_CLIENT_ID` is public (it's in the FE bundle as
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`), no need to rotate.

---

## Step 6 — Gmail OAuth (SMTP for outbound email)

Three secrets live together; if any is leaked, rotate all three.

| Where | What |
|---|---|
| Portal | https://console.cloud.google.com/apis/credentials |
| Steps (a) Rotate the OAuth Client Secret: same procedure as Step 5 but for the OAuth client tied to the `noreply@schoolteacher.com` workspace. |
| Steps (b) Revoke the Refresh Token: go to https://myaccount.google.com/permissions for `noreply@schoolteacher.com`, find "School Teacher (or your app name)", remove access. |
| Steps (c) Re-issue a Refresh Token: use the OAuth playground (https://developers.google.com/oauthplayground) — set the new Client ID + Secret, authorize `https://mail.google.com/`, exchange auth code for refresh token. Copy it. |
| Env vars | `eduhire-backend/.env`: `GMAIL_CLIENT_ID` (only if you also rotated the client), `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`. **Delete** `GMAIL_ACCESS_TOKEN` (line 35) — nodemailer fetches a fresh one per send via the refresh token; the static value is unused and confusing. |
| Restart | `pm2 restart rxjobs-backend` |
| Verify | Trigger an OTP email (forgot-password from the login page). Check `pm2 logs` for `Email sent → <recipient> subject="…"`. If you see `Email skipped (no GMAIL_REFRESH_TOKEN)` the env didn't reload — restart again. |

---

## Step 7 — AWS S3 IAM access key

Hits S3 uploads — high blast radius (private resumes / hospital documents).

| Where | What |
|---|---|
| Portal | https://us-east-1.console.aws.amazon.com/iam/home → Users → (your S3 user) → Security credentials |
| Steps | "Create access key" (you can have TWO active at once during cutover). Copy `AccessKeyId` + `SecretAccessKey`. |
| Env vars | `eduhire-backend/.env`: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` |
| Restart | `pm2 restart rxjobs-backend` |
| Verify | As a seeker, upload a resume from the profile page. Should succeed. BE logs show `[uploads] presign ok key=resume/<userId>/<uuid>.pdf` + `HeadObject ok`. |
| Cleanup | In IAM, mark the OLD access key "Inactive", wait 24h, then "Delete". |

If the IAM user has more permissions than `s3:PutObject` + `s3:GetObject` +
`s3:HeadObject` on this single bucket, **fix that first** — see the
checklist's section 12.5 (DB credentials scoped). Should NOT be able to
list buckets, create buckets, or touch any other bucket.

---

## Step 8 — MSG91 / Wylto WhatsApp / SMS tokens

These provider the WhatsApp OTP path. Same procedure — portal regen, env
update, restart, send a verification OTP from a profile.

| Provider | Portal | Env var |
|---|---|---|
| MSG91 | https://control.msg91.com/app/api | `MSG91_AUTH_KEY` (stored in SystemConfig via Admin → Config, not directly in `.env`) — rotate via Admin Config UI after regenerating |
| Wylto | (Wylto dashboard URL) | `WYLTO_API_TOKEN` (`.env`) |

Verification: trigger a WhatsApp OTP from the seeker profile; check the
phone receives it. BE logs show `[WhatsApp OTP] +91…: ******`.

---

## Step 9 — VAPID keypair (Web Push)

Rotating this signs out every device's existing push subscription — they'll
re-subscribe silently on next page load. Acceptable.

| Where | What |
|---|---|
| Generate | `npx web-push generate-vapid-keys` on the prod VPS |
| Env vars | `eduhire-backend/.env`: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` AND `eduhire-frontend/.env.local` (and prod FE env): `NEXT_PUBLIC_VAPID_PUBLIC_KEY` must match the BE public key |
| Restart | `pm2 restart rxjobs-backend && cd /apps/School Teacher/eduhire-frontend && rm -rf .next && npm run build && pm2 restart rxjobs-frontend` |
| Verify | In an incognito window, log in as seeker, allow browser push prompt. BE logs show `[push] subscription saved for userId=…`. Trigger a test notification (apply for a job) → device push fires. |

---

## Step 10 — MongoDB Atlas user password

Higher blast radius — wrong key → BE can't start. Do this when you can
afford ~30 seconds of downtime.

| Where | What |
|---|---|
| Portal | https://cloud.mongodb.com → Database Access → users → `<db_user>` → Edit Password |
| Steps | "Auto-generate Secure Password" → save. Atlas applies the change immediately. |
| Env vars | `eduhire-backend/.env`: `MONGO_DB_PASSWORD` |
| Restart | `pm2 restart rxjobs-backend` |
| Verify | BE boots without `MongoServerError: bad auth`. Open Admin → Users in browser; list loads. |

> While you're here, confirm the network allow-list under
> Atlas → Network Access only includes the prod VPS IP (and your work IP if
> you connect from Compass). **Remove `0.0.0.0/0` if it's there** — that's
> the famous "MongoDB on the open internet" CVE class.

---

## Step 11 — JWT secrets (access + refresh)

Rotating these **kicks every user out immediately** (no token currently
issued verifies against the new secret). Communicate the downtime if you
have active users — for pre-launch this is free.

| Where | What |
|---|---|
| Generate | `openssl rand -hex 32` (twice — one per secret) |
| Env vars | `eduhire-backend/.env`: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`. **They MUST differ from each other AND from `CONFIG_ENCRYPTION_KEY`** — env.validation.ts enforces this and refuses to boot otherwise. |
| Restart | `pm2 restart rxjobs-backend` |
| Verify | Open `/login` in a fresh incognito window. Sign in. Cookie should be set. Refresh the page — still logged in. (Old sessions in other windows will 401 → bounce to /login.) |

---

## Step 12 — `CONFIG_ENCRYPTION_KEY` (do this LAST)

This key encrypts every secret stored in the `system_config` collection
(Razorpay key, Brevo key, MSG91 token, Wylto, etc. as managed via Admin →
Config). Rotating it makes the existing encrypted blobs unreadable. After
rotation you MUST re-enter every SystemConfig secret via the admin UI.

| Where | What |
|---|---|
| Generate | `openssl rand -hex 32` |
| Env vars | `eduhire-backend/.env`: `CONFIG_ENCRYPTION_KEY`. **MUST be ≥32 chars AND differ from JWT secrets** — env.validation.ts enforces this. |
| Restart | `pm2 restart rxjobs-backend` |
| Verify (broken) | First, expect failure: a payment attempt or OTP send will log a decryption error because the existing blobs can't be read. |
| Re-enter secrets | Log in as admin → Settings (admin/config). For every row marked "encrypted" (Razorpay keys, Brevo (if you kept it), MSG91, Wylto, etc.), paste the current value and Save. |
| Re-verify | Run the smoke test below. Everything should work again. |

---

## Step 13 — Final cleanup

1. **Delete unused env lines**: `GMAIL_ACCESS_TOKEN`, `BREVO_API_KEY` (if
   you removed Brevo), the commented-out `# COOKIE_DOMAIN=…`, `SMTP_PASSWORD`
   (we use OAuth2 now, no SMTP password is read).
2. **Commit a sanitised `.env.example`** — every var listed, every value
   replaced with a placeholder like `<your-key-here>`. Do NOT commit the
   real `.env`.
3. **Confirm `.env` is in `.gitignore`** — `git check-ignore -v eduhire-backend/.env`
   should print the matching `.gitignore` rule.
4. **Run a secret scanner one more time**: `npx gitleaks detect --source .`
   from the repo root. Should report zero findings.
5. **Update password manager / Vault** with the new values. Note the
   rotation date.

---

## Post-rotation smoke test (run after Step 12)

Check each flow end-to-end. If any step fails, stop and diagnose before
proceeding to the next.

| Flow | Steps | Pass criteria |
|---|---|---|
| **1. Login (existing user)** | Open `/login` in incognito; enter email + password; submit. | Lands on `/dashboard`. Cookie `refresh_token` set on `.schoolteacher.com`. |
| **2. Google sign-in** | Click "Sign in with Google". | Lands on `/dashboard`. |
| **3. Register + OTP** | Register a new account; receive OTP via email; verify. | Account activated; email arrived within 30s. |
| **4. Forgot password** | `/forgot-password`; enter email; receive OTP. | OTP arrives via Gmail. |
| **5. Seeker upload** | Profile page → Upload resume (a PDF). | "Resume uploaded" toast; profile reloads with resume link; HeadObject log lines visible in BE. |
| **6. Hospital create** | As a recruiter, create a hospital with logo. | Hospital created; logo URL persists; admin verification needed before posting. |
| **7. Job apply + payment** | As seeker, browse → apply → shortlist (via recruiter) → pay ₹99 via Razorpay. | Webhook fires; payment status PAID; hospital contact unlocked. |
| **8. SOS job notification** | Recruiter posts an SOS job; seeker with alert ON gets in-app + email + (if subscribed) WhatsApp. | All three channels deliver. |
| **9. Web push** | Allow browser push; trigger an event. | Push arrives on the device. |

If 9/9 pass → rotation complete, project ready for the next P0 item.

---

## "What if I'm mid-rotation and something breaks?"

- **BE won't start after env change** → check Joi schema in
  `src/config/env.validation.ts`; usually `length ≥ 32` or
  `MUST differ from`. Read the boot error literally.
- **Login broken across the board** → JWT secret mismatch. Roll back to
  previous JWT secrets in `.env`, restart, debug.
- **Razorpay webhooks 400** → key rotated but webhook secret wasn't, or
  vice versa. Confirm both `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET`
  match what the dashboard shows.
- **Decryption errors in logs** after rotating `CONFIG_ENCRYPTION_KEY` →
  expected. Re-enter every SystemConfig secret via Admin → Config.

---

## After rotation — security checklist next steps

- Items 2–5 of the P0 hardening pass (verifyUploadKey wiring, body limit,
  mongo-sanitize, timing-safe Razorpay compare) — being shipped in the
  same session as this runbook.
- P1 items (Sentry, HSTS bump, custom CSP, GDPR endpoints, npm audit) are
  scoped for the next session.
