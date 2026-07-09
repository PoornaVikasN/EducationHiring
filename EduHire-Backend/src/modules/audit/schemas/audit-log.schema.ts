import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema({ collection: 'audit_logs', timestamps: true })
export class AuditLog {
  // Nullable to support anonymous/system events (e.g. failed login attempts,
  // OTP lockouts) that have no acting admin — see AuditService.logAuthEvent.
  @Prop({ type: Types.ObjectId, default: null, index: true })
  adminId!: Types.ObjectId | null;

  // Denormalised so audit page never needs a User lookup
  @Prop({ type: String, default: null })
  adminEmail!: string | null;

  // e.g. PRICE_UPDATED, USER_SUSPENDED, SCHOOL_VERIFIED, AUTH_FAILED
  @Prop({ required: true, index: true })
  action!: string;

  // 'price' | 'user' | 'school' | 'api_key' | 'job' | 'auth'
  @Prop({ required: true, index: true })
  entityType!: string;

  // DB id or config key string (e.g. 'RECRUITER_MONTHLY_PAISE')
  @Prop()
  entityId?: string;

  // Human-readable label (e.g. 'School Monthly Subscription')
  @Prop()
  entityLabel?: string;

  @Prop({ type: Object })
  before?: Record<string, unknown>;

  @Prop({ type: Object })
  after?: Record<string, unknown>;

  @Prop({ type: String, default: null })
  ip?: string | null;

  @Prop({ type: String, default: null })
  userAgent?: string | null;

  @Prop({ type: String, default: null })
  reason?: string | null;

  // createdAt injected by timestamps:true
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
AuditLogSchema.index({ createdAt: -1 });
