import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { HospitalDepartment, VerificationStatus } from '../../../shared/enums';

export type HospitalDocument = HydratedDocument<Hospital>;

@Schema({ timestamps: true, collection: 'hospitals' })
export class Hospital {
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
  noOfOperationTheatres!: number | null;

  @Prop({ type: [String], default: [] })
  hospitalInfra!: string[];

  @Prop({ type: Number, default: null })
  noOfCabinsAndBeds!: number | null;

  @Prop({ type: [String], default: [] })
  photos!: string[];

  @Prop({ type: String, default: null })
  scopeOfServices!: string | null;

  @Prop({ type: Number, default: null })
  hospitalStrength!: number | null;

  @Prop({ type: Number, default: null })
  noOfBeds!: number | null;

  @Prop({ type: [String], default: [] })
  accreditations!: string[];

  @Prop({ type: [String], enum: Object.values(HospitalDepartment), default: [] })
  departments!: HospitalDepartment[];

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

export const HospitalSchema = SchemaFactory.createForClass(Hospital);

HospitalSchema.index({ city: 1, isVerified: 1 });
HospitalSchema.index({ location: '2dsphere' }, { sparse: true });
