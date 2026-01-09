import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import {
  PaymentMethod,
  PaymentMethodDocument,
  PaymentMethodType,
} from './schemas/payment-method.schema'
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  PaymentMethodResponseDto,
} from './dto/payment-method.dto'

@Injectable()
export class PaymentMethodService {
  constructor(
    @InjectModel(PaymentMethod.name)
    private paymentMethodModel: Model<PaymentMethodDocument>,
  ) {}

  async createPaymentMethod(
    customerId: string,
    dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.paymentMethodModel.updateMany(
        { customerId: new Types.ObjectId(customerId), isActive: true },
        { isDefault: false },
      )
    }

    const paymentMethod = await this.paymentMethodModel.create({
      customerId: new Types.ObjectId(customerId),
      ...dto,
      isDefault: dto.isDefault || false,
    })

    return this.formatResponse(paymentMethod)
  }

  async getPaymentMethods(customerId: string): Promise<PaymentMethodResponseDto[]> {
    const methods = await this.paymentMethodModel
      .find({
        customerId: new Types.ObjectId(customerId),
        isActive: true,
        deletedAt: null,
      })
      .sort({ isDefault: -1, createdAt: -1 })

    return methods.map(m => this.formatResponse(m))
  }

  async getDefaultPaymentMethod(
    customerId: string,
  ): Promise<PaymentMethodResponseDto | null> {
    const method = await this.paymentMethodModel.findOne({
      customerId: new Types.ObjectId(customerId),
      isDefault: true,
      isActive: true,
      deletedAt: null,
    })

    return method ? this.formatResponse(method) : null
  }

  async updatePaymentMethod(
    methodId: string,
    customerId: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const method = await this.paymentMethodModel.findOne({
      _id: new Types.ObjectId(methodId),
      customerId: new Types.ObjectId(customerId),
    })

    if (!method) {
      throw new Error('Payment method not found')
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      await this.paymentMethodModel.updateMany(
        {
          customerId: new Types.ObjectId(customerId),
          _id: { $ne: new Types.ObjectId(methodId) },
        },
        { isDefault: false },
      )
    }

    Object.assign(method, dto)
    await method.save()

    return this.formatResponse(method)
  }

  async deletePaymentMethod(
    methodId: string,
    customerId: string,
  ): Promise<void> {
    const method = await this.paymentMethodModel.findOne({
      _id: new Types.ObjectId(methodId),
      customerId: new Types.ObjectId(customerId),
    })

    if (!method) {
      throw new Error('Payment method not found')
    }

    // Soft delete
    method.deletedAt = new Date()
    method.isActive = false
    await method.save()
  }

  async setDefaultPaymentMethod(
    methodId: string,
    customerId: string,
  ): Promise<PaymentMethodResponseDto> {
    return this.updatePaymentMethod(methodId, customerId, { isDefault: true })
  }

  private formatResponse(doc: PaymentMethodDocument): PaymentMethodResponseDto {
    return {
      _id: doc._id.toString(),
      customerId: doc.customerId.toString(),
      type: doc.type,
      name: doc.name,
      cardNumber: doc.cardNumber,
      cardholderName: doc.cardholderName,
      expiryDate: doc.expiryDate,
      bankName: doc.bankName,
      accountNumber: doc.accountNumber,
      accountHolder: doc.accountHolder,
      icon: this.getIcon(doc.type),
      isDefault: doc.isDefault,
      isActive: doc.isActive,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }
  }

  private getIcon(type: PaymentMethodType): string {
    const icons: Record<PaymentMethodType, string> = {
      [PaymentMethodType.CREDIT_CARD]: '💳',
      [PaymentMethodType.DEBIT_CARD]: '💳',
      [PaymentMethodType.BANK_ACCOUNT]: '🏦',
      [PaymentMethodType.WALLET]: '👛',
    }
    return icons[type]
  }
}
