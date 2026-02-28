import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator'
import { PaymentMethodType } from '../schemas/payment-method.schema'

export class CreatePaymentMethodDto {
  @IsEnum(PaymentMethodType)
  type: PaymentMethodType

  @IsString()
  name: string

  @IsOptional()
  @IsString()
  cardNumber?: string

  @IsOptional()
  @IsString()
  cardholderName?: string

  @IsOptional()
  @IsString()
  expiryDate?: string

  @IsOptional()
  @IsString()
  bankName?: string

  @IsOptional()
  @IsString()
  accountNumber?: string

  @IsOptional()
  @IsString()
  accountHolder?: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

export class PaymentMethodResponseDto {
  _id: string
  customerId?: string
  driverId?: string
  type: PaymentMethodType
  name: string
  cardNumber?: string
  cardholderName?: string
  expiryDate?: string
  bankName?: string
  accountNumber?: string
  accountHolder?: string
  icon?: string
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
