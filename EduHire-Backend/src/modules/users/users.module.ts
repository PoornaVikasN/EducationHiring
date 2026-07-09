import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Otp, OtpSchema } from '../auth/schemas/otp.schema';
import { School, SchoolSchema } from '../schools/schemas/school.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { SystemConfigModule } from '../system-config/system-config.module';
import { UploadsModule } from '../uploads/uploads.module';
import { User, UserSchema } from './schemas/user.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [
    ConfigModule,
    SystemConfigModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: Job.name, schema: JobSchema },
      { name: Otp.name, schema: OtpSchema },
    ]),
    UploadsModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, MongooseModule],
})
export class UsersModule {}
