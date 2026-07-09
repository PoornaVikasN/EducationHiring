import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

@Schema({ _id: false })
class LegalSection {
  @Prop({ type: String, required: true })
  heading!: string;

  // HTML string — rendered as-is on the frontend. Kept simple (no rich-text
  // model) to match the existing static page markup this module replaces.
  @Prop({ type: String, required: true })
  body!: string;
}

const LegalSectionSchema = SchemaFactory.createForClass(LegalSection);

export type LegalPageDocument = HydratedDocument<LegalPage>;

@Schema({ timestamps: true, collection: 'legal_pages' })
export class LegalPage {
  @Prop({ type: String, required: true, unique: true })
  key!: string; // 'terms' | 'privacy-policy'

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  lastUpdatedLabel!: string;

  @Prop({ type: [LegalSectionSchema], default: [] })
  sections!: LegalSection[];

  @Prop({ type: Types.ObjectId, default: null })
  updatedByAdminId!: Types.ObjectId | null;
}

export const LegalPageSchema = SchemaFactory.createForClass(LegalPage);
