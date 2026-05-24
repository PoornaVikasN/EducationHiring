import {
  IsEmail,
  IsEnum,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../../shared/enums';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @Matches(/^\+91[6-9]\d{9}$/, { message: 'Phone must be a valid Indian mobile number (+91XXXXXXXXXX)' })
  phone!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(64)
  password!: string;

  @IsEnum([Role.JOB_SEEKER, Role.RECRUITER], { message: 'Role must be JOB_SEEKER or RECRUITER' })
  role!: Role.JOB_SEEKER | Role.RECRUITER;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;
}
