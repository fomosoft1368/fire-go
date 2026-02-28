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
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema'

@Injectable()
export class PaymentMethodService {
  constructor(
    @InjectModel(PaymentMethod.name)
    private paymentMethodModel: Model<PaymentMethodDocument>,
    @InjectModel(Driver.name)
    private driverModel: Model<DriverDocument>,
  ) {}

  /**
   * Detect if user is driver or customer
   */
  private async detectUserType(userId: string): Promise<'driver' | 'customer'> {
    const driver = await this.driverModel.findById(userId)
    return driver ? 'driver' : 'customer'
  }

  async createPaymentMethod(
    userId: string,
    dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const userType = await this.detectUserType(userId)
    const userIdObj = new Types.ObjectId(userId)

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      const query = userType === 'driver' 
        ? { driverId: userIdObj, isActive: true }
        : { customerId: userIdObj, isActive: true }
      await this.paymentMethodModel.updateMany(query, { isDefault: false })
    }

    const paymentMethodData: any = {
      ...dto,
      isDefault: dto.isDefault || false,
    }

    if (userType === 'driver') {
      paymentMethodData.driverId = userIdObj
    } else {
      paymentMethodData.customerId = userIdObj
    }

    const paymentMethod = await this.paymentMethodModel.create(paymentMethodData)

    return this.formatResponse(paymentMethod)
  }

  async getPaymentMethods(userId: string): Promise<PaymentMethodResponseDto[]> {
    const userType = await this.detectUserType(userId)
    const userIdObj = new Types.ObjectId(userId)

    const query = userType === 'driver'
      ? { driverId: userIdObj, isActive: true, deletedAt: null }
      : { customerId: userIdObj, isActive: true, deletedAt: null }

    const methods = await this.paymentMethodModel
      .find(query)
      .sort({ isDefault: -1, createdAt: -1 })

    return methods.map(m => this.formatResponse(m))
  }

  async getDefaultPaymentMethod(
    userId: string,
  ): Promise<PaymentMethodResponseDto | null> {
    const userType = await this.detectUserType(userId)
    const userIdObj = new Types.ObjectId(userId)

    const query = userType === 'driver'
      ? { driverId: userIdObj, isDefault: true, isActive: true, deletedAt: null }
      : { customerId: userIdObj, isDefault: true, isActive: true, deletedAt: null }

    const method = await this.paymentMethodModel.findOne(query)

    return method ? this.formatResponse(method) : null
  }

  async updatePaymentMethod(
    methodId: string,
    userId: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    const userType = await this.detectUserType(userId)
    const userIdObj = new Types.ObjectId(userId)

    const query: any = { _id: new Types.ObjectId(methodId) }
    if (userType === 'driver') {
      query.driverId = userIdObj
    } else {
      query.customerId = userIdObj
    }

    const method = await this.paymentMethodModel.findOne(query)

    if (!method) {
      throw new Error('Payment method not found')
    }

    // If setting as default, unset other defaults
    if (dto.isDefault) {
      const updateQuery = userType === 'driver'
        ? { driverId: userIdObj, _id: { $ne: new Types.ObjectId(methodId) } }
        : { customerId: userIdObj, _id: { $ne: new Types.ObjectId(methodId) } }
      await this.paymentMethodModel.updateMany(updateQuery, { isDefault: false })
    }

    Object.assign(method, dto)
    await method.save()

    return this.formatResponse(method)
  }

  async deletePaymentMethod(
    methodId: string,
    userId: string,
  ): Promise<void> {
    const userType = await this.detectUserType(userId)
    const userIdObj = new Types.ObjectId(userId)

    const query: any = { _id: new Types.ObjectId(methodId) }
    if (userType === 'driver') {
      query.driverId = userIdObj
    } else {
      query.customerId = userIdObj
    }

    const method = await this.paymentMethodModel.findOne(query)

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
    userId: string,
  ): Promise<PaymentMethodResponseDto> {
    return this.updatePaymentMethod(methodId, userId, { isDefault: true })
  }

  private formatResponse(doc: PaymentMethodDocument): PaymentMethodResponseDto {
    return {
      _id: doc._id.toString(),
      customerId: doc.customerId?.toString(),
      driverId: doc.driverId?.toString(),
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
