import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OtpDocument = HydratedDocument<Otp>;

@Schema({ timestamps: true, collection: 'otps' })
export class Otp {
  @Prop({ type: String, required: true })
  phoneHash!: string;

  @Prop({ type: String, required: true })
  codeHash!: string;

  @Prop({ type: Number, default: 0 })
  attempts!: number;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const OtpSchema = SchemaFactory.createForClass(Otp);

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ phoneHash: 1 }, { unique: true });
