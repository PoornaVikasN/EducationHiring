import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JobType } from '../../../shared/enums';

export class CreateJobDto {
  @IsEnum(JobType)
  type!: JobType;

  @IsString()
  @MinLength(5)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requirements?: string[];

  @IsString()
  city!: string;

  @IsString()
  state!: string;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsString()
  department!: string;

  @IsString()
  role!: string;

  @IsNumber()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  experienceMin!: number;

  @IsNumber()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  experienceMax!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salaryMin!: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  salaryMax!: number;

  @IsOptional()
  @IsString()
  jobTimingStart?: string;

  @IsOptional()
  @IsString()
  jobTimingEnd?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  noOfCasesPerMonth?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  departmentRequirements?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  openPositions?: number;

  @IsOptional()
  @IsUrl()
  jobDocumentUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @IsOptional()
  @IsString()
  requiredDegree?: string;
}
