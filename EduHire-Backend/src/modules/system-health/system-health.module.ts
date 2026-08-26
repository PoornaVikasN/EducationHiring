import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SystemHealthFlag, SystemHealthFlagSchema } from './schemas/system-health-flag.schema';
import { SystemHealthService } from './system-health.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: SystemHealthFlag.name, schema: SystemHealthFlagSchema }])],
  providers: [SystemHealthService],
  exports: [SystemHealthService],
})
export class SystemHealthModule {}
