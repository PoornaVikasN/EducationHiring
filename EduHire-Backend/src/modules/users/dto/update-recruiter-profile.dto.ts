import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRecruiterProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;
}
