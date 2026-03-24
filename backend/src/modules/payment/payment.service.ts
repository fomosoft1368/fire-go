import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import * as crypto from 'crypto'
// import axios from 'axios'

interface VNPayConfig {
  tmnCode: string
  hashSecret: string
  apiUrl: string
  returnUrl: string
  notifyUrl: string
}

@Injectable()
export class PaymentService {
  private vnpayConfig: VNPayConfig = {
    tmnCode: process.env.VNPAY_TMN_CODE || '2QNVQ7K1',
    hashSecret: process.env.VNPAY_HASH_SECRET || 'SCPUASVNZJUUKSMHZ4LQTEKBXAOTAZC',
    apiUrl: process.env.VNPAY_API_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html',
    returnUrl: process.env.VNPAY_RETURN_URL || `http://localhost:${process.env.PORT || 3000}/api/payment/vnpay/return`,
    notifyUrl: process.env.VNPAY_NOTIFY_URL || `http://localhost:${process.env.PORT || 3000}/api/payment/vnpay/notify`,
  }

  constructor(@InjectModel('Payment') private paymentModel: Model<any>) {}

  /**
   * Tạo URL thanh toán VNPay
   */
  createPaymentUrl(
    amount: number,
    orderId: string,
    orderInfo: string,
    userId: string,
    language: string = 'vn'
  ): string {
    try {
      console.log('[PaymentService] Creating VNPay payment URL:', {
        amount,
        orderId,
        userId,
      })

      const createDate = this.getVNPayDate(new Date())
      const expireDate = this.getVNPayDate(new Date(Date.now() + 15 * 60 * 1000)) // 15 phút

      const params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: this.vnpayConfig.tmnCode,
        vnp_Locale: language,
        vnp_CurrCode: 'VND',
        vnp_TxnRef: orderId,
        vnp_OrderInfo: orderInfo,
        vnp_OrderType: 'topup',
        vnp_Amount: (amount * 100).toString(),
        vnp_ReturnUrl: this.vnpayConfig.returnUrl,
        vnp_CreateDate: createDate,
        vnp_ExpireDate: expireDate,
        vnp_IpAddr: '127.0.0.1',
        vnp_BankCode: 'NCB',
      }

      // Sort params
      const sortedParams = this.sortObject(params)

      // Create signature
      const signData = Object.entries(sortedParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      const hmac = crypto.createHmac('sha512', this.vnpayConfig.hashSecret)
      const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

      const paymentUrl = `${this.vnpayConfig.apiUrl}?${signData}&vnp_SecureHash=${signed}`

      console.log('[PaymentService] Payment URL created successfully')
      return paymentUrl
    } catch (error) {
      console.error('[PaymentService] Error creating payment URL:', error)
      throw new BadRequestException('Failed to create payment URL')
    }
  }

  /**
   * Xác minh chữ ký thanh toán
   */
  verifyPaymentSignature(
    vnpParams: Record<string, any>,
    secureHash: string
  ): boolean {
    try {
      console.log('[PaymentService] Verifying payment signature')

      const params = { ...vnpParams }
      delete params.vnp_SecureHash
      delete params.vnp_SecureHashType

      const sortedParams = this.sortObject(params)
      const signData = Object.entries(sortedParams)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join('&')

      const hmac = crypto.createHmac('sha512', this.vnpayConfig.hashSecret)
      const computed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex')

      const isValid = computed.toLowerCase() === secureHash.toLowerCase()
      console.log('[PaymentService] Signature verification result:', isValid)

      return isValid
    } catch (error) {
      console.error('[PaymentService] Error verifying signature:', error)
      return false
    }
  }

  /**
   * Xử lý kết quả thanh toán
   */
  async handlePaymentCallback(vnpParams: Record<string, any>): Promise<any> {
    try {
      console.log('[PaymentService] Processing payment callback')

      const { vnp_TxnRef, vnp_Amount, vnp_ResponseCode, vnp_TransactionNo } = vnpParams

      // Kiểm tra xem thanh toán đã được xử lý chưa
      const existingPayment = await this.paymentModel.findOne({
        transactionRef: vnp_TxnRef,
      })

      if (existingPayment) {
        console.log('[PaymentService] Payment already processed:', vnp_TxnRef)
        return {
          success: existingPayment.status === 'completed',
          transactionId: existingPayment._id,
        }
      }

      const amount = parseInt(vnp_Amount) / 100

      // Nếu thanh toán thành công (response code 00)
      if (vnp_ResponseCode === '00') {
        console.log('[PaymentService] Payment successful, creating transaction record')

        // Tạo record thanh toán
        const payment = await this.paymentModel.create({
          userId: vnpParams.userId,
          amount,
          method: 'vnpay',
          type: 'topup',
          status: 'completed',
          transactionRef: vnp_TxnRef,
          transactionNo: vnp_TransactionNo,
          paymentData: vnpParams,
          completedAt: new Date(),
        })

        // TODO: Cộng tiền vào wallet của user
        // await this.walletService.addBalance(vnpParams.userId, amount)

        return {
          success: true,
          transactionId: payment._id,
          amount,
        }
      } else {
        // Thanh toán thất bại
        console.log('[PaymentService] Payment failed with code:', vnp_ResponseCode)

        await this.paymentModel.create({
          userId: vnpParams.userId,
          amount,
          method: 'vnpay',
          type: 'topup',
          status: 'failed',
          transactionRef: vnp_TxnRef,
          transactionNo: vnp_TransactionNo,
          paymentData: vnpParams,
          failedAt: new Date(),
          failureReason: this.getVNPayErrorMessage(vnp_ResponseCode),
        })

        return {
          success: false,
          message: this.getVNPayErrorMessage(vnp_ResponseCode),
        }
      }
    } catch (error) {
      console.error('[PaymentService] Error processing callback:', error)
      throw error
    }
  }

  /**
   * Kiểm tra trạng thái thanh toán
   */
  async checkPaymentStatus(transactionRef: string): Promise<any> {
    try {
      console.log('[PaymentService] Checking payment status for:', transactionRef)

      const payment = await this.paymentModel.findOne({
        transactionRef,
      })

      if (!payment) {
        throw new NotFoundException('Payment not found')
      }

      return {
        status: payment.status,
        amount: payment.amount,
        completedAt: payment.completedAt,
        failureReason: payment.failureReason,
      }
    } catch (error) {
      console.error('[PaymentService] Error checking payment status:', error)
      throw error
    }
  }

  /**
   * Lấy lịch sử thanh toán
   */
  async getPaymentHistory(userId: string, limit: number = 10): Promise<any[]> {
    try {
      console.log('[PaymentService] Fetching payment history for user:', userId)

      const payments = await this.paymentModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec()

      return payments.map((payment) => ({
        id: payment._id,
        amount: payment.amount,
        method: payment.method,
        type: payment.type,
        status: payment.status,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt,
      }))
    } catch (error) {
      console.error('[PaymentService] Error fetching payment history:', error)
      return []
    }
  }

  /**
   * Utility functions
   */

  private sortObject(obj: Record<string, any>): Record<string, any> {
    const sorted: Record<string, any> = {}
    const keys = Object.keys(obj).sort()

    for (const key of keys) {
      if (obj[key]) {
        sorted[key] = obj[key]
      }
    }

    return sorted
  }

  private getVNPayDate(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}${month}${day}${hours}${minutes}${seconds}`
  }

  private getVNPayErrorMessage(code: string): string {
    const messages: Record<string, string> = {
      '00': 'Giao dịch thành công',
      '01': 'Giao dịch bị từ chối',
      '02': 'Merchant không hợp lệ',
      '03': 'Dữ liệu gửi đi không đúng định dạng',
      '04': 'Không tìm thấy giao dịch',
      '05': 'Lỗi xử lý giao dịch',
      '07': 'Trừ tiền thành công nhưng giao dịch không thành công trên hệ thống',
      '08': 'Giao dịch đang chờ xử lý',
      '09': 'Giao dịch bị hủy',
      '10': 'Giao dịch thất bại',
      '99': 'Lỗi không xác định',
    }

    return messages[code] || 'Lỗi không xác định'
  }
}
