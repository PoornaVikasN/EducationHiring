import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveDisputeDto {
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  adminNote!: string;
}
