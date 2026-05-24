import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { ApplicationState } from '../../../shared/enums';

export type ApplicationDocument = HydratedDocument<Application>;

@Schema({ timestamps: true, collection: 'applications' })
export class Application {
  @Prop({ type: Types.ObjectId, ref: 'Job', required: true, index: true })
  jobId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true, index: true })
  hospitalId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  seekerId!: Types.ObjectId;

  @Prop({ type: String, enum: ApplicationState, default: ApplicationState.INTERESTED, index: true })
  state!: ApplicationState;

  @Prop({ type: String, default: null })
  coverNote!: string | null;

  // Set when hospital shortlists
  @Prop({ type: Date, default: null })
  shortlistedAt!: Date | null;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  shortlistedByUserId!: Types.ObjectId | null;

  // 48h deadline to pay
  @Prop({ type: Date, default: null, index: true })
  paymentDueBy!: Date | null;

  // Set when seeker pays ₹99
  @Prop({ type: Date, default: null })
  paidAt!: Date | null;

  @Prop({ type: String, default: null })
  razorpayPaymentId!: string | null;

  // Reveals hospital contact details after payment
  @Prop({ type: Boolean, default: false })
  hospitalRevealed!: boolean;

  // Set when hospital marks WON/CLOSED
  @Prop({ type: String, default: null })
  decisionReason!: string | null;

  @Prop({ type: Date, default: null })
  decisionAt!: Date | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const ApplicationSchema = SchemaFactory.createForClass(Application);
ApplicationSchema.index({ jobId: 1, seekerId: 1 }, { unique: true, sparse: true });
ApplicationSchema.index({ seekerId: 1, state: 1 });
ApplicationSchema.index({ jobId: 1, state: 1 });
ApplicationSchema.index({ state: 1, paymentDueBy: 1 }); // for shortlist pay-window sweep
