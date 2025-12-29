import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

interface VNPayConfig {
  tmnCode: string
  hashSecret: string
  apiUrl: string
}

interface PaymentResponse {
  success: boolean
  paymentUrl?: string
  transactionId?: string
  message: string
}

export const paymentService = {
  /**
   * Tạo payment URL cho VNPay
   */
  async createVNPayPayment(amount: number): Promise<string> {
    try {
      if (!amount || amount <= 0) {
        throw new Error('Invalid amount')
      }

      console.log('[PaymentService] Creating VNPay payment for amount:', amount)

      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/payment/vnpay/create-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          orderInfo: `Nạp tiền vào tài khoản lái xe`,
          orderType: 'topup',
          language: 'vn',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to create payment URL')
      }

      const data: PaymentResponse = await response.json()

      if (!data.success || !data.paymentUrl) {
        throw new Error(data.message || 'Failed to create payment URL')
      }

      console.log('[PaymentService] Payment URL created successfully')
      return data.paymentUrl
    } catch (error: any) {
      console.error('[PaymentService] Error creating VNPay payment:', error)
      throw error
    }
  },

  /**
   * Xác nhận thanh toán VNPay
   */
  async verifyVNPayPayment(vnpParams: Record<string, string>): Promise<PaymentResponse> {
    try {
      console.log('[PaymentService] Verifying VNPay payment')

      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/payment/vnpay/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...vnpParams,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to verify payment')
      }

      const data: PaymentResponse = await response.json()
      console.log('[PaymentService] Payment verified:', data.success)
      return data
    } catch (error: any) {
      console.error('[PaymentService] Error verifying payment:', error)
      throw error
    }
  },

  /**
   * Lấy lịch sử thanh toán
   */
  async getPaymentHistory(): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/payment/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch payment history')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : data.data || []
    } catch (error: any) {
      console.error('[PaymentService] Error fetching payment history:', error)
      return []
    }
  },

  /**
   * Hủy thanh toán đang chờ
   */
  async cancelPayment(transactionId: string): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/payment/${transactionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to cancel payment')
      }

      return true
    } catch (error: any) {
      console.error('[PaymentService] Error cancelling payment:', error)
      throw error
    }
  },

  /**
   * Parse VNPay response từ callback URL
   */
  parseVNPayResponse(url: string): Record<string, string> {
    try {
      const urlObj = new URL(url)
      const params: Record<string, string> = {}

      urlObj.searchParams.forEach((value, key) => {
        params[key] = value
      })

      return params
    } catch (error) {
      console.error('[PaymentService] Error parsing VNPay response:', error)
      return {}
    }
  },

  /**
   * Kiểm tra trạng thái thanh toán
   */
  async checkPaymentStatus(transactionId: string): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/payment/${transactionId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to check payment status')
      }

      const data = await response.json()
      return data
    } catch (error: any) {
      console.error('[PaymentService] Error checking payment status:', error)
      throw error
    }
  },
}
