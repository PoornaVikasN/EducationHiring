import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { SubscriptionStatus } from '../../../shared/enums';

export type SubscriptionDocument = HydratedDocument<Subscription>;

@Schema({ timestamps: true, collection: 'subscriptions' })
export class Subscription {
  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true, index: true })
  hospitalId!: Types.ObjectId;

  @Prop({ type: String, enum: SubscriptionStatus, default: SubscriptionStatus.ACTIVE, index: true })
  status!: SubscriptionStatus;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  @Prop({ type: String, required: true })
  razorpayPaymentId!: string;

  @Prop({ type: String, required: true })
  razorpayOrderId!: string;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);
SubscriptionSchema.index({ hospitalId: 1, status: 1, expiresAt: 1 });
