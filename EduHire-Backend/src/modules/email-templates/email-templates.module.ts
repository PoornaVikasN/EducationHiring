import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../audit/audit.module';
import { EmailTemplatesService } from './email-templates.service';
import { EmailTemplate, EmailTemplateSchema } from './schemas/email-template.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EmailTemplate.name, schema: EmailTemplateSchema }]),
    AuditModule,
  ],
  providers: [EmailTemplatesService],
  exports: [EmailTemplatesService],
})
export class EmailTemplatesModule {}
