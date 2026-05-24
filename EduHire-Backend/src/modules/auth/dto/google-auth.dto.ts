import { IsEnum, IsString } from 'class-validator';
import { Role } from '../../../shared/enums';

export class GoogleAuthDto {
  @IsString()
  accessToken!: string;

  @IsEnum([Role.JOB_SEEKER, Role.RECRUITER], { message: 'Role must be JOB_SEEKER or RECRUITER' })
  role!: Role.JOB_SEEKER | Role.RECRUITER;
}
