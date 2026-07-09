import { Type } from 'class-transformer';
import { IsArray, IsOptional, IsString, ValidateNested } from 'class-validator';

class LegalSectionDto {
  @IsString()
  heading!: string;

  @IsString()
  body!: string;
}

export class UpdateLegalPageDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  lastUpdatedLabel?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LegalSectionDto)
  sections?: LegalSectionDto[];
}
