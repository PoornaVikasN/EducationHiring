import { IsEnum, IsInt, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum UploadKind {
  RESUME = 'resume',
  LOGO = 'logo',
  CERTIFICATE = 'certificate',
  DOCUMENT = 'document',
}

const MIME_ALLOWLIST: Record<UploadKind, string[]> = {
  [UploadKind.RESUME]: ['application/pdf'],
  [UploadKind.LOGO]: ['image/jpeg', 'image/png', 'image/webp'],
  [UploadKind.CERTIFICATE]: ['application/pdf'],
  [UploadKind.DOCUMENT]: ['application/pdf', 'image/jpeg', 'image/png'],
};

const SIZE_LIMITS: Record<UploadKind, number> = {
  [UploadKind.RESUME]: 5 * 1024 * 1024,
  [UploadKind.LOGO]: 2 * 1024 * 1024,
  [UploadKind.CERTIFICATE]: 5 * 1024 * 1024,
  [UploadKind.DOCUMENT]: 5 * 1024 * 1024,
};

export { MIME_ALLOWLIST, SIZE_LIMITS };

export class PresignDto {
  @IsEnum(UploadKind)
  kind!: UploadKind;

  @IsString()
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(5 * 1024 * 1024) // max 5MB cap at DTO level
  @Type(() => Number)
  size!: number;
}
