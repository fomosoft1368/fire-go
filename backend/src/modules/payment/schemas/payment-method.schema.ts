import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface PaymentMethodDocument extends PaymentMethod, Document {
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentMethodType {
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  BANK_ACCOUNT = 'bank_account',
  WALLET = 'wallet',
}

@Schema({ timestamps: true })
export class PaymentMethod {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: false })
  customerId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Driver', required: false })
  driverId?: Types.ObjectId;

  @Prop({ type: String, enum: PaymentMethodType, required: true })
  type: PaymentMethodType;

  @Prop({ required: true })
  name: string; // Tên thẻ/tài khoản (e.g., "My VISA", "Vietcombank Account")

  @Prop()
  cardNumber?: string; // Last 4 digits: "****1234"

  @Prop()
  cardholderName?: string;

  @Prop()
  expiryDate?: string; // MM/YY format

  @Prop()
  bankName?: string;

  @Prop()
  accountNumber?: string;

  @Prop()
  accountHolder?: string;

  @Prop({ type: String })
  icon?: string; // Icon URL or emoji

  @Prop({ default: false })
  isDefault: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Extra data for future use
}

export const PaymentMethodSchema = SchemaFactory.createForClass(PaymentMethod);

PaymentMethodSchema.index({ customerId: 1, isActive: 1 });
PaymentMethodSchema.index({ driverId: 1, isActive: 1 });
