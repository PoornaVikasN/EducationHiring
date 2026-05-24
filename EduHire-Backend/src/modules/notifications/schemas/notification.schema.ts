import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { NotificationKind } from '../../../shared/enums';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true, collection: 'notifications' })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @Prop({ type: String, enum: NotificationKind, required: true })
  kind!: NotificationKind;

  @Prop({ type: String, required: true })
  title!: string;

  @Prop({ type: String, required: true })
  body!: string;

  @Prop({ type: String, default: null })
  link!: string | null;

  @Prop({ type: Boolean, default: false })
  read!: boolean;

  @Prop({ type: Date, default: null })
  deletedAt!: Date | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
