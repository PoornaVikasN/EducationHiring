import { z } from 'zod';
import { Role } from '../shared/enums';

// User types 10 digits → transformed to +91XXXXXXXXXX for API
const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number')
  .transform((v) => `+91${v}`);

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Enter a valid email address'),
  phone: phoneSchema,
  password: z.string().min(10, 'Password must be at least 10 characters').max(64),
  role: z.enum([Role.TEACHER, Role.RECRUITER], { message: 'Select a role' }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const verifyOtpSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  code: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
