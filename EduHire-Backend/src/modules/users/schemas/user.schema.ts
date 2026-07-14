import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Availability, AvailableTimings, MaritalStatus, Role, SalaryRange, Subject, TeacherPost, TypeOfPractice } from '../../../shared/enums';

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
  currentSchool!: string | null;

  @Prop({ type: String, enum: TypeOfPractice, default: null })
  employmentType!: TypeOfPractice | null;

  @Prop({ type: [String], enum: Subject, default: [] })
  expertise!: Subject[];

  @Prop({ type: String, enum: TeacherPost, default: null })
  academics!: TeacherPost | null;

  @Prop({ type: String, enum: SalaryRange, default: null })
  salaryRange!: SalaryRange | null;

  @Prop({ type: [String], enum: AvailableTimings, default: [] })
  availableTimings!: AvailableTimings[];

  @Prop({ type: [String], enum: Subject, default: [] })
  interestedToCover!: Subject[];

  @Prop({ type: Boolean, default: null })
  indemnityInsurance!: boolean | null;

  @Prop({ type: Boolean, default: null })
  isRegisteredWithBoard!: boolean | null;

  @Prop({ type: String, default: null })
  boardRegistrationName!: string | null;

  @Prop({ type: Object, default: null })
  location?: { type: 'Point'; coordinates: [number, number] } | null;
}

const SeekerProfileSchema = SchemaFactory.createForClass(SeekerProfile);

@Schema({ _id: false })
class RecruiterProfile {
  @Prop({ type: String, required: true })
  fullName!: string;

  @Prop({ type: Types.ObjectId, ref: 'School', default: null, index: true })
  schoolId!: Types.ObjectId | null;
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

  // Job alert preference (seeker only) — new posting matching their desired cities / radius
  @Prop({ type: Boolean, default: true })
  alertNewJobs!: boolean;

  // Incremented on password change/reset and admin delete/restore to force-invalidate
  // existing access tokens immediately (JWT strategy compares this against the `tv`
  // claim on every request). Tokens issued before this field existed lack `tv`; treated
  // as version 0 for backward compatibility.
  @Prop({ type: Number, default: 0 })
  tokenVersion!: number;

}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });
UserSchema.index({ 'seekerProfile.location': '2dsphere' }, { sparse: true });
