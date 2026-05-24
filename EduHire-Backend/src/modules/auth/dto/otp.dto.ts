import { IsEmail, IsString, Length, Matches } from 'class-validator';

export class SendOtpDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string;
}

export class VerifyOtpDto {
  @IsEmail({}, { message: 'Enter a valid email address' })
  email!: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must be numeric' })
  code!: string;
}
