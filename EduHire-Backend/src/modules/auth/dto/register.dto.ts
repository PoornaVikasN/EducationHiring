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

  @IsEnum([Role.TEACHER, Role.RECRUITER], { message: 'Role must be TEACHER or RECRUITER' })
  role!: Role.TEACHER | Role.RECRUITER;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;
}
