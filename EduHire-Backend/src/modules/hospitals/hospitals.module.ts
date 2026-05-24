import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../users/schemas/user.schema';
import { HospitalsController } from './hospitals.controller';
import { HospitalsService } from './hospitals.service';
import { Hospital, HospitalSchema } from './schemas/hospital.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Hospital.name, schema: HospitalSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [HospitalsController],
  providers: [HospitalsService],
  exports: [HospitalsService, MongooseModule],
})
export class HospitalsModule {}
