import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';

export type SystemConfigDocument = SystemConfig & Document;

@Schema({ collection: 'system_configs', timestamps: true })
export class SystemConfig {
  @Prop({ required: true, unique: true })
  key!: string;

  @Prop()
  valueNumber?: number;

  @Prop()
  valueString?: string;

  @Prop({ required: true, enum: ['price', 'api_key', 'setting'] })
  type!: 'price' | 'api_key' | 'setting';

  @Prop({ required: true })
  label!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true, default: 100 })
  minValue!: number;

  @Prop({ type: Types.ObjectId, default: null })
  updatedByAdminId!: Types.ObjectId | null;
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);
