// Pricing & timing constants — single source of truth for money & job lifecycle.
// All amounts are integer paise. Server re-computes every payment from these.

// --- School-paid (recruiter side) ---
export const RECRUITER_MONTHLY_PAISE = 50_000; // ₹500 — School monthly subscription (unlimited job posts)
export const FREE_TIER_JOB_LIMIT = 2; // Free active posts/month without subscription

// --- Teacher-paid (seeker side) --- gated behind TEACHER_PAID_ENABLED setting
export const APPLICATION_FEE_PAISE = 9_900; // ₹99 — Teacher confirms interview after shortlist (off by default)
export const SHORTLIST_PAY_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h to pay or auto-close

// Job listing duration moved to SystemConfig (key: JOB_LISTING_DURATION_DAYS) — admin-editable,
// see SystemConfigService.getJobListingDurationMs(). Was a hardcoded 30-day constant here before.

// --- Subscription cycle ---
export const SUBSCRIPTION_CYCLE_DAYS = 30; // Billing cadence for school subscription
