import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Model } from 'mongoose';
import { Role } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SystemConfigService } from '../system-config/system-config.service';
import { Otp, OtpDocument } from '../auth/schemas/otp.schema';
import { School, SchoolDocument } from '../schools/schemas/school.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { UploadKind } from '../uploads/dto/presign.dto';
import { UploadsService } from '../uploads/uploads.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateRecruiterProfileDto } from './dto/update-recruiter-profile.dto';
import { UpdateSeekerProfileDto } from './dto/update-seeker-profile.dto';
import { UpdateUserSettingsDto } from './dto/update-user-settings.dto';
import { User, UserDocument } from './schemas/user.schema';
import { SafeUser, toSafeUser } from '../../shared/utils/safe-user';

const WHATSAPP_OTP_TTL_MS = 5 * 60 * 1000;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Otp.name) private otpModel: Model<OtpDocument>,
    private config: ConfigService,
    private systemConfig: SystemConfigService,
    private uploads: UploadsService,
  ) {}

  async getMe(currentUser: JwtPayload): Promise<SafeUser> {
    const user = await this.userModel
      .findOne({ _id: currentUser.sub, deletedAt: null })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    return toSafeUser(user);
  }

  async updateSeekerProfile(
    currentUser: JwtPayload,
    dto: UpdateSeekerProfileDto,
  ): Promise<UserDocument> {
    if (currentUser.role !== Role.TEACHER) {
      throw new ForbiddenException('Only teachers can update this profile');
    }

    // Verify any S3-backed URL fields actually exist in our bucket with the right
    // content-type/size. Without this, a client can claim someone else's S3 key
    // (or a non-existent one) and we'd silently persist the lie.
    if (dto.resumeUrl) {
      await this.uploads.verifyUploadKey(dto.resumeUrl, UploadKind.RESUME);
    }
    if (dto.certUrls?.length) {
      for (const url of dto.certUrls) {
        await this.uploads.verifyUploadKey(url, UploadKind.DOCUMENT);
      }
    }
    if (dto.introVideoUrl) {
      await this.uploads.verifyUploadKey(dto.introVideoUrl, UploadKind.INTRO_VIDEO);
    }

    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined && key !== 'latitude' && key !== 'longitude') {
        update[`seekerProfile.${key}`] = value;
      }
    }
    if (dto.longitude !== undefined && dto.latitude !== undefined) {
      update['seekerProfile.location'] = {
        type: 'Point',
        coordinates: [dto.longitude, dto.latitude],
      };
    }

    const user = await this.userModel
      .findOneAndUpdate(
        { _id: currentUser.sub, deletedAt: null },
        { $set: update },
        { returnDocument: 'after' },
      )
      .select('-passwordHash')
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateRecruiterProfile(
    currentUser: JwtPayload,
    dto: UpdateRecruiterProfileDto,
  ): Promise<UserDocument> {
    if (currentUser.role !== Role.RECRUITER) {
      throw new ForbiddenException('Only recruiters can update this profile');
    }

    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        update[`recruiterProfile.${key}`] = value;
      }
    }

    const user = await this.userModel
      .findOneAndUpdate(
        { _id: currentUser.sub, deletedAt: null },
        { $set: update },
        { returnDocument: 'after' },
      )
      .select('-passwordHash')
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async changePassword(
    currentUser: JwtPayload,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = await this.userModel
      .findOne({ _id: currentUser.sub, deletedAt: null })
      .exec();
    if (!user) throw new NotFoundException('User not found');
    if (!user.passwordHash) throw new BadRequestException('Password login not set up for this account');

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Current password is incorrect');

    const hash = await bcrypt.hash(dto.newPassword, 12);
    await this.userModel
      .updateOne(
        { _id: user._id },
        { $set: { passwordHash: hash }, $inc: { tokenVersion: 1 } },
      )
      .exec();
    return { message: 'Password updated' };
  }

  async deactivate(currentUser: JwtPayload): Promise<{ message: string }> {
    const now = new Date();
    await this.userModel
      .findOneAndUpdate(
        { _id: currentUser.sub, deletedAt: null },
        { $set: { isActive: false, deletedAt: now } },
      )
      .exec();

    // Cascade soft-delete all jobs belonging to this recruiter's school(s)
    const schoolIds = await this.schoolModel
      .find({ adminUserId: currentUser.sub, deletedAt: null })
      .distinct('_id')
      .exec();
    if (schoolIds.length) {
      await this.jobModel.updateMany(
        { schoolId: { $in: schoolIds }, deletedAt: null },
        { $set: { deletedAt: now } },
      );
    }

    return { message: 'Account deactivated' };
  }

  async savePushSubscription(userId: string, subscription: object): Promise<void> {
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { pushSubscription: JSON.stringify(subscription) } },
    );
  }

  async removePushSubscription(userId: string): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $set: { pushSubscription: null } });
  }

  async updateSettings(userId: string, dto: UpdateUserSettingsDto): Promise<{ message: string }> {
    const update: Record<string, boolean> = {};
    if (dto.alertNewJobs !== undefined) update.alertNewJobs = dto.alertNewJobs;
    await this.userModel.updateOne({ _id: userId, deletedAt: null }, { $set: update }).exec();
    return { message: 'Settings updated' };
  }

  async sendWhatsAppOtp(userId: string): Promise<{ message: string }> {
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) throw new NotFoundException('User not found');
    const num = user.seekerProfile?.whatsappNumber;
    if (!num) throw new BadRequestException('No WhatsApp number on profile');
    if (!/^\+91[6-9]\d{9}$/.test(num)) throw new BadRequestException('Invalid WhatsApp number format');

    const code = String(Math.floor(100_000 + Math.random() * 900_000));
    const phoneHash = crypto.createHash('sha256').update(num).digest('hex');
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + WHATSAPP_OTP_TTL_MS);

    await this.otpModel.findOneAndUpdate(
      { phoneHash },
      { phoneHash, codeHash, attempts: 0, expiresAt },
      { upsert: true, new: true },
    ).exec();

    await this.dispatchWhatsAppSms(num, code);
    return { message: 'OTP sent to your WhatsApp number' };
  }

  async verifyWhatsAppOtp(userId: string, code: string): Promise<{ verified: boolean }> {
    const user = await this.userModel.findById(userId).lean().exec();
    if (!user) throw new NotFoundException('User not found');
    const num = user.seekerProfile?.whatsappNumber;
    if (!num) throw new BadRequestException('No WhatsApp number on profile');

    const phoneHash = crypto.createHash('sha256').update(num).digest('hex');
    const otpDoc = await this.otpModel.findOne({ phoneHash }).exec();
    if (!otpDoc || otpDoc.expiresAt < new Date()) throw new BadRequestException('OTP expired or not found');
    if (otpDoc.attempts >= 5) throw new BadRequestException('Too many attempts');

    const match = await bcrypt.compare(code, otpDoc.codeHash);
    if (!match) {
      await this.otpModel.updateOne({ phoneHash }, { $inc: { attempts: 1 } }).exec();
      throw new BadRequestException('Invalid OTP');
    }

    await this.otpModel.deleteOne({ phoneHash }).exec();
    await this.userModel.updateOne(
      { _id: userId },
      { $set: { 'seekerProfile.whatsappVerified': true } },
    ).exec();

    return { verified: true };
  }

  private async dispatchWhatsAppSms(phone: string, code: string): Promise<void> {
    this.logger.log(`[WhatsApp OTP] ${phone}: ${code}`);
    const authKey = await this.systemConfig.getSecret('MSG91_AUTH_KEY');
    if (!authKey) {
      return;
    }
    const templateId = (await this.systemConfig.getSecret('MSG91_OTP_TEMPLATE_ID')) ?? '';
    const response = await fetch('https://api.msg91.com/api/v5/otp', {
      method: 'POST',
      headers: { authkey: authKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template_id: templateId,
        mobile: phone.replace('+', ''),
        otp: code,
      }),
    });
    if (!response.ok) {
      this.logger.error(`MSG91 WhatsApp OTP failed for ${phone}: ${response.status}`);
    }
  }
}
