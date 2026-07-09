// School Teacher enums — single source of truth for the backend.
// Mirrored manually in eduhire-frontend/lib/shared/enums when needed.
// See ProjectDocuments/DATA_MODEL.md §Enum Registry.

export enum Role {
  TEACHER = 'TEACHER',
  RECRUITER = 'RECRUITER',
  ADMIN = 'ADMIN',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum Availability {
  IMMEDIATE = 'IMMEDIATE',
  WITHIN_2_WEEKS = 'WITHIN_2_WEEKS',
  WITHIN_1_MONTH = 'WITHIN_1_MONTH',
  READY_TO_SERVE_NOTICE = 'READY_TO_SERVE_NOTICE',
  NOT_LOOKING = 'NOT_LOOKING',
}

export enum JobStatus {
  ACTIVE = 'ACTIVE', // Live and discoverable
  FILLED = 'FILLED', // School selected a candidate (Won)
  EXPIRED = 'EXPIRED', // 30-day TTL hit
  AUTO_DISABLED = 'AUTO_DISABLED', // Disabled as a side-effect of the owning school being deleted/deactivated
  DISABLED_BY_ADMIN = 'DISABLED_BY_ADMIN',
}

/**
 * Application lifecycle:
 *   INTERESTED → SHORTLISTED → PAID → WON      (TEACHER_PAID_ENABLED on)
 *                                 ↘   ↘
 *                                  ↘   CLOSED
 *                                   CLOSED (also: 48h pay window expired)
 *
 *   INTERESTED → SHORTLISTED → WON | CLOSED    (TEACHER_PAID_ENABLED off — default)
 */
export enum ApplicationState {
  INTERESTED = 'INTERESTED', // Teacher showed interest (free). Awaiting school review.
  SHORTLISTED = 'SHORTLISTED', // School picked them. If TEACHER_PAID_ENABLED, payment notice sent (48h to pay).
  PAID = 'PAID', // Teacher paid the shortlist fee. Contact details + interview info revealed.
  WON = 'WON', // School confirmed hire after interview.
  CLOSED = 'CLOSED', // Declined / pay window expired / withdrawn.
}

export enum PaymentKind {
  APPLICATION = 'APPLICATION', // Teacher shortlist-confirmation fee (gated behind TEACHER_PAID_ENABLED)
  SUBSCRIPTION = 'SUBSCRIPTION', // School monthly unlimited-posting subscription
  BOOST = 'BOOST', // Re-activate an expired job post
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum SchoolSize {
  SMALL_UNDER_50 = 'SMALL_UNDER_50',
  MEDIUM_50_200 = 'MEDIUM_50_200',
  LARGE_200_500 = 'LARGE_200_500',
  XLARGE_OVER_500 = 'XLARGE_OVER_500',
}

export enum MaritalStatus {
  SINGLE = 'SINGLE',
  MARRIED = 'MARRIED',
  DIVORCED = 'DIVORCED',
  WIDOWED = 'WIDOWED',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum TypeOfPractice {
  FREELANCE = 'FREELANCE',
  REGULAR_JOB = 'REGULAR_JOB',
  PRIVATE = 'PRIVATE',
}

export enum Academics {
  INTERNSHIP = 'INTERNSHIP',
  GRADUATE = 'GRADUATE',
  POST_GRADUATE = 'POST_GRADUATE',
  ASST_PROFESSOR = 'ASST_PROFESSOR',
  ASSOCIATE_PROFESSOR = 'ASSOCIATE_PROFESSOR',
  PROFESSOR = 'PROFESSOR',
}

export enum SalaryRange {
  BELOW_25K     = 'BELOW_25K',      // < ₹25,000/mo
  RANGE_25_50K  = 'RANGE_25_50K',   // ₹25K–₹50K/mo
  RANGE_50K_1L  = 'RANGE_50K_1L',   // ₹50K–₹1L/mo
  RANGE_1L_1_5L = 'RANGE_1L_1_5L',  // ₹1L–₹1.5L/mo
  RANGE_1_5L_2L = 'RANGE_1_5L_2L',  // ₹1.5L–₹2L/mo
  ABOVE_2L      = 'ABOVE_2L',       // > ₹2L/mo
}

// Expanded 2026-07-09 (DECISIONS.md §3) to match every subject option already live
// in the job-posting/teacher-profile UI — was previously a narrower 10-value list
// that didn't cover what the product actually offered.
export enum Subject {
  PRIMARY                = 'PRIMARY',
  ENGLISH                = 'ENGLISH',
  MATHEMATICS            = 'MATHEMATICS',
  SCIENCE                = 'SCIENCE',
  PHYSICS                = 'PHYSICS',
  CHEMISTRY              = 'CHEMISTRY',
  BIOLOGY                = 'BIOLOGY',
  SOCIAL_STUDIES         = 'SOCIAL_STUDIES',
  HINDI                  = 'HINDI',
  COMPUTER_SCIENCE       = 'COMPUTER_SCIENCE',
  TELUGU                 = 'TELUGU',
  HISTORY                = 'HISTORY',
  GEOGRAPHY              = 'GEOGRAPHY',
  ECONOMICS              = 'ECONOMICS',
  BUSINESS_STUDIES       = 'BUSINESS_STUDIES',
  ACCOUNTANCY            = 'ACCOUNTANCY',
  INFORMATION_TECHNOLOGY = 'INFORMATION_TECHNOLOGY',
  ART_CRAFTS             = 'ART_CRAFTS',
  MUSIC                  = 'MUSIC',
  DANCE                  = 'DANCE',
  ENVIRONMENTAL_SCIENCE  = 'ENVIRONMENTAL_SCIENCE',
  PRE_PRIMARY_EDUCATION  = 'PRE_PRIMARY_EDUCATION',
  SPECIAL_EDUCATION      = 'SPECIAL_EDUCATION',
  SCHOOL_ADMINISTRATION  = 'SCHOOL_ADMINISTRATION',
  COUNSELING             = 'COUNSELING',
  OTHERS                 = 'OTHERS',
}

// Expanded 2026-07-09 (DECISIONS.md §3) to match every role option already live
// in the job-posting UI — was previously narrowed to the 4-value client-provided
// list (SGT/PGT/HM/PRINCIPAL), which didn't cover what schools could already post for.
export enum TeacherPost {
  SGT                = 'SGT',
  TGT                = 'TGT',
  PGT                = 'PGT',
  PRE_PRIMARY_TEACHER = 'PRE_PRIMARY_TEACHER',
  HM                 = 'HM',
  PRINCIPAL          = 'PRINCIPAL',
  VICE_PRINCIPAL     = 'VICE_PRINCIPAL',
  SPECIAL_EDUCATOR   = 'SPECIAL_EDUCATOR',
  LAB_ASSISTANT      = 'LAB_ASSISTANT',
  LIBRARIAN          = 'LIBRARIAN',
  COUNSELOR          = 'COUNSELOR',
  IIT_JEE_FACULTY    = 'IIT_JEE_FACULTY',
  NEET_FACULTY       = 'NEET_FACULTY',
  OTHER              = 'OTHER',
}

// New 2026-07-09 (DECISIONS.md §3) — grade-level/section for a job posting.
// Distinct from Subject (what's taught) — this is which level/department the
// role sits in. Was previously an un-enumerated free-text field duplicated
// (with drift) across the job-post and job-edit frontend pages.
export enum JobDepartment {
  PRE_PRIMARY        = 'PRE_PRIMARY',
  PRIMARY            = 'PRIMARY',
  SECONDARY          = 'SECONDARY',
  SENIOR_SECONDARY   = 'SENIOR_SECONDARY',
  ARTS_CRAFTS        = 'ARTS_CRAFTS',
  COMPUTER_SCIENCE   = 'COMPUTER_SCIENCE',
  PHYSICAL_EDUCATION = 'PHYSICAL_EDUCATION',
  ADMINISTRATION     = 'ADMINISTRATION',
  LIBRARY            = 'LIBRARY',
  COUNSELING         = 'COUNSELING',
  OTHER              = 'OTHER',
}

export enum AvailableTimings {
  TWENTY_FOUR_SEVEN = '24_7',
  MORNING = 'MORNING',
  NIGHT = 'NIGHT',
  NINE_TO_FIVE = '9_TO_5',
  EVENING = 'EVENING',
}

export enum NotificationKind {
  // Teacher-facing
  APPLICATION_SHORTLISTED = 'APPLICATION_SHORTLISTED', // school shortlisted you — pay in 48h (if TEACHER_PAID_ENABLED)
  APPLICATION_WON = 'APPLICATION_WON', // school confirmed hire
  APPLICATION_CLOSED = 'APPLICATION_CLOSED', // pay window expired or school declined
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  NEW_JOB_IN_LOCATION = 'NEW_JOB_IN_LOCATION',
  // Recruiter-facing
  NEW_INTEREST = 'NEW_INTEREST', // someone showed interest in your job
  APPLICANT_PAID = 'APPLICANT_PAID', // shortlisted teacher paid — contact revealed both ways
  JOB_FILLED = 'JOB_FILLED', // self-confirmation when marking Won
  JOB_EXPIRING_SOON = 'JOB_EXPIRING_SOON',
  JOB_AUTO_DISABLED = 'JOB_AUTO_DISABLED',
  SUB_RENEWED = 'SUB_RENEWED',
  SUB_RENEWAL_FAILED = 'SUB_RENEWAL_FAILED',
  SCHOOL_VERIFIED = 'SCHOOL_VERIFIED',
  // Admin-facing
  SCHOOL_REGISTERED = 'SCHOOL_REGISTERED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}
