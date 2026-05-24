import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { Hospital, HospitalSchema } from '../hospitals/schemas/hospital.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { AuditModule } from '../audit/audit.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Job, JobSchema } from './schemas/job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: Hospital.name, schema: HospitalSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Application.name, schema: ApplicationSchema },
    ]),
    AuditModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
