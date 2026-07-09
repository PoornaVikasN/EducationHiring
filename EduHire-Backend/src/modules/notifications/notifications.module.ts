import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { SystemConfigModule } from '../system-config/system-config.module';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { School, SchoolSchema } from '../schools/schemas/school.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { EmailService } from './email.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [
    ConfigModule,
    SystemConfigModule,
    EmailTemplatesModule,
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: School.name, schema: SchoolSchema },
      { name: User.name, schema: UserSchema },
    ]),
    JwtModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationsController],
  providers: [EmailService, NotificationsGateway, NotificationsService, WhatsAppService],
  exports: [EmailService, NotificationsService],
})
export class NotificationsModule {}
