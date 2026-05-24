// RxJobs4U enums — single source of truth for the backend.
// Mirrored manually in rxjobs4u-frontend/lib/shared/enums when needed.
// See ProjectDocuments/DATA_MODEL.md §Enum Registry.

export enum Role {
  JOB_SEEKER = 'JOB_SEEKER',
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

export enum JobType {
  SOS = 'SOS',
  FULL_TIME = 'FULL_TIME',
}

export enum JobStatus {
  PENDING_PAYMENT = 'PENDING_PAYMENT', // Full-time: hospital posted, awaiting ₹299 payment
  PENDING_SUBSCRIPTION = 'PENDING_SUBSCRIPTION', // SOS: hospital posted, no active subscription
  ACTIVE = 'ACTIVE', // Live and discoverable
  FILLED = 'FILLED', // Hospital selected a candidate (Won)
  EXPIRED = 'EXPIRED', // Full-time: 30-day TTL hit
  AUTO_DISABLED = 'AUTO_DISABLED', // SOS: 24-hour TTL hit
  DISABLED_BY_ADMIN = 'DISABLED_BY_ADMIN',
}

/**
 * Application lifecycle (full-time):
 *   INTERESTED → SHORTLISTED → PAID → WON
 *                                 ↘   ↘
 *                                  ↘   CLOSED
 *                                   CLOSED (also: 48h pay window expired)
 *
 * SOS lifecycle (no payment, free interest):
 *   INTERESTED → WON | CLOSED
 */
export enum ApplicationState {
  INTERESTED = 'INTERESTED', // Seeker showed interest (free). Awaiting hospital review.
  SHORTLISTED = 'SHORTLISTED', // Hospital picked them. ₹99 payment notice sent. 48h to pay.
  PAID = 'PAID', // Seeker paid ₹99. Contact details + interview info revealed.
  WON = 'WON', // Hospital confirmed hire after interview.
  CLOSED = 'CLOSED', // Declined / pay window expired / withdrawn.
}

export enum PaymentKind {
  JOB_POST = 'JOB_POST', // Full-time: ₹299 to publish job
  APPLICATION = 'APPLICATION', // Full-time: ₹99 paid by seeker after shortlist
  SUBSCRIPTION = 'SUBSCRIPTION', // SOS: ₹399/month for hospital
  SEEKER_SOS_SUBSCRIPTION = 'SEEKER_SOS_SUBSCRIPTION', // SOS: ₹199/month for seeker
  BOOST = 'BOOST', // Full-time: ₹99/month to re-activate expired job
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

export enum HospitalSize {
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

export enum HospitalDepartment {
  LAB               = 'LAB',
  PHARMACY          = 'PHARMACY',
  RADIOLOGY         = 'RADIOLOGY',
  OPERATION_THEATRE = 'OPERATION_THEATRE',
  ICU               = 'ICU',
  EMERGENCY         = 'EMERGENCY',
  CANTEEN           = 'CANTEEN',
  HOSTEL            = 'HOSTEL',
}

export enum AvailableTimings {
  TWENTY_FOUR_SEVEN = '24_7',
  MORNING = 'MORNING',
  NIGHT = 'NIGHT',
  NINE_TO_FIVE = '9_TO_5',
  EVENING = 'EVENING',
}

export enum NotificationKind {
  // Seeker-facing
  APPLICATION_SHORTLISTED = 'APPLICATION_SHORTLISTED', // hospital shortlisted you — pay ₹99 in 48h
  APPLICATION_WON = 'APPLICATION_WON', // hospital confirmed hire
  APPLICATION_CLOSED = 'APPLICATION_CLOSED', // pay window expired or hospital declined
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  NEW_JOB_IN_LOCATION = 'NEW_JOB_IN_LOCATION',
  // Recruiter-facing
  NEW_INTEREST = 'NEW_INTEREST', // someone showed interest in your job
  APPLICANT_PAID = 'APPLICANT_PAID', // shortlisted seeker paid — contact revealed both ways
  JOB_FILLED = 'JOB_FILLED', // self-confirmation when marking Won
  JOB_EXPIRING_SOON = 'JOB_EXPIRING_SOON',
  JOB_AUTO_DISABLED = 'JOB_AUTO_DISABLED',
  SUB_RENEWED = 'SUB_RENEWED',
  SUB_RENEWAL_FAILED = 'SUB_RENEWAL_FAILED',
  HOSPITAL_VERIFIED = 'HOSPITAL_VERIFIED',
  // Admin-facing
  HOSPITAL_REGISTERED = 'HOSPITAL_REGISTERED',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
}
