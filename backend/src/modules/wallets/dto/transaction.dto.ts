import { IsNumber, IsString, IsOptional, Min, IsEnum } from 'class-validator';
import {
  TransactionType,
  TransactionStatus,
} from '../schemas/transaction.schema';

export class DepositDto {
  @IsNumber()
  @Min(10000, { message: 'Số tiền tối thiểu 10,000 VND' })
  amount: number;

  @IsString()
  paymentMethodId: string; // Payment method được chọn

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class WithdrawDto {
  @IsNumber()
  @Min(50000, { message: 'Số tiền tối thiểu 50,000 VND' })
  amount: number;

  @IsString()
  @IsOptional()
  bankAccount?: string; // Bank account ID to withdraw to (optional, for saved payment methods)

  @IsString()
  @IsOptional()
  bankAccountNumber?: string; // Manual bank account number

  @IsString()
  @IsOptional()
  bankName?: string; // Manual bank name

  @IsString()
  @IsOptional()
  accountHolderName?: string; // Manual account holder name

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class TransactionQueryDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus;

  @IsOptional()
  @IsNumber()
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  limit?: number = 20;
}

export class TransactionResponseDto {
  _id: string;
  customerId: string;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  fee: number;
  description: string;
  paymentMethod?: string;
  bankAccount?: string;
  transactionCode: string;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export class DepositResponseDto extends TransactionResponseDto {
  paymentMethodDetails?: {
    name: string;
    type: string;
    cardNumber: string;
    bankName?: string;
  };
}

export class WithdrawResponseDto extends TransactionResponseDto {
  bankDetails?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
  };
}
