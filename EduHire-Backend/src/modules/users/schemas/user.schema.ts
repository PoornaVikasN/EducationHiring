import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Academics, Availability, AvailableTimings, JobType, MaritalStatus, Role, SalaryRange, TypeOfPractice } from '../../../shared/enums';

// ── Embedded sub-schemas ──────────────────────────────────────────────────────

@Schema({ _id: false })
class SeekerProfile {
  @Prop({ type: String, required: true })
  fullName!: string;

  @Prop({ type: String, default: null })
  headline!: string | null;

  @Prop({ type: String, default: null })
  bio!: string | null;

  @Prop({ type: [String], default: [] })
  skills!: string[];

  @Prop({ type: String, default: null })
  resumeUrl!: string | null;

  @Prop({ type: String, default: null })
  introVideoUrl!: string | null;

  @Prop({ type: [String], default: [] })
  certUrls!: string[];

  @Prop({ type: String, default: null })
  city!: string | null;

  @Prop({ type: String, default: null })
  state!: string | null;

  @Prop({ type: String, enum: Availability, default: null })
  availability!: Availability | null;

  @Prop({ type: [String], default: [] })
  desiredCities!: string[];

  @Prop({ type: [String], enum: JobType, default: [] })
  desiredJobTypes!: JobType[];

  @Prop({ type: Number, default: null })
  experienceYears!: number | null;

  @Prop({ type: Number, default: null })
  age!: number | null;

  @Prop({ type: String, default: null })
  gender!: string | null;

  @Prop({ type: String, enum: MaritalStatus, default: null })
  maritalStatus!: MaritalStatus | null;

  @Prop({ type: [String], default: [] })
  degrees!: string[];

  @Prop({ type: String, default: null })
  whatsappNumber!: string | null;

  @Prop({ type: Boolean, default: false })
  whatsappVerified!: boolean;

  @Prop({ type: String, default: null })
  pincode!: string | null;

  @Prop({ type: String, default: null })
  placeOfPractice!: string | null;

  @Prop({ type: String, enum: TypeOfPractice, default: null })
  typeOfPractice!: TypeOfPractice | null;

  @Prop({ type: [String], default: [] })
  expertise!: string[];

  @Prop({ type: String, enum: Academics, default: null })
  academics!: Academics | null;

  @Prop({ type: String, enum: SalaryRange, default: null })
  salaryRange!: SalaryRange | null;

  @Prop({ type: [String], enum: AvailableTimings, default: [] })
  availableTimings!: AvailableTimings[];

  @Prop({ type: [String], default: [] })
  interestedToCover!: string[];

  @Prop({ type: Boolean, default: null })
  indemnityInsurance!: boolean | null;

  @Prop({ type: Boolean, default: null })
  isRegisteredInCouncil!: boolean | null;

  @Prop({ type: String, default: null })
  medicalCouncilName!: string | null;

  @Prop({ type: Object, default: null })
  location?: { type: 'Point'; coordinates: [number, number] } | null;
}

const SeekerProfileSchema = SchemaFactory.createForClass(SeekerProfile);

@Schema({ _id: false })
class RecruiterProfile {
  @Prop({ type: String, required: true })
  fullName!: string;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', default: null, index: true })
  hospitalId!: Types.ObjectId | null;
}

const RecruiterProfileSchema = SchemaFactory.createForClass(RecruiterProfile);

// ── Main User schema ──────────────────────────────────────────────────────────

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true, collection: 'users' })
export class User {
  @Prop({ type: String, enum: Role, required: true, index: true })
  role!: Role;

  @Prop({ type: String, unique: true, sparse: true, lowercase: true, trim: true })
  email?: string;

  @Prop({ type: String, unique: true, sparse: true, trim: true })
  phone?: string;

  @Prop({ type: String, default: null })
  passwordHash!: string | null;

  @Prop({ type: String, default: null, index: true, sparse: true })
  googleId!: string | null;

  @Prop({ type: Boolean, default: false })
  emailVerified!: boolean;

  @Prop({ type: Boolean, default: false })
  phoneVerified!: boolean;

  @Prop({ type: SeekerProfileSchema, default: null })
  seekerProfile!: SeekerProfile | null;

  @Prop({ type: RecruiterProfileSchema, default: null })
  recruiterProfile!: RecruiterProfile | null;

  @Prop({ type: Boolean, default: true })
  isActive!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;

  // Web Push subscription (stored as JSON string)
  @Prop({ type: String, default: null })
  pushSubscription!: string | null;

  // Seeker SOS subscription — null means not subscribed / expired
  @Prop({ type: Date, default: null })
  seekerSosSubscribedUntil!: Date | null;

  // Job alert preferences (seeker only)
  @Prop({ type: Boolean, default: true })
  alertSosJobs!: boolean;

  @Prop({ type: Boolean, default: true })
  alertFtJobs!: boolean;

}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ 'seekerProfile.location': '2dsphere' }, { sparse: true });
