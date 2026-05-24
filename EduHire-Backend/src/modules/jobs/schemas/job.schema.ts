import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { JobStatus, JobType } from '../../../shared/enums';

export type JobDocument = HydratedDocument<Job>;

@Schema({ _id: false })
class LocationSchema {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type!: string;

  @Prop({ type: [Number], required: true })
  coordinates!: [number, number]; // [longitude, latitude]
}
const LocationSubSchema = SchemaFactory.createForClass(LocationSchema);

@Schema({ timestamps: true, collection: 'jobs' })
export class Job {
  @Prop({ type: String, enum: JobType, required: true, index: true })
  type!: JobType;

  @Prop({ type: String, enum: JobStatus, default: JobStatus.PENDING_PAYMENT, index: true })
  status!: JobStatus;

  @Prop({ type: Types.ObjectId, ref: 'Hospital', required: true, index: true })
  hospitalId!: Types.ObjectId;

  // Hidden from seekers until PAID (full-time). Always visible for SOS.
  @Prop({ type: String, required: true, trim: true })
  title!: string;

  @Prop({ type: String, required: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  requirements!: string[];

  @Prop({ type: String, required: true, index: true })
  city!: string;

  @Prop({ type: String, required: true })
  state!: string;

  @Prop({ type: LocationSubSchema, default: null })
  location!: LocationSchema | null;

  @Prop({ type: String, required: true })
  department!: string;

  @Prop({ type: String, required: true })
  role!: string; // e.g. 'Nurse', 'Doctor', 'Lab Technician'

  @Prop({ type: Number, required: true })
  experienceMin!: number;

  @Prop({ type: Number, required: true })
  experienceMax!: number;

  @Prop({ type: Number, required: true })
  salaryMin!: number;

  @Prop({ type: Number, required: true })
  salaryMax!: number;

  @Prop({ type: Date, required: true, index: true })
  expiresAt!: Date;

  // Razorpay payment ref for full-time post fee
  @Prop({ type: String, default: null })
  postPaymentId!: string | null;

  @Prop({ type: Boolean, default: false })
  isBoosted!: boolean;

  @Prop({ type: String, default: null })
  jobTimingStart!: string | null;

  @Prop({ type: String, default: null })
  jobTimingEnd!: string | null;

  @Prop({ type: Number, default: null })
  noOfCasesPerMonth!: number | null;

  @Prop({ type: [String], default: [] })
  departmentRequirements!: string[];

  @Prop({ type: Number, default: 1 })
  openPositions!: number;

  @Prop({ type: Number, default: 0 })
  filledPositions!: number;

  @Prop({ type: String, default: null })
  jobDocumentUrl!: string | null;

  @Prop({ type: [String], default: [] })
  specializations!: string[];

  @Prop({ type: String, default: null })
  requiredDegree!: string | null;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const JobSchema = SchemaFactory.createForClass(Job);

JobSchema.index({ location: '2dsphere' });
JobSchema.index({ status: 1, type: 1, city: 1 });
JobSchema.index({ hospitalId: 1, status: 1 });
JobSchema.index({ expiresAt: 1, status: 1 }); // for expiry cron
