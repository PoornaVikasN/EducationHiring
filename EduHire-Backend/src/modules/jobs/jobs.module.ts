import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { School, SchoolSchema } from '../schools/schemas/school.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { AuditModule } from '../audit/audit.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Job, JobSchema } from './schemas/job.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: School.name, schema: SchoolSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Application.name, schema: ApplicationSchema },
    ]),
    AuditModule,
    SystemConfigModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
