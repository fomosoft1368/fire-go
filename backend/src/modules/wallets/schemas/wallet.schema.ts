import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletDocument = Wallet & Document;

@Schema({ timestamps: true })
export class Wallet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ default: 0 })
  balance: number; // in VND or currency

  @Prop({ default: 0 })
  totalTopUps: number;

  @Prop({ default: 0 })
  totalSpent: number;

  @Prop({ default: false })
  isLocked: boolean;

  @Prop()
  lockedReason?: string;

  @Prop()
  lockedUntil?: Date;
}

export const WalletSchema = SchemaFactory.createForClass(Wallet);

WalletSchema.index({ userId: 1 });
