import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BulkImportModule } from '../modules/admin/bulk-import/bulk-import.module';
import { ApplicationsModule } from '../modules/applications/applications.module';
import { Otp, OtpSchema } from '../modules/auth/schemas/otp.schema';
import { JobsModule } from '../modules/jobs/jobs.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { BulkImportEmailSweepService } from './bulk-import-email-sweep.service';
import { JobLifecycleService } from './job-lifecycle.service';
import { OtpCleanupService } from './otp-cleanup.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Otp.name, schema: OtpSchema }]),
    JobsModule,
    ApplicationsModule,
    PaymentsModule,
    BulkImportModule,
  ],
  providers: [OtpCleanupService, JobLifecycleService, BulkImportEmailSweepService],
})
export class SchedulerModule {}
