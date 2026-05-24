import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { PaymentKind, PaymentStatus } from '../../../shared/enums';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true, collection: 'payments' })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: PaymentKind, required: true, index: true })
  kind!: PaymentKind;

  @Prop({ type: Number, required: true })
  amountPaise!: number;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING, index: true })
  status!: PaymentStatus;

  @Prop({ type: String, required: true, unique: true })
  razorpayOrderId!: string;

  @Prop({ type: String, default: null, sparse: true })
  razorpayPaymentId!: string | null;

  // Entity this payment is for (jobId, applicationId, or hospitalId for subscriptions)
  @Prop({ type: Types.ObjectId, default: null, index: true })
  entityId!: Types.ObjectId | null;

  @Prop({ type: Date, default: null })
  fulfilledAt!: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
PaymentSchema.index({ userId: 1, kind: 1, status: 1 });
PaymentSchema.index({ status: 1, createdAt: 1 }); // for reconciliation cron
