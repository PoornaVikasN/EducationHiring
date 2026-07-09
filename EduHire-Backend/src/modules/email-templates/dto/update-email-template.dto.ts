import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';

class ChannelsDto {
  @IsBoolean()
  @IsOptional()
  seekerEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  seekerInApp?: boolean;

  @IsBoolean()
  @IsOptional()
  recruiterEmail?: boolean;

  @IsBoolean()
  @IsOptional()
  recruiterInApp?: boolean;
}

export class UpdateEmailTemplateDto {
  @IsString()
  @IsOptional()
  subject?: string;

  @IsString()
  @IsOptional()
  body?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @ValidateNested()
  @Type(() => ChannelsDto)
  @IsOptional()
  channels?: ChannelsDto;

  @IsString()
  @IsOptional()
  inAppSeekerTitle?: string | null;

  @IsString()
  @IsOptional()
  inAppSeekerBody?: string | null;

  @IsString()
  @IsOptional()
  inAppRecruiterTitle?: string | null;

  @IsString()
  @IsOptional()
  inAppRecruiterBody?: string | null;
}
