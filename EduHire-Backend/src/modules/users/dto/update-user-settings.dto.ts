import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsBoolean()
  alertSosJobs?: boolean;

  @IsOptional()
  @IsBoolean()
  alertFtJobs?: boolean;
}
