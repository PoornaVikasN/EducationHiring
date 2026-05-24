import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RefreshTokenBlacklistDocument = HydratedDocument<RefreshTokenBlacklist>;

@Schema({ collection: 'refresh_token_blacklist' })
export class RefreshTokenBlacklist {
  @Prop({ type: String, required: true, index: true })
  tokenHash!: string;

  @Prop({ type: Date, required: true })
  expiresAt!: Date;
}

export const RefreshTokenBlacklistSchema =
  SchemaFactory.createForClass(RefreshTokenBlacklist);

RefreshTokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
