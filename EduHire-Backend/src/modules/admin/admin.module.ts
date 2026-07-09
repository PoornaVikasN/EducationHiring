import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { School, SchoolSchema } from '../schools/schemas/school.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { Application, ApplicationSchema } from '../applications/schemas/application.schema';
import { Subscription, SubscriptionSchema } from '../subscriptions/schemas/subscription.schema';
import { AuditModule } from '../audit/audit.module';
import { EmailTemplatesModule } from '../email-templates/email-templates.module';
import { LegalContentModule } from '../legal-content/legal-content.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: Job.name, schema: JobSchema },
      { name: Payment.name, schema: PaymentSchema },
      { name: Application.name, schema: ApplicationSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    SystemConfigModule,
    AuditModule,
    EmailTemplatesModule,
    LegalContentModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
