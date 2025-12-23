import { IsNumber, IsEnum, IsOptional, IsString } from 'class-validator';
import { TransactionType } from '../schemas/transaction.schema';

export class TopUpWalletDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string; // card, bank_transfer, etc.

  @IsOptional()
  @IsString()
  description?: string;
}
