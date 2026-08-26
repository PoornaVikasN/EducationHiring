import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SystemHealthFlagDocument = HydratedDocument<SystemHealthFlag>;

// One document per monitored integration (e.g. 'EMAIL_SENDING') — current status only,
// not a history log (see AuditLog for that). Lets the admin panel show "this integration
// is broken right now" without anyone having to read server console output.
@Schema({ collection: 'system_health_flags', timestamps: true })
export class SystemHealthFlag {
  @Prop({ required: true, unique: true })
  key!: string;

  // Human-readable name shown in the admin UI (e.g. "Email Sending (Gmail)").
  @Prop({ required: true })
  label!: string;

  @Prop({ required: true, enum: ['ok', 'down'], default: 'ok' })
  status!: 'ok' | 'down';

  // The actual error text from the last failure — shown as-is to the admin, no
  // interpretation needed (e.g. Google's "access_denied: Account Restricted" message).
  @Prop({ type: String, default: null })
  lastError!: string | null;

  // Set the moment status flips to 'down', cleared the moment it flips back to 'ok' —
  // lets the UI show "down for 3h" without needing separate incident bookkeeping.
  @Prop({ type: Date, default: null })
  downSince!: Date | null;

  @Prop({ type: Date, default: null })
  lastOkAt!: Date | null;
}

export const SystemHealthFlagSchema = SchemaFactory.createForClass(SystemHealthFlag);
