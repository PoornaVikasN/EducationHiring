import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Otp, OtpSchema } from '../auth/schemas/otp.schema';
import { Hospital, HospitalSchema } from '../hospitals/schemas/hospital.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { SystemConfigModule } from '../system-config/system-config.module';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    ConfigModule,
    SystemConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Hospital.name, schema: HospitalSchema },
      { name: Job.name, schema: JobSchema },
      { name: Otp.name, schema: OtpSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
