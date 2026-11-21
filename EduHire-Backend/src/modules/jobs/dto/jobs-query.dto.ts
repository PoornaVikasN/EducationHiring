import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { JobStatus, Subject } from '../../../shared/enums';

export class JobsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  @Type(() => Number)
  limit: number = 20;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  expertise?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  // Admin > Jobs filters. A job matches when it lists at least one of the subjects.
  // A single selected value arrives as a plain string (Express 5 query parser), so wrap it.
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === '' ? undefined : Array.isArray(value) ? value : [value]))
  @IsEnum(Subject, { each: true })
  subjects?: Subject[];

  // Years-of-experience window the admin is looking for; matches jobs whose
  // [experienceMin, experienceMax] range overlaps it.
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  experienceFrom?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50)
  @Type(() => Number)
  experienceTo?: number;
}
