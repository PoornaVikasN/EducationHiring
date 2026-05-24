import { IsOptional, IsString, MaxLength } from 'class-validator';

export class ShowInterestDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  coverNote?: string;
}

export class DecisionDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}
