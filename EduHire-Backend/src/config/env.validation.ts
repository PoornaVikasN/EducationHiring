import * as Joi from 'joi';

// Joi schema for environment variables. Validated at boot via ConfigModule.forRoot.
// Strategy: fail-fast on anything mis-configured. Critical secrets (JWT) are required
// in ALL environments; integration keys (Razorpay, S3, MSG91, Google OAuth, SMTP, Mongo
// Atlas) are required only when NODE_ENV=production — dev can boot without them and
// the corresponding subsystem will fail at use time.

const prodRequiredString = Joi.string().when('NODE_ENV', {
  is: 'production',
  then: Joi.required(),
  otherwise: Joi.allow('').optional(),
});

const prodRequiredUri = Joi.string()
  .uri()
  .when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.allow('').optional(),
  });

export const envValidationSchema = Joi.object({
  // General
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  SERVER_PORT: Joi.number().integer().min(1).max(65535).default(3001),
  TZ: Joi.string().default('UTC'),
  CORS_ORIGINS: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  // Optional. Set to ".rxjobs4u.com" in prod so the refresh cookie is shared between
  // the FE host (rxjobs4u.com) and the API host (api.rxjobs4u.com). Leave unset in dev.
  COOKIE_DOMAIN: Joi.string().allow('').optional(),

  // Public-facing FE URL used to construct outbound alert links (email, WhatsApp).
  // Defaults to the prod domain so a missing env value still produces valid links.
  PUBLIC_FRONTEND_URL: Joi.string().uri().default('https://schoolteacher.co.in'),

  // MongoDB Atlas — required in prod; dev falls back to localhost
  MONGO_DB_USERNAME: prodRequiredString,
  MONGO_DB_PASSWORD: prodRequiredString,
  MONGO_DB_HOST: prodRequiredString,
  MONGO_DB_NAME: Joi.string().default('eduhire'),

  // JWT — ALWAYS required, both secrets ≥32 chars, and they MUST differ
  JWT_ACCESS_SECRET: Joi.string().min(32).required(),
  JWT_REFRESH_SECRET: Joi.string()
    .min(32)
    .required()
    .invalid(Joi.ref('JWT_ACCESS_SECRET'))
    .messages({ 'any.invalid': 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET' }),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // SystemConfig API-key encryption — dedicated, separate from JWT
  CONFIG_ENCRYPTION_KEY: Joi.string()
    .min(32)
    .required()
    .invalid(Joi.ref('JWT_ACCESS_SECRET'), Joi.ref('JWT_REFRESH_SECRET'))
    .messages({
      'any.invalid': 'CONFIG_ENCRYPTION_KEY must differ from JWT secrets',
    }),

  // Google OAuth — only GOOGLE_CLIENT_ID is actually read (auth.service.ts
  // verifyIdToken audience check). CLIENT_SECRET and CALLBACK_URL would only
  // matter for a server-side auth-code exchange flow, which we don't use —
  // the FE does implicit OAuth and just sends an access_token / id_token to
  // the BE. Keep them optional to avoid phantom prod fail-fast.
  GOOGLE_CLIENT_ID: prodRequiredString,
  GOOGLE_CLIENT_SECRET: Joi.string().allow('').optional(),
  GOOGLE_OAUTH_CALLBACK_URL: Joi.string().uri().allow('').optional(),

  // Google Maps (optional everywhere — feature, not auth)
  GOOGLE_MAPS_API_KEY: Joi.string().allow('').optional(),

  // GSuite SMTP via nodemailer OAuth2 — see EmailService. This is the only email
  // integration actually wired into the code; there is no Brevo/SendGrid fallback.
  GMAIL_USER: prodRequiredString,
  GMAIL_CLIENT_ID: prodRequiredString,
  GMAIL_CLIENT_SECRET: prodRequiredString,
  GMAIL_REFRESH_TOKEN: prodRequiredString,
  GMAIL_ACCESS_TOKEN: Joi.string().allow('').optional(), // auto-refreshed; optional
  SMTP_SENDER_NAME: Joi.string().default('SchoolTeacher'),

  // Google reCAPTCHA v3 (optional — if missing, backend skips verification in dev)
  RECAPTCHA_SECRET_KEY: Joi.string().allow('').optional(),

  // AWS S3 (required in prod)
  AWS_REGION: Joi.string().default('ap-south-1'),
  AWS_BUCKET_NAME: prodRequiredString,
  AWS_BASE_URL: prodRequiredUri,
  AWS_ACCESS_KEY_ID: prodRequiredString,
  AWS_SECRET_ACCESS_KEY: prodRequiredString,

  // Wylto WhatsApp (OTP + new job alerts) — optional; admin can set via API Keys panel
  WYLTO_API_TOKEN: Joi.string().allow('').optional(),

  // Razorpay (required in prod)
  RAZORPAY_KEY_ID: prodRequiredString,
  RAZORPAY_KEY_SECRET: prodRequiredString,
  RAZORPAY_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  // Web Push VAPID (optional)
  VAPID_PUBLIC_KEY: Joi.string().allow('').optional(),
  VAPID_PRIVATE_KEY: Joi.string().allow('').optional(),
  VAPID_SUBJECT: Joi.string().allow('').optional(),

}).unknown(true); // allow other env vars (CI, system, etc.)
