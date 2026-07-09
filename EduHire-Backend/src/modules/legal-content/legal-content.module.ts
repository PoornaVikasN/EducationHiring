import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { LegalPage, LegalPageSchema } from './schemas/legal-page.schema';
import { LegalContentService } from './legal-content.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: LegalPage.name, schema: LegalPageSchema }]),
    AuditModule,
  ],
  providers: [LegalContentService],
  exports: [LegalContentService],
})
export class LegalContentModule {}
