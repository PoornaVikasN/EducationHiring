import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Academics, Availability, AvailableTimings, MaritalStatus, SalaryRange, TypeOfPractice } from '../../../shared/enums';

export class UpdateSeekerProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsUrl()
  resumeUrl?: string;

  @IsOptional()
  @IsUrl()
  introVideoUrl?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  certUrls?: string[];

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsEnum(Availability)
  availability?: Availability;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  desiredCities?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @IsOptional()
  @IsInt()
  @Min(18)
  @Max(80)
  age?: number;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  degrees?: string[];

  @IsOptional()
  @Matches(/^\+91[6-9]\d{9}$/, { message: 'WhatsApp must be a valid Indian mobile number' })
  whatsappNumber?: string;

  @IsOptional()
  @Matches(/^\d{6}$/, { message: 'Pincode must be 6 digits' })
  pincode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentSchool?: string;

  @IsOptional()
  @IsEnum(TypeOfPractice)
  employmentType?: TypeOfPractice;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  expertise?: string[];

  @IsOptional()
  @IsEnum(Academics)
  academics?: Academics;

  @IsOptional()
  @IsEnum(SalaryRange)
  salaryRange?: SalaryRange;

  @IsOptional()
  @IsArray()
  @IsEnum(AvailableTimings, { each: true })
  availableTimings?: AvailableTimings[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interestedToCover?: string[];

  @IsOptional()
  @IsBoolean()
  indemnityInsurance?: boolean;

  @IsOptional()
  @IsBoolean()
  isRegisteredWithBoard?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  boardRegistrationName?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}
