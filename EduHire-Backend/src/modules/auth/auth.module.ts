import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ActivationToken, ActivationTokenSchema } from '../admin/bulk-import/schemas/activation-token.schema';
import { RecaptchaService } from '../../common/recaptcha/recaptcha.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Otp, OtpSchema } from './schemas/otp.schema';
import {
  RefreshTokenBlacklist,
  RefreshTokenBlacklistSchema,
} from './schemas/refresh-token-blacklist.schema';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Otp.name, schema: OtpSchema },
      { name: RefreshTokenBlacklist.name, schema: RefreshTokenBlacklistSchema },
      { name: ActivationToken.name, schema: ActivationTokenSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
    NotificationsModule,
    AuditModule,
    SystemConfigModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, RecaptchaService],
  exports: [AuthService],
})
export class AuthModule {}
