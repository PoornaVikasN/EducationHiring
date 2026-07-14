import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuditModule } from '../../audit/audit.module';
import { NotificationsModule } from '../../notifications/notifications.module';
import { School, SchoolSchema } from '../../schools/schemas/school.schema';
import { SystemConfigModule } from '../../system-config/system-config.module';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { BulkImportController } from './bulk-import.controller';
import { BulkImportService } from './bulk-import.service';
import { ActivationToken, ActivationTokenSchema } from './schemas/activation-token.schema';
import { ImportBatch, ImportBatchSchema } from './schemas/import-batch.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: School.name, schema: SchoolSchema },
      { name: ImportBatch.name, schema: ImportBatchSchema },
      { name: ActivationToken.name, schema: ActivationTokenSchema },
    ]),
    SystemConfigModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [BulkImportController],
  providers: [BulkImportService],
})
export class BulkImportModule {}
