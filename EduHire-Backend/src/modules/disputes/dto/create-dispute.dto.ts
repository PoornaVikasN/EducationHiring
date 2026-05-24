import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DisputeKind } from '../schemas/dispute.schema';

export class CreateDisputeDto {
  @IsEnum(DisputeKind)
  kind!: DisputeKind;

  @IsString()
  @MinLength(5)
  @MaxLength(200)
  subject!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsString()
  referenceId?: string;
}
