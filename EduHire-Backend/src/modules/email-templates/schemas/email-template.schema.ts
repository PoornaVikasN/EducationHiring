import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';

export type EmailTemplateDocument = HydratedDocument<EmailTemplate>;

export interface TemplateChannels {
  seekerEmail: boolean;
  seekerInApp: boolean;
  recruiterEmail: boolean;
  recruiterInApp: boolean;
}

@Schema({ timestamps: true })
export class EmailTemplate {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  trigger!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  subject!: string;

  @Prop({ required: true })
  body!: string;

  @Prop({ type: [String], default: [] })
  variables!: string[];

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({ default: true })
  isSystem!: boolean;

  @Prop({
    type: {
      seekerEmail:    { type: Boolean, default: true },
      seekerInApp:    { type: Boolean, default: false },
      recruiterEmail: { type: Boolean, default: false },
      recruiterInApp: { type: Boolean, default: false },
    },
    _id: false,
    default: () => ({ seekerEmail: true, seekerInApp: false, recruiterEmail: false, recruiterInApp: false }),
  })
  channels!: TemplateChannels;

  @Prop({ type: String, default: null })
  inAppSeekerTitle!: string | null;

  @Prop({ type: String, default: null })
  inAppSeekerBody!: string | null;

  @Prop({ type: String, default: null })
  inAppRecruiterTitle!: string | null;

  @Prop({ type: String, default: null })
  inAppRecruiterBody!: string | null;

  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  updatedByAdminId!: Types.ObjectId | null;
}

export const EmailTemplateSchema = SchemaFactory.createForClass(EmailTemplate);
