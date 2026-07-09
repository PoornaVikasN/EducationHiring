import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Subject, VerificationStatus } from '../../../shared/enums';

export type SchoolDocument = HydratedDocument<School>;

@Schema({ timestamps: true, collection: 'schools' })
export class School {
  @Prop({ type: String, required: true, trim: true })
  name!: string;

  @Prop({ type: String, required: true, unique: true, trim: true })
  registrationNumber!: string;

  @Prop({ type: String, default: null })
  logoUrl!: string | null;

  @Prop({ type: String, required: true })
  address!: string;

  @Prop({ type: String, required: true, index: true })
  city!: string;

  @Prop({ type: String, required: true })
  state!: string;

  @Prop({ type: String, required: true })
  pincode!: string;

  @Prop({ type: String, required: true, lowercase: true, trim: true })
  contactEmail!: string;

  @Prop({ type: String, required: true, trim: true })
  contactPhone!: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  adminUserId!: Types.ObjectId;

  @Prop({ type: String, default: null })
  description!: string | null;

  @Prop({ type: String, default: null })
  website!: string | null;

  @Prop({ type: Number, default: null })
  noOfClassrooms!: number | null;

  @Prop({ type: [String], default: [] })
  campusFacilities!: string[];

  @Prop({ type: Number, default: null })
  noOfLabsOrSpecialRooms!: number | null;

  @Prop({ type: [String], default: [] })
  photos!: string[];

  @Prop({ type: String, default: null })
  scopeOfServices!: string | null;

  @Prop({ type: Number, default: null })
  schoolStrength!: number | null;

  @Prop({ type: Number, default: null })
  studentCapacity!: number | null;

  @Prop({ type: [String], default: [] })
  accreditations!: string[];

  @Prop({ type: [String], enum: Object.values(Subject), default: [] })
  departments!: Subject[];

  @Prop({ type: Boolean, default: false })
  isVerified!: boolean;

  @Prop({ type: String, enum: Object.values(VerificationStatus), default: VerificationStatus.PENDING })
  verificationStatus!: VerificationStatus;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  @Prop({
    type: { type: String, enum: ['Point'] },
    coordinates: { type: [Number] },
  })
  location?: { type: 'Point'; coordinates: [number, number] };
}

export const SchoolSchema = SchemaFactory.createForClass(School);

SchoolSchema.index({ city: 1, isVerified: 1 });
SchoolSchema.index({ location: '2dsphere' }, { sparse: true });
