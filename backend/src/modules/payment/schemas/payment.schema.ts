import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PaymentDocument = Payment & Document;

export enum PaymentMethod {
  VNPAY = 'vnpay',
  WALLET = 'wallet',
  BANK_TRANSFER = 'bank_transfer',
}

export enum PaymentType {
  TOPUP = 'topup',
  WITHDRAWAL = 'withdrawal',
  REFUND = 'refund',
}

export enum PaymentStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: Types.ObjectId, ref: 'Driver', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ type: String, enum: PaymentMethod, required: true })
  method: PaymentMethod;

  @Prop({ type: String, enum: PaymentType, required: true })
  type: PaymentType;

  @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
  status: PaymentStatus;

  @Prop()
  transactionRef?: string;

  @Prop()
  transactionNo?: string;

  @Prop({ type: Object })
  paymentData?: Record<string, any>;

  @Prop()
  completedAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  failureReason?: string;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  verified: boolean;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Indexes
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ transactionRef: 1 }, { unique: true, sparse: true });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ createdAt: -1 });
