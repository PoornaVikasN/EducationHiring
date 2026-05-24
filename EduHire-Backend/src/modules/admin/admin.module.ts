import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hospital, HospitalSchema } from '../hospitals/schemas/hospital.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { Payment, PaymentSchema } from '../payments/schemas/payment.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { AuditModule } from '../audit/audit.module';
import { SystemConfigModule } from '../system-config/system-config.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Hospital.name, schema: HospitalSchema },
      { name: Job.name, schema: JobSchema },
      { name: Payment.name, schema: PaymentSchema },
    ]),
    SystemConfigModule,
    AuditModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
