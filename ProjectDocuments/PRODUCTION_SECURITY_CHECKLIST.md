# Production Security Checklist — Generic Web Portal

> Reusable, portal-agnostic pre-deploy hardening checklist. Apply to any
> Node/Nest/Express/FastAPI/Django backend with a SPA/SSR frontend before going
> public. Inspired by OWASP ASVS L1 + practical incident learnings.
>
> **How to use this file**: each row has *What*, *Why*, and *How to verify*. Mark
> a row ✅ shipped (with commit hash) or ❌ open. When every P0 and P1 row is ✅,
> you can deploy with reasonable confidence. P2 items are post-launch hardening.
>
> The accompanying file `PRE_DEPLOY_SECURITY_AUDIT.md` is RxJobs4U's *instance*
> of this checklist — read it for code-level citations on what "shipped" looks
> like in practice.

---

## Severity legend
- **P0** = blocks deploy. Real attack surface, exploitable today.
- **P1** = should ship before public launch. Limits blast radius / preserves
  evidence.
- **P2** = post-launch hardening. Reduces risk over time.

---

## 1. Secrets & credentials (P0)

| # | What | Why | How to verify |
|---|---|---|---|
| 1.1 | No secrets in source control | Leaked secrets show up on GitHub search in <60s | `git log -p` for the secret literal; scan with `gitleaks` / `trufflehog` |
| 1.2 | `.env` is in `.gitignore`; `.env.example` carries only placeholders | One slip and you're rotating every key | Confirm `.gitignore` covers `.env`, `.env.*`, `*.pem`, `*.key` |
| 1.3 | Separate secrets per environment (dev / staging / prod) | Dev secrets shared with prod = one leak compromises prod | Diff the three env files; secrets MUST differ |
| 1.4 | Long, random, never-typed-by-hand secrets (≥32 chars, generated) | Short or human-typed = brute-forceable / guessable | `openssl rand -hex 32` is the canonical generator |
| 1.5 | Rotation runbook + the steps actually rehearsed | If you can't rotate fast, you can't respond to a leak | Document: which provider portal, which app restart, who pages on-call |
| 1.6 | Distinct keys for distinct purposes (no "master key" for JWT + encryption + signing) | One leak → total compromise | Grep for re-use: a key should appear in exactly one logical place |
| 1.7 | If a key is *ever* visible in a chat / screen-share / paste-bin → rotate | "I'll rotate later" rarely happens | Pre-commit hook + post-incident rotation script |

---

## 2. Authentication (P0)

| # | What | Why | How to verify |
|---|---|---|---|
| 2.1 | Passwords hashed with bcrypt / argon2 / scrypt at appropriate cost | MD5/SHA1/SHA256 = crackable in minutes on commodity GPUs | Read the user-create code; cost factor ≥10 for bcrypt |
| 2.2 | Constant-time password comparison | Timing attack leaks length / prefix | Use `bcrypt.compare()` / `crypto.timingSafeEqual()`, never `===` |
| 2.3 | Short-lived access tokens (≤15 min) + longer refresh tokens with rotation | Long-lived tokens = post-leak window of hours/days | Check JWT `exp`; refresh-token rotation on every refresh |
| 2.4 | Refresh tokens revocable (blacklist on logout / version field) | Logout that doesn't actually log out = real-world session takeover | DB-backed blacklist OR `tokenVersion` claim verified against user record |
| 2.5 | Account-state recheck on every request (suspended / deleted users blocked) | A token issued before suspension still works until it expires otherwise | JWT strategy `validate()` fetches user, checks `isActive`/`deletedAt` |
| 2.6 | OAuth flows verify the provider's signature, not just the access token | Forged access tokens are cheap | Google: `verifyIdToken()` from `google-auth-library`; Apple: JWKS verify |
| 2.7 | OTP / magic-link codes: short TTL (5–10 min), single-use, rate-limited | Long-lived codes = SMS-pumping + brute-force | TTL on DB record; mark consumed on first verify |
| 2.8 | reCAPTCHA / Turnstile on register, login, forgot-password, OTP-send | Bot-driven credential stuffing + SMS-bombing | Verify token server-side, not just client-side |
| 2.9 | Email-verification gate before sensitive actions (job-post / payment) | Unverified emails = throwaway abuse accounts | Check the controller for an `emailVerified` guard |
| 2.10 | No user enumeration on login / reset endpoints | "User not found" vs "wrong password" = enumeration oracle | Return identical messages for both cases |

---

## 3. Authorization (P0)

| # | What | Why | How to verify |
|---|---|---|---|
| 3.1 | All routes default to authenticated; opt-in to public via decorator | Forgetting to add an auth guard = data leak | Look for a global guard registered in `main.ts` / equivalent |
| 3.2 | Role-based guards on admin routes — and on any *partial* admin action | Missing one PATCH endpoint is a privilege-escalation bug | Grep every `/admin/*` route for the role decorator |
| 3.3 | Object-level authz (user can only see / mutate their own records) | The classic IDOR. Most-exploited webapp bug class. | For every "by id" route, the service filters by `userId` too, not just `_id` |
| 3.4 | No client-trusted role / userId from request body or headers | "Just pass `role: admin` in the JSON" works more often than you'd think | Role / userId reads from the JWT payload only, never from body/headers/query |
| 3.5 | Mass-assignment protection (whitelist update fields) | Spread `req.body` into `User.update()` = anyone can set `role: admin` | Service uses an explicit field list, not `{...dto}` |

---

## 4. Input validation & injection (P0)

| # | What | Why | How to verify |
|---|---|---|---|
| 4.1 | Schema validation on every endpoint (class-validator / Zod / pydantic) | Untyped input = the source of half of all CVEs | DTO with validators on every controller method |
| 4.2 | Whitelist enums, lengths, formats — don't just check "is string" | "Is string" passes JSON-shaped SQL | Each DTO field has a max length + format constraint |
| 4.3 | Parameterized DB queries / ORM-only — no string-concat SQL | SQL injection. Still real. Still costs companies billions. | Grep for `${` inside query strings, `format()`, `printf` |
| 4.4 | Mongo query operator sanitization (`mongo-sanitize` or equivalent) | `{ $ne: null }` injected via query string → "login as anyone" | Middleware strips `$`-prefixed keys from request data |
| 4.5 | NoSQL `$where` / raw JS eval disallowed | Server-side JS = arbitrary code exec | Grep for `$where`, `$function`, `eval` in queries |
| 4.6 | Frontend escapes by default (React/Vue/Angular auto-escape); no `dangerouslySetInnerHTML` without sanitizer | XSS. Same story as SQLi. | Grep for `dangerouslySetInnerHTML`, `v-html`, `innerHTML =`. Wrap any survivor in DOMPurify |
| 4.7 | URL parameters validated as the expected shape (UUID / ObjectId / number) | Raw query-string into Mongo = type-juggling auth bypass | Pipe / decorator coerces and validates path params |
| 4.8 | Body-size limits + JSON depth limits | Algorithmic DoS via huge / deeply-nested payloads | Express `json({ limit: '1mb' })`; Nest body parser config |
| 4.9 | File-upload MIME / size allow-list (verified server-side, not just client) | Client-claimed `image/png` can be a `.exe` | Verify with content-type sniff on the actual bytes |

---

## 5. API hardening (P0–P1)

| # | What | Why | How to verify | Sev |
|---|---|---|---|---|
| 5.1 | CORS allow-list (no `*`, no reflected `Origin`) | Reflected CORS = credentialed XHR from any origin | `CORS_ORIGINS` env-driven; no `cors({ origin: true })` | P0 |
| 5.2 | Rate limits — per-endpoint, tighter on auth | Login brute-force, SMS pumping, scraping | Throttler config: register 3/min, login 5/min, OTP 3/min |  P0 |
| 5.3 | CSRF protection on state-changing routes that use cookies | Cookie-auth + no CSRF = drive-by attacks | Either `SameSite=Strict` + token guard, or no-cookie auth | P0 |
| 5.4 | Idempotency keys on payment / order-creation routes | Network retries = double-charge | Server stores key + dedupes by client-supplied UUID | P1 |
| 5.5 | Webhook signature verification (Razorpay HMAC, Stripe sig, Meta `X-Hub-Signature`) | Anyone can hit your webhook URL | Constant-time HMAC compare; never trust webhook body without it | P0 |
| 5.6 | Webhook idempotency (record `event.id` before processing) | Provider retries = double-fulfillment | DB uniqueness on the event id |  P0 |
| 5.7 | Webhook IP allow-list where provider publishes one | Defense-in-depth on top of HMAC | Reverse-proxy or app-layer allow-list | P2 |

---

## 6. Cryptography & data at rest (P0–P1)

| # | What | Why | How to verify | Sev |
|---|---|---|---|---|
| 6.1 | TLS 1.2+ everywhere (no HTTP, no TLS 1.0/1.1) | Plaintext = MITM on coffee-shop wifi | SSL Labs scan ≥ grade A |  P0 |
| 6.2 | HSTS header with `max-age ≥ 31536000` + `includeSubDomains` | Without HSTS, the first request is plaintext | Inspect response headers in prod |  P0 |
| 6.3 | Secrets / API keys encrypted at rest in any "settings" table | DB dump = secret dump | AES-256-GCM (preferred) or AES-256-CBC + HMAC; key from env |  P0 |
| 6.4 | PII at rest — at minimum hashed/tokenized where possible (e.g. phone hashes for lookup) | DB dump = PII dump = compliance breach | Schema review |  P1 |
| 6.5 | DB credentials scoped (app user has CRUD only, not admin / shell) | Compromised app = full DB takeover | Connection string uses the app role, not the root |  P0 |
| 6.6 | Backups encrypted + tested restore at least once | Untested backup = no backup | Quarterly restore drill |  P1 |

---

## 7. Cookies & security headers (P0)

| # | What | Why | How to verify |
|---|---|---|---|
| 7.1 | `HttpOnly` on every session / refresh cookie | XSS can read non-HttpOnly cookies | Inspect `Set-Cookie` in response |
| 7.2 | `Secure` flag (HTTPS-only) in prod | Cookie sent over HTTP = stealable | `app.use(cookieParser)` config; env-gated |
| 7.3 | `SameSite=Lax` (minimum) or `Strict` | Drive-by CSRF | Same |
| 7.4 | `Domain` attribute set deliberately, not by default, when subdomain split | Cookie scoped to wrong host = silent rejection | Set `COOKIE_DOMAIN` env explicitly per environment |
| 7.5 | Helmet (or equivalent) → CSP / Referrer-Policy / X-Content-Type-Options / X-Frame-Options | Whole class of attacks shut down at the header level | `securityheaders.com` scan ≥ grade A |
| 7.6 | CSP — at least `default-src 'self'` + per-origin allow-list, no `'unsafe-inline'` in production | XSS bombs disarmed | Review header in prod browser DevTools |

---

## 8. Logging & audit (P1)

| # | What | Why | How to verify |
|---|---|---|---|
| 8.1 | Structured logs (JSON), not free-text | Free-text is unsearchable at 10k req/s | Logger is pino/winston/zerolog, not `console.log` |
| 8.2 | PII redaction at log emission (email partial-mask, no full phone / password / token) | Logs leak to SIEM / Datadog / ops engineers | Helper `redactEmail()` / `redactPhone()` + library redact config |
| 8.3 | Audit log for sensitive actions (admin user-create / role-change / data export / failed-auth) | Forensics need a paper trail | Dedicated `AuditLog` collection / table, append-only |
| 8.4 | Failed-auth events recorded with IP / UA / reason (masked email) | Detect credential stuffing in motion | `AUTH_FAILED`, `OTP_FAILED`, `OTP_LOCKED` entries |
| 8.5 | Log level config (debug/info/warn/error) per env | Debug-level in prod = $$$ + leaks | `LOG_LEVEL` env, `info` in prod |
| 8.6 | Log retention policy (e.g. 30 days hot, 1 year cold) | Forever-retention is a privacy + cost risk | Documented + actually applied (provider lifecycle rules) |

---

## 9. File uploads & object storage (P0–P1)

| # | What | Why | How to verify | Sev |
|---|---|---|---|---|
| 9.1 | Presigned-URL pattern: server signs short-lived PUT, client uploads directly to bucket | Avoids streaming files through your app | Endpoint returns a URL with `expiresIn ≤ 300s` |  P0 |
| 9.2 | After upload, server HeadObjects the key + verifies content-type / size before persisting the reference | Without this the client can claim any S3 key (including someone else's resume) | `HeadObjectCommand` call before DB write |  P0 |
| 9.3 | Bucket private by default; access only via short-lived signed GET URLs | Public bucket = public PII | Bucket policy review; no `s3:GetObject` for `Principal: *` |  P0 |
| 9.4 | Key naming scoped by user/tenant id, validated against the requesting user | Cross-tenant access via key guessing | Key is `kind/userId/uuid.ext`; service rejects mismatched userId |  P0 |
| 9.5 | MIME allow-list per upload kind (`resume → pdf`, `logo → jpg/png/webp`) | Block executable + script extensions | `MIME_ALLOWLIST` map + size limits |  P0 |
| 9.6 | Antivirus scan on user-uploaded files (ClamAV / S3 ObjectLambda + 3rd-party) | Don't be the malware redistribution channel | Hook into post-upload event |  P2 |

---

## 10. Third-party integrations (P0–P1)

| # | What | Why | How to verify | Sev |
|---|---|---|---|---|
| 10.1 | Payment gateway: signature verify on every webhook call + idempotency dedupe | Anyone can POST to your `/webhooks/payment` URL | HMAC compare with `crypto.timingSafeEqual`; `event.id` UNIQUE |  P0 |
| 10.2 | Payment fulfillment in a DB transaction | Partial fulfillment = lost money / lost orders | Mongo session / SQL `BEGIN`-`COMMIT` around the multi-doc write |  P0 |
| 10.3 | Outbound HTTP from your server: explicit timeouts (connect + read) | A hanging upstream takes down your event loop | Every `axios` / `fetch` call sets `timeout` |  P1 |
| 10.4 | Outbound HTTP: retries with capped exponential backoff + jitter | Naive retries amplify upstream incidents | Retry policy in a single helper |  P2 |
| 10.5 | SMS / email: per-recipient daily caps to limit pump-and-dump abuse | Attacker sends infinite OTPs to a target's phone | Counter in cache, reset daily |  P1 |
| 10.6 | API keys in third-party calls are server-side only — never reach the browser | A leaked key on a CDN is gone forever | Search your built JS bundle for the key prefix |  P0 |

---

## 11. Dependency hygiene (P1)

| # | What | Why | How to verify |
|---|---|---|---|
| 11.1 | `npm audit --production` (or equivalent) is clean of critical/high CVEs | Known CVEs in your deps = trivial exploitation | `npm audit`, Snyk, GitHub Dependabot |
| 11.2 | Dependabot / Renovate enabled with auto-merge for patch versions | Otherwise you forget to update | PR list shows it actively running |
| 11.3 | Lockfile committed (`package-lock.json` / `yarn.lock` / `pnpm-lock.yaml`) | Without lockfile, prod can drift from dev | File exists; CI uses `npm ci`, not `npm install` |
| 11.4 | No deprecated / abandoned packages in critical paths | Unmaintained = no security patches | Audit `npm outdated`; check repo last-commit date |
| 11.5 | Production install excludes devDependencies | Test frameworks in prod = bigger attack surface | `npm ci --omit=dev` or `NODE_ENV=production npm ci` |

---

## 12. Infrastructure (P0–P1)

| # | What | Why | How to verify | Sev |
|---|---|---|---|---|
| 12.1 | Reverse proxy (nginx / Cloudflare / ALB) in front of the app | Direct app exposure = no rate-limit / TLS termination / DDoS shield | `curl --resolve` the app's private IP — should be unreachable |  P0 |
| 12.2 | App listens on `127.0.0.1` (loopback) when behind a reverse proxy | Bypassing the proxy = bypassing all defenses | `netstat -tlnp` shows the app port bound to localhost |  P1 |
| 12.3 | `trust proxy` configured so `req.ip` reflects the real client | Without it, all rate limits hit the proxy's IP | Set `app.set('trust proxy', 1)` or framework equivalent |  P0 |
| 12.4 | Cloudflare / WAF in front for L7 DDoS + bot mitigation | Solo origin = single point of failure | DNS resolves to Cloudflare IPs |  P1 |
| 12.5 | SSH: key-only, no root login, non-standard port optional | Public 22+password = compromised in hours | `/etc/ssh/sshd_config` review |  P0 |
| 12.6 | Firewall: only 80/443/22 exposed externally | Open MongoDB port = ransom note | `ufw status` / cloud SG review |  P0 |
| 12.7 | DB never publicly reachable; bound to VPC / IP allow-list | Mongo / Postgres on the open internet → scans hit you in <1 min | Connection from outside should fail |  P0 |

---

## 13. Error handling & info disclosure (P0)

| # | What | Why | How to verify |
|---|---|---|---|
| 13.1 | Global exception filter — uniform error envelope, no stack traces in prod | Stack trace leaks framework version / file paths | `NODE_ENV=production` → no `stack` field in response |
| 13.2 | 404s on unknown routes (no app-info page) | Unknown route → "Cannot GET /xyz on Express 4.17.3" = recon gold | Route returns generic 404 |
| 13.3 | Source maps NOT served in production (or served with auth-gated access only) | Map files reveal original code | Inspect `/static/js/main.<hash>.js.map` returns 404 |
| 13.4 | `X-Powered-By` and framework headers stripped | Free reconnaissance for an attacker | Helmet `hidePoweredBy()` |
| 13.5 | Health endpoint exposes liveness only, not versions / deps / env | `/health` returning dep versions = CVE shopping list | Body is `{ ok: true }`, nothing else |

---

## 14. Monitoring & incident response (P1)

| # | What | Why | How to verify |
|---|---|---|---|
| 14.1 | Uptime monitoring (Pingdom / Uptime Kuma / Better Stack) on the public endpoint | Otherwise you find out from users on Twitter | Alert wired to a paging channel |
| 14.2 | Error tracking (Sentry / Rollbar) wired in with PII scrubbing | Otherwise prod errors are invisible | DSN in env; test by triggering a known throw |
| 14.3 | Alerting on auth-failure spike, 5xx spike, webhook signature mismatch | Detect attacks while they're happening | Threshold rule in monitoring tool |
| 14.4 | Runbook for top 5 incidents (DB down, secret leak, key compromise, payment outage, mass account takeover) | Improvising under pressure produces mistakes | Documented + linked from oncall portal |
| 14.5 | On-call rotation defined — even if it's one person | "Nobody is on call" = nothing gets answered at 2am | Schedule in PagerDuty / OpsGenie / a calendar |

---

## 15. Privacy & compliance (P1)

| # | What | Why | How to verify |
|---|---|---|---|
| 15.1 | Privacy Policy + Terms of Service linked from every page footer | Legal requirement in most jurisdictions | Footer audit |
| 15.2 | Data-deletion endpoint / process for "delete my account" | GDPR Art.17, India DPDP Act §12 | Service can hard-delete user data on request |
| 15.3 | Data-export endpoint for "give me my data" | GDPR Art.20, DPDP §11 | Returns the user's data as JSON / ZIP |
| 15.4 | Cookie consent banner if you use non-essential cookies (analytics / ads) | EU / California enforcement | Banner blocks load of GA/Meta pixel until accepted |
| 15.5 | Email opt-out / unsubscribe link in every non-transactional email | CAN-SPAM + similar laws | Inspect the email template |
| 15.6 | DPA (Data Processing Agreement) signed with every sub-processor (Brevo, AWS, etc.) | Compliance audit trail | Filing in legal share |

---

## 16. Pre-launch sanity checks (P0)

| # | What | How to verify |
|---|---|---|
| 16.1 | All test / seed accounts removed or disabled | Grep DB for known test emails |
| 16.2 | Admin password is not a default (`admin@1234` etc.) | Test login with common defaults — must fail |
| 16.3 | Debug routes (Swagger UI, `/dev-tools`) gated behind auth or removed in prod | `curl /api-docs` → 401/404 |
| 16.4 | `console.log` / `print` statements stripped from hot paths | Grep the codebase |
| 16.5 | Real domain + real CORS origins in env, not localhost | Boot-time env dump confirms |
| 16.6 | TLS cert valid + auto-renewal verified (certbot timer / cloud-managed) | `openssl s_client -connect host:443` + check expiry > 30d |
| 16.7 | DNS: SPF / DKIM / DMARC records for the sending domain | Otherwise outbound email lands in spam | `dig TXT yourdomain.com` |
| 16.8 | One end-to-end happy-path smoke test passes on prod after deploy | Smoke is cheap, regressions are expensive | Manual or automated curl-based |

---

## Per-launch sign-off

Print this table, walk it row-by-row before announcing the launch. Sign + date.

```
P0 — Secrets & credentials             ☐
P0 — Authentication                    ☐
P0 — Authorization                     ☐
P0 — Input validation & injection      ☐
P0 — API hardening                     ☐
P0 — Cryptography & data at rest       ☐
P0 — Cookies & security headers        ☐
P0 — File uploads & object storage     ☐
P0 — Third-party integrations          ☐
P0 — Infrastructure                    ☐
P0 — Error handling & info disclosure  ☐
P0 — Pre-launch sanity checks          ☐
P1 — Logging & audit                   ☐
P1 — Dependency hygiene                ☐
P1 — Monitoring & incident response    ☐
P1 — Privacy & compliance              ☐
P2 — (post-launch hardening backlog)   ☐

Signed: ____________________   Date: ____________
```

---

## Related reading
- **OWASP ASVS** — Application Security Verification Standard (`owasp.org/ASVS`)
- **OWASP Top 10** — high-level "what gets exploited most" list
- **OWASP Cheat Sheets** — copy-paste solutions for individual problems
- **Mozilla Observatory** — automated header / TLS scan (`observatory.mozilla.org`)
- **SSL Labs** — TLS configuration scan (`ssllabs.com/ssltest`)
- **securityheaders.com** — header audit
- **gitleaks** / **trufflehog** — secret scanners (run pre-commit + in CI)
