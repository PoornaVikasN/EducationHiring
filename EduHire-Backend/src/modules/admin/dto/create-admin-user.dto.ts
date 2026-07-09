import { IsEmail, IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { Role } from '../../../shared/enums';

export class CreateAdminUserDto {
  @IsEnum([Role.TEACHER, Role.RECRUITER, Role.ADMIN], { message: 'Role must be TEACHER, RECRUITER, or ADMIN' })
  role!: Role.TEACHER | Role.RECRUITER | Role.ADMIN;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(10)
  @MaxLength(13)
  phone!: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @IsString()
  @MinLength(10)
  @MaxLength(64)
  password!: string;
}
