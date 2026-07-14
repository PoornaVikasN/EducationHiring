import { z } from 'zod';

// Mirrors EduHire-Backend/src/modules/admin/bulk-import/template-builder.ts's HEADERS —
// keep the header strings identical on both sides (manually mirrored, no build-time sync).
export const BULK_IMPORT_HEADERS: Array<{ header: string; key: string }> = [
  { header: 'User Type* (SCHOOL or TEACHER)', key: 'userType' },
  { header: 'Full Name*', key: 'fullName' },
  { header: 'Email*', key: 'email' },
  { header: 'Phone*', key: 'phone' },
  { header: 'School Registration Number* (SCHOOL rows only)', key: 'schoolRegistrationNumber' },
  { header: 'School Name (required for SCHOOL rows)', key: 'schoolName' },
  { header: 'School Address (required for SCHOOL rows)', key: 'schoolAddress' },
  { header: 'School City (required for SCHOOL rows)', key: 'schoolCity' },
  { header: 'School State (required for SCHOOL rows)', key: 'schoolState' },
  { header: 'School Pincode (required for SCHOOL rows)', key: 'schoolPincode' },
  { header: 'School Contact Email (optional, SCHOOL rows)', key: 'schoolContactEmail' },
  { header: 'School Contact Phone (optional, SCHOOL rows)', key: 'schoolContactPhone' },
  { header: 'Experience Years (optional, TEACHER rows)', key: 'experienceYears' },
  { header: 'City (optional)', key: 'city' },
  { header: 'State (optional)', key: 'state' },
  { header: 'Current School Name (optional, free text, TEACHER rows — not validated)', key: 'currentSchoolName' },
];

const REQUIRED_HEADER_KEYS = ['userType', 'fullName', 'email', 'phone', 'schoolRegistrationNumber'];

export const bulkImportRowSchema = z
  .object({
    userType: z.enum(['SCHOOL', 'TEACHER'], { message: 'User Type must be SCHOOL or TEACHER' }),
    fullName: z.string().min(2, 'Full Name is required').max(100),
    email: z.string().email('Invalid email format'),
    phone: z.string().min(10, 'Phone must be 10-13 characters').max(13),
    // Required for SCHOOL rows only (enforced below) — has no meaning on TEACHER rows.
    // TEACHER rows are standalone accounts (this is a job marketplace, not an employment
    // registry); the only real teacher-school relationship happens later via job
    // applications. `currentSchoolName` below is a free-text, unvalidated note only.
    schoolRegistrationNumber: z.string().optional(),
    schoolName: z.string().optional(),
    schoolAddress: z.string().optional(),
    schoolCity: z.string().optional(),
    schoolState: z.string().optional(),
    schoolPincode: z.string().optional(),
    schoolContactEmail: z.union([z.string().email('Invalid School Contact Email'), z.literal('')]).optional(),
    schoolContactPhone: z.string().optional(),
    experienceYears: z.number().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    currentSchoolName: z.string().max(200).optional(),
  })
  .superRefine((row, ctx) => {
    if (row.userType === 'SCHOOL') {
      const requiredForSchool = ['schoolRegistrationNumber', 'schoolName', 'schoolAddress', 'schoolCity', 'schoolState', 'schoolPincode'] as const;
      for (const key of requiredForSchool) {
        if (!row[key]) {
          ctx.addIssue({ code: 'custom', path: [key], message: `${key} is required for SCHOOL rows` });
        }
      }
    }
  });

export type BulkImportRow = z.infer<typeof bulkImportRowSchema>;

export interface ParsedRow {
  rowNumber: number;
  raw: Record<string, unknown>;
}

export interface RowValidationResult {
  rowNumber: number;
  raw: Record<string, unknown>;
  valid: boolean;
  errors: string[];
}

export interface ClientValidationSummary {
  headerErrors: string[];
  rows: RowValidationResult[];
  schoolCount: number;
  teacherCount: number;
  validCount: number;
  invalidCount: number;
}

// Reads header row values (as returned by xlsx's sheet_to_json first-row keys) and maps
// them to BulkImportRow keys via BULK_IMPORT_HEADERS, then runs the same conditional
// validation the backend re-runs (source of truth) — this is fast client-side feedback only.
export function validateParsedRows(rawRows: Array<Record<string, unknown>>): ClientValidationSummary {
  const headerErrors: string[] = [];
  if (rawRows.length === 0) {
    return { headerErrors: ['No data rows found in the file.'], rows: [], schoolCount: 0, teacherCount: 0, validCount: 0, invalidCount: 0 };
  }

  const firstRowKeys = new Set(Object.keys(rawRows[0]!));
  const headerToKey = new Map(BULK_IMPORT_HEADERS.map((h) => [h.header, h.key]));
  const presentKeys = new Set([...firstRowKeys].map((h) => headerToKey.get(h)).filter(Boolean));
  const missing = REQUIRED_HEADER_KEYS.filter((k) => !presentKeys.has(k));
  if (missing.length > 0) {
    headerErrors.push(`Missing required columns: ${missing.join(', ')}. Use the downloaded template without renaming columns.`);
  }

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const seenRegNumbers = new Set<string>();
  const results: RowValidationResult[] = [];

  rawRows.forEach((raw, i) => {
    const mapped: Record<string, unknown> = {};
    for (const [header, value] of Object.entries(raw)) {
      const key = headerToKey.get(header);
      if (!key) continue;
      if (typeof value === 'string') {
        mapped[key] = value.trim();
      } else if (key !== 'experienceYears' && typeof value === 'number') {
        // Excel stores plain digit entries (phone, pincode, registration numbers) as
        // numbers unless text-formatted — coerce to string so z.string() doesn't reject
        // a valid row with a confusing "expected string, received number" message.
        mapped[key] = String(value);
      } else {
        mapped[key] = value;
      }
    }
    if (typeof mapped.userType === 'string') mapped.userType = mapped.userType.toUpperCase();

    const parsed = bulkImportRowSchema.safeParse(mapped);
    const errors: string[] = [];
    if (!parsed.success) {
      errors.push(...parsed.error.issues.map((issue) => issue.message));
    } else {
      const email = parsed.data.email.toLowerCase();
      const phone = parsed.data.phone;
      if (seenEmails.has(email)) errors.push(`Duplicate email within file: ${email}`);
      if (seenPhones.has(phone)) errors.push(`Duplicate phone within file: ${phone}`);
      if (parsed.data.userType === 'SCHOOL' && parsed.data.schoolRegistrationNumber) {
        if (seenRegNumbers.has(parsed.data.schoolRegistrationNumber)) {
          errors.push(`Duplicate School Registration Number within file: ${parsed.data.schoolRegistrationNumber}`);
        }
        seenRegNumbers.add(parsed.data.schoolRegistrationNumber);
      }
      seenEmails.add(email);
      seenPhones.add(phone);
    }

    results.push({ rowNumber: i + 2, raw: mapped, valid: errors.length === 0, errors });
  });

  return {
    headerErrors,
    rows: results,
    schoolCount: results.filter((r) => r.raw.userType === 'SCHOOL').length,
    teacherCount: results.filter((r) => r.raw.userType === 'TEACHER').length,
    validCount: results.filter((r) => r.valid).length,
    invalidCount: results.filter((r) => !r.valid).length,
  };
}
