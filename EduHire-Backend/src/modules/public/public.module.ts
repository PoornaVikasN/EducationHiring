import { Module } from '@nestjs/common';
import { SystemConfigModule } from '../system-config/system-config.module';
import { PublicController } from './public.controller';

@Module({
  imports: [SystemConfigModule],
  controllers: [PublicController],
})
export class PublicModule {}
