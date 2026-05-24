import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { SystemConfig, SystemConfigSchema } from './schemas/system-config.schema';
import { SystemConfigService } from './system-config.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: SystemConfig.name, schema: SystemConfigSchema }]),
    AuditModule,
  ],
  providers: [SystemConfigService],
  exports: [SystemConfigService],
})
export class SystemConfigModule {}
