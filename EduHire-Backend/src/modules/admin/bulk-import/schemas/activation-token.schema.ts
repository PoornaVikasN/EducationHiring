import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ActivationTokenDocument = HydratedDocument<ActivationToken>;

// Modeled on auth/schemas/otp.schema.ts's hashed-secret convention, but keyed by
// a link token instead of a short code — the raw token only ever exists in the
// emailed activation link, never stored (only its sha256 hash is persisted).
@Schema({ timestamps: true, collection: 'activation_tokens' })
export class ActivationToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  tokenHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;

  @Prop({ type: Boolean, default: false })
  used!: boolean;
}

export const ActivationTokenSchema = SchemaFactory.createForClass(ActivationToken);

ActivationTokenSchema.index({ tokenHash: 1 }, { unique: true });
ActivationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
