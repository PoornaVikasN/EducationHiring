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
import { JobDepartment, Subject, TeacherPost } from '../../../shared/enums';

export class CreateJobDto {
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

  @IsEnum(JobDepartment)
  department!: JobDepartment;

  @IsEnum(TeacherPost)
  role!: TeacherPost;

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
  @IsEnum(JobDepartment, { each: true })
  departmentRequirements?: JobDepartment[];

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
  @IsEnum(Subject, { each: true })
  specializations?: Subject[];

  @IsOptional()
  @IsString()
  requiredDegree?: string;
}
