import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Otp, OtpDocument } from '../modules/auth/schemas/otp.schema';

@Injectable()
export class OtpCleanupService {
  private readonly logger = new Logger(OtpCleanupService.name);

  constructor(@InjectModel(Otp.name) private otpModel: Model<OtpDocument>) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanExpiredOtps(): Promise<void> {
    const result = await this.otpModel
      .deleteMany({ expiresAt: { $lte: new Date() } })
      .exec();
    if (result.deletedCount > 0) {
      this.logger.log(`OTP cleanup: removed ${result.deletedCount} expired docs`);
    }
  }
}
