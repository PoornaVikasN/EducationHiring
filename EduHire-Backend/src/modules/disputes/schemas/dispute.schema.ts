import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { Document } from 'mongoose';

export enum DisputeStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum DisputeKind {
  PAYMENT_REFUND = 'PAYMENT_REFUND',
  APPLICATION_DISPUTE = 'APPLICATION_DISPUTE',
  OTHER = 'OTHER',
}

export type DisputeDocument = Dispute & Document;

@Schema({ timestamps: true })
export class Dispute {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true })
  raisedBy!: mongoose.Types.ObjectId;

  @Prop({ enum: DisputeKind, required: true })
  kind!: DisputeKind;

  @Prop({ required: true, maxlength: 200 })
  subject!: string;

  @Prop({ required: true, maxlength: 2000 })
  description!: string;

  @Prop()
  referenceId?: string;

  @Prop({ enum: DisputeStatus, default: DisputeStatus.OPEN, index: true })
  status!: DisputeStatus;

  @Prop({ maxlength: 2000 })
  adminNote?: string;

  @Prop()
  resolvedAt?: Date;
}

export const DisputeSchema = SchemaFactory.createForClass(Dispute);
