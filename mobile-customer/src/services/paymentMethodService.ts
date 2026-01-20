import AsyncStorage from '@react-native-async-storage/async-storage'

const API_BASE_URL = 'http://192.168.1.14:3000/api'

export interface PaymentMethod {
  _id: string
  customerId: string
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
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/payment-methods`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/payment-methods/default`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/payment-methods`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/payment-methods/${methodId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(
        `${API_BASE_URL}/payment-methods/${methodId}/set-default`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
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
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/payment-methods/${methodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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
