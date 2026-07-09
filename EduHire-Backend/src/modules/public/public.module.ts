import { Module } from '@nestjs/common';
import { SystemConfigModule } from '../system-config/system-config.module';
import { LegalContentModule } from '../legal-content/legal-content.module';
import { PublicController } from './public.controller';

@Module({
  imports: [SystemConfigModule, LegalContentModule],
  controllers: [PublicController],
})
export class PublicModule {}
