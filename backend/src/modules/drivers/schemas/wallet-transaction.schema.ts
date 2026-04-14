import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WalletTransactionDocument = WalletTransaction & Document;

export enum TransactionType {
  TOPUP = 'topup', // Nạp tiền
  WITHDRAWAL = 'withdrawal', // Rút tiền
  COMMISSION = 'commission', // Phí chiết khấu tự động trừ
  BONUS = 'bonus', // Thưởng
  REFUND = 'refund', // Hoàn tiền
  PENALTY = 'penalty', // Phạt
}

export enum TransactionStatus {
  PENDING = 'pending', // Đang chờ xử lý
  COMPLETED = 'completed', // Hoàn thành
  FAILED = 'failed', // Thất bại
  CANCELLED = 'cancelled', // Đã hủy
}

export enum PaymentMethod {
  BANK_TRANSFER = 'bank_transfer', // Chuyển khoản ngân hàng
  MOMO = 'momo', // Ví MoMo
  ZALOPAY = 'zalopay', // ZaloPay
  VNPAY = 'vnpay', // VNPay
  CASH = 'cash', // Tiền mặt
}

@Schema({ timestamps: true })
export class WalletTransaction {
  @Prop({ type: Types.ObjectId, ref: 'Driver', required: true, index: true })
  driverId: Types.ObjectId;

  @Prop({ type: String, enum: TransactionType, required: true })
  type: TransactionType;

  @Prop({ required: true })
  amount: number; // Số tiền (VNĐ)

  @Prop({ required: true })
  balanceBefore: number; // Số dư trước giao dịch

  @Prop({ required: true })
  balanceAfter: number; // Số dư sau giao dịch

  @Prop({
    type: String,
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Prop({ type: String, enum: PaymentMethod })
  paymentMethod?: PaymentMethod;

  @Prop()
  description: string; // Mô tả giao dịch

  // For withdrawal
  @Prop()
  bankAccountNumber?: string;

  @Prop()
  bankName?: string;

  @Prop()
  accountHolderName?: string;

  // For commission (từ cuốc xe nào)
  @Prop({ type: Types.ObjectId, ref: 'CombinedTrip' })
  tripId?: Types.ObjectId;

  @Prop()
  commissionRate?: number; // % chiết khấu

  // Metadata
  @Prop()
  note?: string;

  @Prop()
  completedAt?: Date; // Thời gian hoàn thành giao dịch

  @Prop()
  failedReason?: string;

  createdAt?: Date;
  updatedAt?: Date;
}

export const WalletTransactionSchema =
  SchemaFactory.createForClass(WalletTransaction);

// Indexes for better query performance
WalletTransactionSchema.index({ driverId: 1, createdAt: -1 });
WalletTransactionSchema.index({ status: 1, createdAt: -1 });
WalletTransactionSchema.index({ type: 1, driverId: 1 });
