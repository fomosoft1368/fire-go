import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface TransactionDocument extends Transaction, Document {
  createdAt: Date
  updatedAt: Date
}

export enum TransactionType {
  TOP_UP = 'top_up',
  PAYMENT = 'payment',
  REFUND = 'refund',
  TRANSFER = 'transfer',
  EARNING = 'earning',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  TRANSFERRING = 'transferring',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'User' })
  userId?: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId?: Types.ObjectId

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
  paymentMethod?: string; // For deposit: payment method ID

  @Prop({ type: Types.ObjectId, ref: 'PaymentMethod' })
  bankAccount?: Types.ObjectId; // For withdraw: bank account details

  @Prop()
  transactionId?: string; // External payment gateway ID

  @Prop()
  transactionCode?: string; // Internal reference code

  @Prop()
  failureReason?: string;

  @Prop()
  balanceBefore: number;

  @Prop()
  balanceAfter: number;

  @Prop({ type: Object })
  metadata?: Record<string, any>

  @Prop()
  deletedAt?: Date
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ customerId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ rideId: 1 });
TransactionSchema.index({ transactionCode: 1 });
