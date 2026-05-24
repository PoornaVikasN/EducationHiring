import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  adminId!: Types.ObjectId;

  // Denormalised so audit page never needs a User lookup
  @Prop({ required: true })
  adminEmail!: string;

  // e.g. PRICE_UPDATED, USER_SUSPENDED, HOSPITAL_VERIFIED
  @Prop({ required: true, index: true })
  action!: string;

  // 'price' | 'user' | 'hospital' | 'api_key' | 'job'
  @Prop({ required: true, index: true })
  entityType!: string;

  // DB id or config key string (e.g. 'SOS_MONTHLY_PAISE')
  @Prop()
  entityId?: string;

  // Human-readable label (e.g. 'Hospital SOS Subscription')
  @Prop()
  entityLabel?: string;

  @Prop({ type: Object })
  before?: Record<string, unknown>;

  @Prop({ type: Object })
  after?: Record<string, unknown>;

  // createdAt injected by timestamps:true
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
