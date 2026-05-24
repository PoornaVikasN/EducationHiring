import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ApplicationsModule } from '../modules/applications/applications.module';
import { Otp, OtpSchema } from '../modules/auth/schemas/otp.schema';
import { JobsModule } from '../modules/jobs/jobs.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { JobLifecycleService } from './job-lifecycle.service';
import { OtpCleanupService } from './otp-cleanup.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Otp.name, schema: OtpSchema }]),
    JobsModule,
    ApplicationsModule,
    PaymentsModule,
  ],
  providers: [OtpCleanupService, JobLifecycleService],
})
export class SchedulerModule {}
