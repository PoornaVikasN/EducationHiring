import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ImportBatchStatus = 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';

@Schema({ _id: false })
class FailedImportRow {
  @Prop({ type: Number, required: true })
  rowNumber!: number;

  @Prop({ type: Object, required: true })
  data!: Record<string, unknown>;

  @Prop({ type: String, required: true })
  errorReason!: string;
}

const FailedImportRowSchema = SchemaFactory.createForClass(FailedImportRow);

export type ImportBatchDocument = HydratedDocument<ImportBatch>;

@Schema({ timestamps: true, collection: 'import_batches' })
export class ImportBatch {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  importedByAdminId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  importedByAdminEmail!: string;

  @Prop({ type: String, required: true })
  fileName!: string;

  @Prop({ type: String, required: true, index: true })
  fileChecksum!: string;

  @Prop({ type: Number, required: true })
  totalRows!: number;

  @Prop({ type: Number, required: true })
  successCount!: number;

  @Prop({ type: Number, required: true })
  failedCount!: number;

  @Prop({ type: String, enum: ['COMPLETED', 'COMPLETED_WITH_ERRORS', 'FAILED'], required: true })
  status!: ImportBatchStatus;

  @Prop({ type: Date, required: true })
  startedAt!: Date;

  @Prop({ type: Date, required: true })
  completedAt!: Date;

  @Prop({ type: Number, required: true })
  processingDurationMs!: number;

  @Prop({ type: Number, default: 0 })
  emailsQueued!: number;

  @Prop({ type: Number, default: 0 })
  emailsSent!: number;

  @Prop({ type: Number, default: 0 })
  emailsFailed!: number;

  @Prop({ type: [FailedImportRowSchema], default: [] })
  failedRows!: FailedImportRow[];
}

export const ImportBatchSchema = SchemaFactory.createForClass(ImportBatch);

ImportBatchSchema.index({ createdAt: -1 });
