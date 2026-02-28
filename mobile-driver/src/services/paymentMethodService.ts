import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

export interface PaymentMethod {
  _id: string
  driverId?: string
  customerId?: string
  type: 'credit_card' | 'debit_card' | 'bank_account' | 'wallet'
  name: string
  cardNumber?: string
  cardholderName?: string
  expiryDate?: string
  bankName?: string
  accountNumber?: string
  accountHolder?: string
  icon: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreatePaymentMethodInput {
  type: 'credit_card' | 'debit_card' | 'bank_account' | 'wallet'
  name: string
  cardNumber?: string
  cardholderName?: string
  expiryDate?: string
  bankName?: string
  accountNumber?: string
  accountHolder?: string
  isDefault?: boolean
}

export const paymentMethodService = {
  async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('token') // Driver app uses 'token', not 'authToken'
  },

  async getHeaders() {
    const token = await this.getAuthToken()
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  },

  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const token = await this.getAuthToken()
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/payment-methods`, {
        method: 'GET',
        headers: await this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[PaymentMethod] Get methods error:', error)
      throw error
    }
  },

  async getDefaultPaymentMethod(): Promise<PaymentMethod | null> {
    try {
      const token = await this.getAuthToken()
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/payment-methods/default`, {
        method: 'GET',
        headers: await this.getHeaders(),
      })

      if (!response.ok) {
        if (response.status === 404) return null
        throw new Error(`HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[PaymentMethod] Get default error:', error)
      return null
    }
  },

  async createPaymentMethod(data: CreatePaymentMethodInput): Promise<PaymentMethod> {
    try {
      const token = await this.getAuthToken()
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/payment-methods`, {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[PaymentMethod] Create error:', error)
      throw error
    }
  },

  async updatePaymentMethod(
    methodId: string,
    data: Partial<CreatePaymentMethodInput>,
  ): Promise<PaymentMethod> {
    try {
      const token = await this.getAuthToken()
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/payment-methods/${methodId}`, {
        method: 'PATCH',
        headers: await this.getHeaders(),
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[PaymentMethod] Update error:', error)
      throw error
    }
  },

  async setDefaultPaymentMethod(methodId: string): Promise<PaymentMethod> {
    try {
      const token = await this.getAuthToken()
      if (!token) throw new Error('No auth token found')

      const response = await fetch(
        `${API_BASE_URL}/payment-methods/${methodId}/set-default`,
        {
          method: 'PATCH',
          headers: await this.getHeaders(),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('[PaymentMethod] Set default error:', error)
      throw error
    }
  },

  async deletePaymentMethod(methodId: string): Promise<void> {
    try {
      const token = await this.getAuthToken()
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/payment-methods/${methodId}`, {
        method: 'DELETE',
        headers: await this.getHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('[PaymentMethod] Delete error:', error)
      throw error
    }
  },
}
