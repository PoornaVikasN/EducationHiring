import { Module } from '@nestjs/common';
import { SystemConfigModule } from '../system-config/system-config.module';
import { SystemHealthModule } from '../system-health/system-health.module';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [SystemConfigModule, SystemHealthModule],
  controllers: [UploadsController],
  providers: [UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
