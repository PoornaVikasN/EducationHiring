import { IsEmail, IsEnum, IsNumber, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export enum ImportUserType {
  SCHOOL = 'SCHOOL',
  TEACHER = 'TEACHER',
}

// One row of the unified bulk-import template. SCHOOL rows create a User + a School
// Profile inline. TEACHER rows are standalone accounts — this is a job marketplace, not
// an employment registry, so a teacher is never "linked" to a school at import time; the
// only real teacher<->school relationship anywhere in this system is the Application
// state machine (INTERESTED -> SHORTLISTED -> WON), driven by actual job postings. A
// TEACHER row may optionally note a free-text `currentSchoolName`, unvalidated, purely
// informational (mirrors the existing self-reported `seekerProfile.currentSchool` field
// teachers can already set on their own profile). Column headers in the .xlsx map 1:1 to
// these keys — see template-builder.ts's HEADERS constant for the exact header strings.
export class BulkImportRowDto {
  @IsEnum(ImportUserType, { message: 'User Type must be SCHOOL or TEACHER' })
  userType!: ImportUserType;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @IsEmail({}, { message: 'Invalid email format' })
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(13)
  phone!: string;

  // Required for SCHOOL rows only — the registration number being created for that
  // school. Has no meaning on TEACHER rows (see `currentSchoolName` below instead).
  @ValidateIf((o: BulkImportRowDto) => o.userType === ImportUserType.SCHOOL)
  @IsString()
  @MinLength(1, { message: 'School Registration Number is required for SCHOOL rows' })
  schoolRegistrationNumber?: string;

  @ValidateIf((o: BulkImportRowDto) => o.userType === ImportUserType.SCHOOL)
  @IsString()
  @MinLength(2, { message: 'School Name is required for SCHOOL rows' })
  schoolName?: string;

  @ValidateIf((o: BulkImportRowDto) => o.userType === ImportUserType.SCHOOL)
  @IsString()
  @MinLength(1, { message: 'School Address is required for SCHOOL rows' })
  schoolAddress?: string;

  @ValidateIf((o: BulkImportRowDto) => o.userType === ImportUserType.SCHOOL)
  @IsString()
  @MinLength(1, { message: 'School City is required for SCHOOL rows' })
  schoolCity?: string;

  @ValidateIf((o: BulkImportRowDto) => o.userType === ImportUserType.SCHOOL)
  @IsString()
  @MinLength(1, { message: 'School State is required for SCHOOL rows' })
  schoolState?: string;

  @ValidateIf((o: BulkImportRowDto) => o.userType === ImportUserType.SCHOOL)
  @IsString()
  @MinLength(1, { message: 'School Pincode is required for SCHOOL rows' })
  schoolPincode?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Invalid School Contact Email format' })
  schoolContactEmail?: string;

  @IsOptional()
  @IsString()
  schoolContactPhone?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Experience Years must be a number' })
  experienceYears?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  // TEACHER rows only. Free text, never validated against any school record — the admin
  // (or the imported teacher, later, via their own profile) can put whatever they know,
  // same as the existing self-reported `currentSchool` field.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentSchoolName?: string;
}
