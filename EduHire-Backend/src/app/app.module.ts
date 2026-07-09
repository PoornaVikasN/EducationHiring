import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { loggerConfig } from '../config/logger.config';
import { envValidationSchema } from '../config/env.validation';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminModule } from '../modules/admin/admin.module';
import { AuditModule } from '../modules/audit/audit.module';
import { SystemConfigModule } from '../modules/system-config/system-config.module';
import { DisputesModule } from '../modules/disputes/disputes.module';
import { PublicModule } from '../modules/public/public.module';
import { ApplicationsModule } from '../modules/applications/applications.module';
import { AuthModule } from '../modules/auth/auth.module';
import { SchoolsModule } from '../modules/schools/schools.module';
import { JobsModule } from '../modules/jobs/jobs.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { SubscriptionsModule } from '../modules/subscriptions/subscriptions.module';
import { UploadsModule } from '../modules/uploads/uploads.module';
import { User, UserSchema } from '../modules/users/schemas/user.schema';
import { UsersModule } from '../modules/users/users.module';
import { ChatModule } from '../modules/chat/chat.module';
import { SchedulerModule } from '../scheduler/scheduler.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

function buildMongoUri(): string {
  const username = process.env.MONGO_DB_USERNAME;
  const password = process.env.MONGO_DB_PASSWORD;
  const host = process.env.MONGO_DB_HOST;
  const name = process.env.MONGO_DB_NAME ?? 'eduhire';

  if (!username || !password || !host) {
    return `mongodb://localhost:27017/${name}`;
  }

  return `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}@${host}/${name}?retryWrites=true&w=majority`;
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false, allowUnknown: true },
    }),
    LoggerModule.forRoot(loggerConfig),
    MongooseModule.forRoot(buildMongoUri()),
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    // Feature modules
    AuthModule,
    UsersModule,
    SchoolsModule,
    JobsModule,
    ApplicationsModule,
    PaymentsModule,
    SubscriptionsModule,
    NotificationsModule,
    UploadsModule,
    AdminModule,
    AuditModule,
    SystemConfigModule,
    DisputesModule,
    PublicModule,
    ChatModule,
    // Scheduler (cron jobs)
    SchedulerModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
