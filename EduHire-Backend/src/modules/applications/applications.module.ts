import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hospital, HospitalSchema } from '../hospitals/schemas/hospital.schema';
import { Job, JobSchema } from '../jobs/schemas/job.schema';
import { User, UserSchema } from '../users/schemas/user.schema';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application, ApplicationSchema } from './schemas/application.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      { name: Job.name, schema: JobSchema },
      { name: Hospital.name, schema: HospitalSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
