import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Response } from 'express';
import { Model } from 'mongoose';
import { Role } from '../../shared/enums';
import { redactEmail, redactPhone } from '../../common/utils/redact';
import { normalizePhoneNumber as normalizePhone } from '../../utils/phone-normalizer';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../notifications/email.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendOtpDto, VerifyOtpDto } from './dto/otp.dto';
import {
  RefreshTokenBlacklist,
  RefreshTokenBlacklistDocument,
} from './schemas/refresh-token-blacklist.schema';
import { Otp, OtpDocument } from './schemas/otp.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

const BCRYPT_ROUNDS = 12;
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const REFRESH_COOKIE = 'refresh_token';

// Request context passed in from the controller — IP + user-agent — so anonymous
// auth events (failed login, OTP lockout) can be audited with enough info to track
// abuse. Optional everywhere; absent ctx just means the audit row lacks IP/UA.
export interface AuthCtx {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    @InjectModel(RefreshTokenBlacklist.name)
    private blacklistModel: Model<RefreshTokenBlacklistDocument>,
    private jwtService: JwtService,
    private config: ConfigService,
    private emailService: EmailService,
    private auditService: AuditService,
  ) {}

  // ── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{ message: string; devOtp?: string }> {
    const phone = normalizePhone(dto.phone);

    const existing = await this.userModel
      .findOne({ $or: [{ email: dto.email.toLowerCase() }, { phone }], deletedAt: null })
      .lean()
      .exec();

    if (existing) {
      const field = existing.email === dto.email.toLowerCase() ? 'Email' : 'Phone';
      throw new ConflictException(`${field} already registered`);
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const userData: Partial<User> = {
      role: dto.role,
      email: dto.email.toLowerCase(),
      phone,
      passwordHash,
      seekerProfile:
        dto.role === Role.TEACHER
          ? {
              fullName: dto.fullName,
              headline: null, bio: null, resumeUrl: null, introVideoUrl: null, city: null, state: null, availability: null,
              experienceYears: null, skills: [], certUrls: [], desiredCities: [],
              age: null, gender: null, maritalStatus: null, degrees: [],
              whatsappNumber: null, whatsappVerified: false, pincode: null, currentSchool: null, employmentType: null,
              expertise: [], academics: null, salaryRange: null,
              availableTimings: [], interestedToCover: [], indemnityInsurance: null,
              isRegisteredWithBoard: null, boardRegistrationName: null,
            }
          : null,
      recruiterProfile:
        dto.role === Role.RECRUITER
          ? { fullName: dto.fullName, schoolId: null }
          : null,
    };

    let user: UserDocument;
    try {
      user = await this.userModel.create(userData);
    } catch (err: unknown) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('Email or phone already registered');
      }
      throw err;
    }

    // Generate OTP and send a single combined welcome + verification email
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const keyHash = this.hashValue(dto.email.toLowerCase().trim());
    const codeHash = this.hashValue(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.log(`[DEV] Registration OTP for ${dto.email}: ${code}`);
    }
    await this.otpModel.findOneAndUpdate(
      { phoneHash: keyHash },
      { $set: { codeHash, attempts: 0, expiresAt } },
      { upsert: true },
    );
    await this.emailService.sendRegistrationOtpEmail(user.email!, dto.fullName, code).catch((err: unknown) => {
      this.logger.warn(`Registration OTP email failed for ${user._id.toString()}: ${String(err)}`);
    });

    const isDev = this.config.get('NODE_ENV') !== 'production';
    return { message: 'Registration successful. Please verify your email.', ...(isDev && { devOtp: code }) };
  }

  // ── Login ───────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    res: Response,
    ctx: AuthCtx = {},
  ): Promise<{ accessToken: string; user: SafeUser }> {
    const masked = redactEmail(dto.email);
    const user = await this.userModel
      .findOne({ email: dto.email.toLowerCase(), deletedAt: null })
      .exec();

    if (!user) {
      this.auditService.logAuthEvent('AUTH_FAILED', masked, 'user_not_found', ctx.ip, ctx.userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.passwordHash) {
      this.auditService.logAuthEvent('AUTH_FAILED', masked, 'password_login_not_set', ctx.ip, ctx.userAgent);
      throw new UnauthorizedException('This account uses Google sign-in. Please use the "Continue with Google" button below.');
    }

    if (!user.isActive) {
      this.auditService.logAuthEvent('AUTH_FAILED', masked, 'account_disabled', ctx.ip, ctx.userAgent);
      throw new UnauthorizedException('Account is disabled');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.auditService.logAuthEvent('AUTH_FAILED', masked, 'invalid_password', ctx.ip, ctx.userAgent);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.auditService.logAuthEvent('LOGIN_SUCCESS', masked, 'password_login', ctx.ip, ctx.userAgent);

    return this.issueTokens(user, res);
  }

  // ── Google OAuth ─────────────────────────────────────────────────────────────

  async googleAuth(dto: GoogleAuthDto, res: Response): Promise<{ accessToken: string; user: SafeUser; isLinked: boolean }> {
    const googleUser = await this.fetchGoogleUserInfo(dto.accessToken);

    let user = await this.userModel
      .findOne({
        $or: [{ googleId: googleUser.id }, { email: googleUser.email }],
        deletedAt: null,
      })
      .exec();

    let isLinked = false;

    if (!user) {
      user = await this.userModel.create({
        role: dto.role,
        email: googleUser.email,
        googleId: googleUser.id,
        emailVerified: true,
        passwordHash: null,
        seekerProfile:
          dto.role === Role.TEACHER
            ? { fullName: googleUser.name, skills: [], certUrls: [], desiredCities: [], headline: null, bio: null, resumeUrl: null, city: null, state: null, availability: null, experienceYears: null }
            : null,
        recruiterProfile:
          dto.role === Role.RECRUITER
            ? { fullName: googleUser.name, schoolId: null }
            : null,
      });
    } else if (!user.googleId) {
      // Existing account (admin-created or email+password) — link Google ID to it
      isLinked = true;
      await this.userModel.findByIdAndUpdate(user._id, {
        $set: { googleId: googleUser.id, emailVerified: true },
      }).exec();
      user.googleId = googleUser.id;
      user.emailVerified = true;
    }

    if (!user.isActive) throw new UnauthorizedException('Account is disabled');

    const result = await this.issueTokens(user, res);
    return { ...result, isLinked };
  }

  // ── OTP ─────────────────────────────────────────────────────────────────────
  // OTP is keyed by SHA-256(email) stored in the `phoneHash` field.
  // The same code is dispatched to the user's email AND phone (SMS) when available.

  async sendOtp(dto: SendOtpDto): Promise<{ message: string; devOtp?: string }> {
    const email = dto.email.toLowerCase().trim();
    const keyHash = this.hashValue(email);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = this.hashValue(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);
    if (this.config.get('NODE_ENV') !== 'production') {
      this.logger.log(`[DEV] OTP for ${email}: ${code}`);
    }

    // Upsert OTP record
    await this.otpModel.findOneAndUpdate(
      { phoneHash: keyHash },
      { $set: { codeHash, attempts: 0, expiresAt } },
      { upsert: true },
    );

    // Send via email (primary)
    await this.emailService.sendOtpEmail(email, code).catch((err: unknown) => {
      this.logger.warn(`OTP email failed for ${redactEmail(email)}: ${String(err)}`);
    });

    // Send via SMS (secondary — if user has phone and MSG91 is configured)
    const user = await this.userModel.findOne({ email, deletedAt: null }).lean().exec();
    if (user?.phone) {
      await this.dispatchSms(user.phone, code).catch((err: unknown) => {
        this.logger.warn(`OTP SMS failed for ${redactPhone(user.phone)}: ${String(err)}`);
      });
    }

    const isDev = this.config.get('NODE_ENV') !== 'production';
    return { message: 'OTP sent', ...(isDev && { devOtp: code }) };
  }

  async verifyOtp(
    dto: VerifyOtpDto,
    res: Response,
    ctx: AuthCtx = {},
  ): Promise<{ accessToken: string; user: SafeUser }> {
    const email = dto.email.toLowerCase().trim();
    const masked = redactEmail(email);
    const keyHash = this.hashValue(email);

    const otpDoc = await this.otpModel.findOne({ phoneHash: keyHash }).exec();
    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      this.auditService.logAuthEvent('OTP_FAILED', masked, 'otp_expired_or_missing', ctx.ip, ctx.userAgent);
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }
    if (otpDoc.attempts >= OTP_MAX_ATTEMPTS) {
      await this.otpModel.deleteOne({ phoneHash: keyHash });
      this.auditService.logAuthEvent('OTP_LOCKED', masked, 'max_attempts_exceeded', ctx.ip, ctx.userAgent);
      throw new BadRequestException('Too many attempts. Please request a new OTP.');
    }

    const codeHash = this.hashValue(dto.code);
    if (codeHash !== otpDoc.codeHash) {
      await this.otpModel.updateOne({ phoneHash: keyHash }, { $inc: { attempts: 1 } });
      this.auditService.logAuthEvent('OTP_FAILED', masked, 'invalid_code', ctx.ip, ctx.userAgent);
      throw new BadRequestException('Invalid OTP');
    }

    await this.otpModel.deleteOne({ phoneHash: keyHash });

    const user = await this.userModel.findOne({ email, deletedAt: null }).exec();
    if (!user) throw new NotFoundException('No account found for this email');

    const verifiedFields: Record<string, boolean> = { emailVerified: true };
    if (user.phone) verifiedFields['phoneVerified'] = true;
    await this.userModel.findByIdAndUpdate(user._id, { $set: verifiedFields }).exec();
    user.emailVerified = true;
    if (user.phone) user.phoneVerified = true;

    // Fire-and-forget onboarding email
    this.emailService.sendOnboardingEmail(user.email!, user.seekerProfile?.fullName ?? user.recruiterProfile?.fullName ?? 'there', user.role).catch((err: unknown) => {
      this.logger.warn(`Onboarding email failed for ${user._id.toString()}: ${String(err)}`);
    });

    return this.issueTokens(user, res);
  }

  // ── Refresh ──────────────────────────────────────────────────────────────────

  async refresh(refreshToken: string, res: Response): Promise<{ accessToken: string }> {
    let payload: { sub: string; jti: string; exp: number };
    try {
      payload = this.jwtService.verify<{ sub: string; jti: string; exp: number }>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const tokenHash = this.hashValue(refreshToken);
    const blacklisted = await this.blacklistModel.findOne({ tokenHash }).lean().exec();
    if (blacklisted) throw new UnauthorizedException('Refresh token has been revoked');

    const user = await this.userModel.findById(payload.sub).exec();
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Account not found or disabled');
    }

    await this.blacklistToken(refreshToken, payload.exp);

    return this.issueTokens(user, res);
  }

  // ── Logout ───────────────────────────────────────────────────────────────────

  async logout(refreshToken: string | undefined, res: Response): Promise<{ message: string }> {
    if (refreshToken) {
      try {
        const payload = this.jwtService.verify<{ exp: number }>(refreshToken, {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        });
        await this.blacklistToken(refreshToken, payload.exp);
      } catch {
        // Token already expired — nothing to blacklist
      }
    }
    res.clearCookie(REFRESH_COOKIE, { path: '/', domain: this.cookieDomain() });
    return { message: 'Logged out' };
  }

  // ── Forgot / Reset Password (OTP-based) ─────────────────────────────────────
  // OTP is keyed by SHA-256('reset:' + email) to avoid colliding with sign-up OTPs.

  async forgotPassword(email: string): Promise<{ message: string }> {
    const genericMsg = { message: 'If an account exists for this email, a reset code has been sent.' };
    const normalised = email.toLowerCase().trim();
    const user = await this.userModel.findOne({ email: normalised, deletedAt: null }).lean().exec();
    if (!user || !user.email) return genericMsg;

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const keyHash = this.hashValue('reset:' + normalised);
    const codeHash = this.hashValue(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await this.otpModel.findOneAndUpdate(
      { phoneHash: keyHash },
      { $set: { codeHash, attempts: 0, expiresAt } },
      { upsert: true },
    );

    await this.emailService.sendPasswordResetOtpEmail(user.email, code).catch((err: unknown) => {
      this.logger.warn(`Password reset OTP email failed for ${user._id}: ${String(err)}`);
    });

    return genericMsg;
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<{ message: string }> {
    if (!newPassword || newPassword.length < 10) {
      throw new BadRequestException('Password must be at least 10 characters.');
    }

    const normalised = email.toLowerCase().trim();
    const keyHash = this.hashValue('reset:' + normalised);
    const otpDoc = await this.otpModel.findOne({ phoneHash: keyHash }).exec();

    if (!otpDoc || otpDoc.expiresAt < new Date()) {
      throw new BadRequestException('Code expired. Please request a new one.');
    }
    if (otpDoc.attempts >= OTP_MAX_ATTEMPTS) {
      await this.otpModel.deleteOne({ phoneHash: keyHash });
      throw new BadRequestException('Too many attempts. Please request a new code.');
    }

    const codeHash = this.hashValue(otp);
    if (codeHash !== otpDoc.codeHash) {
      await this.otpModel.updateOne({ phoneHash: keyHash }, { $inc: { attempts: 1 } });
      throw new BadRequestException('Invalid code. Please try again.');
    }

    await this.otpModel.deleteOne({ phoneHash: keyHash });

    const user = await this.userModel.findOne({ email: normalised, deletedAt: null }).exec();
    if (!user) throw new NotFoundException('Account not found.');

    const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.userModel
      .findByIdAndUpdate(user._id, {
        $set: { passwordHash: newHash },
        $inc: { tokenVersion: 1 },
      })
      .exec();

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────

  private async issueTokens(
    user: UserDocument,
    res: Response,
  ): Promise<{ accessToken: string; user: SafeUser }> {
    const payload = {
      sub: user._id.toString(),
      role: user.role,
      email: user.email ?? '',
      tv: user.tokenVersion ?? 0,
    };

    const accessToken = this.jwtService.sign(payload);

    const refreshToken = this.jwtService.sign(
      { sub: user._id.toString(), jti: crypto.randomUUID() },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: '7d',
      },
    );

    // Clear any legacy cookie that was set with a restricted path
    res.clearCookie(REFRESH_COOKIE, { path: '/api/auth/refresh', domain: this.cookieDomain() });
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      secure: this.config.get('NODE_ENV') === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
      domain: this.cookieDomain(),
    });

    return { accessToken, user: toSafeUser(user) };
  }

  // COOKIE_DOMAIN must stay unset in dev so the cookie defaults to the request host
  // (see ProjectDocuments/BUG_PATTERNS.md BE-15).
  private cookieDomain(): string | undefined {
    return this.config.get<string>('COOKIE_DOMAIN') || undefined;
  }

  private async blacklistToken(token: string, expUnix: number): Promise<void> {
    const tokenHash = this.hashValue(token);
    const expiresAt = new Date(expUnix * 1000);
    if (expiresAt > new Date()) {
      await this.blacklistModel.create({ tokenHash, expiresAt });
    }
  }

  private hashValue(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private async fetchGoogleUserInfo(
    accessToken: string,
  ): Promise<{ id: string; email: string; name: string }> {
    const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) throw new UnauthorizedException('Invalid Google access token');
    const data = (await res.json()) as { id: string; email: string; name: string };
    return data;
  }

  private async dispatchSms(phone: string, code: string): Promise<void> {
    const authKey = this.config.get<string>('MSG91_AUTH_KEY');
    if (!authKey) {
      this.logger.warn(`[DEV] SMS OTP for ${phone}: ${code}`);
      return;
    }
    const response = await fetch('https://control.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: { authkey: authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: this.config.get<string>('MSG91_OTP_TEMPLATE_ID', ''),
        mobile: phone.replace('+', ''),
        otp: code,
      }),
    });
    if (!response.ok) {
      this.logger.error(`MSG91 SMS failed for ${phone}: ${response.status}`);
    }
  }
}

// ── Safe user shape (no passwordHash, no sensitive fields) ───────────────────

export interface SafeUser {
  id: string;
  role: Role;
  email?: string;
  phone?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  seekerProfile: unknown;
  recruiterProfile: unknown;
  alertNewJobs: boolean;
}

function toSafeUser(user: UserDocument): SafeUser {
  return {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    phone: user.phone,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    seekerProfile: user.seekerProfile,
    recruiterProfile: user.recruiterProfile,
    alertNewJobs: user.alertNewJobs,
  };
}
