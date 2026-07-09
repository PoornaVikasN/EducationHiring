import { IsEnum, IsString } from 'class-validator';
import { Role } from '../../../shared/enums';

export class GoogleAuthDto {
  @IsString()
  accessToken!: string;

  @IsEnum([Role.TEACHER, Role.RECRUITER], { message: 'Role must be TEACHER or RECRUITER' })
  role!: Role.TEACHER | Role.RECRUITER;
}
