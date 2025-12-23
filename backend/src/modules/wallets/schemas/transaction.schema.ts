import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionType {
  TOP_UP = 'top_up',
  PAYMENT = 'payment',
  REFUND = 'refund',
  TRANSFER = 'transfer',
  EARNING = 'earning',
  WITHDRAWAL = 'withdrawal',
}

export enum TransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: TransactionType,
    required: true,
  })
  type: TransactionType;

  @Prop({
    type: String,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Prop({ required: true })
  amount: number;

  @Prop({ default: 0 })
  fee: number;

  @Prop()
  description?: string;

  @Prop()
  rideId?: Types.ObjectId;

  @Prop()
  paymentMethod?: string;

  @Prop()
  transactionId?: string; // External payment gateway ID

  @Prop()
  failureReason?: string;

  @Prop()
  balanceBefore: number;

  @Prop()
  balanceAfter: number;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ rideId: 1 });
