import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

@Schema({ timestamps: true, collection: 'chat_messages' })
export class ChatMessage {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  applicationId!: Types.ObjectId;

  @Prop({ type: Types.ObjectId, required: true })
  senderId!: Types.ObjectId;

  @Prop({ type: String, required: true })
  senderRole!: string; // TEACHER | RECRUITER

  @Prop({ type: String, required: true, maxlength: 2000 })
  text!: string;

  @Prop({ type: Boolean, default: false })
  read!: boolean;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
ChatMessageSchema.index({ applicationId: 1, createdAt: 1 });
