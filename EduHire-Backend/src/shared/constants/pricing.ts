// Pricing & timing constants — single source of truth for money & job lifecycle.
// All amounts are integer paise. Server re-computes every payment from these.

// --- School-paid (recruiter side) ---
export const RECRUITER_MONTHLY_PAISE = 50_000; // ₹500 — School monthly subscription (unlimited job posts)
export const FREE_TIER_JOB_LIMIT = 2; // Free active posts/month without subscription

// --- Teacher-paid (seeker side) --- gated behind TEACHER_PAID_ENABLED setting
export const APPLICATION_FEE_PAISE = 9_900; // ₹99 — Teacher confirms interview after shortlist (off by default)
export const SHORTLIST_PAY_WINDOW_MS = 48 * 60 * 60 * 1000; // 48h to pay or auto-close

// --- Job lifecycle TTLs ---
export const FULL_TIME_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30d active listing window
export const SOS_TTL_MS = 24 * 60 * 60 * 1000; // legacy — SOS removed in EduHire, kept for TS compat

// --- Subscription cycle ---
export const SUBSCRIPTION_CYCLE_DAYS = 30; // Billing cadence for school subscription
