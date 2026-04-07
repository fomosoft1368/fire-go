import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface TransactionDocument extends Transaction, Document {
  createdAt: Date
  updatedAt: Date
}

export enum UserType {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
}

export enum TransactionType {
  // Customer types
  TOP_UP = 'top_up',
  PAYMENT = 'payment',
  REFUND = 'refund',
  TRANSFER = 'transfer',
  EARNING = 'earning',
  WITHDRAWAL = 'withdrawal',
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  // Driver types
  TOPUP = 'topup',
  COMMISSION = 'commission',
  BONUS = 'bonus',
  PENALTY = 'penalty',
  REFERRAL_BONUS = 'referral_bonus',
}

export enum TransactionStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  TRANSFERRING = 'transferring',
  COMPLETED = 'completed',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer',
  MOMO = 'momo',
  ZALOPAY = 'zalopay',
  VNPAY = 'vnpay',
  CASH = 'cash',
}

@Schema({ timestamps: true })
export class Transaction {
  // User type discriminator
  @Prop({
    type: String,
    enum: UserType,
    required: true,
    index: true,
  })
  userType: UserType;

  // User references
  @Prop({ type: Types.ObjectId })
  userId?: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Customer' })
  customerId?: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Driver', index: true })
  driverId?: Types.ObjectId;

  // Transaction details
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

  // Trip/ride references
  @Prop()
  rideId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'CombinedTrip' })
  tripId?: Types.ObjectId;

  // Payment method
  @Prop({ type: String, enum: PaymentMethod })
  paymentMethod?: string;

  // Bank account (for customers - ObjectId reference)
  @Prop({ type: Types.ObjectId, ref: 'PaymentMethod' })
  bankAccount?: Types.ObjectId;

  // Bank details (for drivers - direct fields)
  @Prop()
  bankAccountNumber?: string;

  @Prop()
  bankName?: string;

  @Prop()
  accountHolderName?: string;

  // External references
  @Prop()
  transactionId?: string; // External payment gateway ID

  @Prop()
  transactionCode?: string; // Internal reference code

  // Status tracking
  @Prop()
  failureReason?: string;

  @Prop()
  completedAt?: Date;

  // Balance tracking
  @Prop()
  balanceBefore: number;

  @Prop()
  balanceAfter: number;

  // Driver-specific fields
  @Prop()
  commissionRate?: number; // % commission for trips

  @Prop()
  note?: string;

  // Topup discount (for topup transactions)
  @Prop({ default: 0 })
  discountPercent?: number; // % discount applied to topup

  @Prop({ default: 0 })
  discountAmount?: number; // VND discount amount applied to topup

  // Metadata
  @Prop({ type: Object })
  metadata?: Record<string, any>

  @Prop()
  deletedAt?: Date
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// Customer indexes
TransactionSchema.index({ userId: 1 });
TransactionSchema.index({ customerId: 1, createdAt: -1 });
// Driver indexes
TransactionSchema.index({ driverId: 1, createdAt: -1 });
TransactionSchema.index({ type: 1, driverId: 1 });
// Common indexes
TransactionSchema.index({ userType: 1 });
TransactionSchema.index({ type: 1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ status: 1, createdAt: -1 });
TransactionSchema.index({ rideId: 1 });
TransactionSchema.index({ tripId: 1 });
TransactionSchema.index({ transactionCode: 1 });
