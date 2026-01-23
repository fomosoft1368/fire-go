import AsyncStorage from '@react-native-async-storage/async-storage'

const API_BASE_URL = 'http://192.168.1.16:3000/api'

export interface Transaction {
  _id: string
  customerId: string
  type: 'deposit' | 'withdraw' | 'payment' | 'topup' | 'refund' | 'transfer' | 'earning'
  status: 'pending' | 'success' | 'failed' | 'cancelled'
  amount: number
  fee: number
  description: string
  paymentMethod?: string
  bankAccount?: {
    _id: string
    accountNumber: string
    accountHolder: string
    bankName: string
    name: string
    type: string
  }
  transactionCode: string
  balanceBefore: number
  balanceAfter: number
  createdAt: string
  updatedAt: string
  metadata?: Record<string, any>
}

export interface Wallet {
  _id: string
  userId: string
  balance: number
  totalTopUps: number
  totalSpent: number
  isLocked: boolean
}

export const walletService = {
  async getWalletBalance(): Promise<Wallet> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/wallets/me`, {
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
      console.error('[Wallet] Get balance error:', error)
      throw error
    }
  },

  async getBalance(): Promise<number> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/wallets/balance`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      return data.balance
    } catch (error) {
      console.error('[Wallet] Get balance error:', error)
      throw error
    }
  },

  async deposit(amount: number, paymentMethodId: string, description?: string): Promise<Transaction> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/wallets/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          paymentMethodId,
          description: description || 'Nạp tiền vào ví',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      const transaction = await response.json()
      console.log('[Wallet] Deposit success:', transaction)
      return transaction
    } catch (error) {
      console.error('[Wallet] Deposit error:', error)
      throw error
    }
  },

  async withdraw(amount: number, bankAccountId: string, description?: string): Promise<Transaction> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/wallets/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          bankAccount: bankAccountId,
          description: description || 'Rút tiền từ ví',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || `HTTP ${response.status}`)
      }

      const transaction = await response.json()
      console.log('[Wallet] Withdraw success:', transaction)
      return transaction
    } catch (error) {
      console.error('[Wallet] Withdraw error:', error)
      throw error
    }
  },

  async getTransactionHistory(page: number = 1, limit: number = 20): Promise<{ data: Transaction[], total: number, page: number, pages: number }> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/wallets/history?page=${page}&limit=${limit}`, {
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
      console.error('[Wallet] Get history error:', error)
      throw error
    }
  },

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(value)
  },

  formatDate(dateString: string): string {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  },

  getTransactionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      deposit: 'Nạp tiền',
      withdraw: 'Rút tiền',
      payment: 'Thanh toán',
      topup: 'Nạp lên',
      refund: 'Hoàn tiền',
      transfer: 'Chuyển tiền',
      earning: 'Nhập tiền',
    }
    return labels[type] || type
  },

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Chờ duyệt',
      processing: 'Đang xử lý',
      transferring: 'Đang chuyển',
      success: 'Thành công',
      failed: 'Thất bại',
      cancelled: 'Đã hủy',
    }
    return labels[status] || status
  },

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#FFC107',
      processing: '#2196F3',
      transferring: '#9C27B0',
      success: '#4CAF50',
      failed: '#F44336',
      cancelled: '#9E9E9E',
    }
    return colors[status] || '#9E9E9E'
  },

  getTransactionTypeColor(type: string): string {
    const colors: Record<string, string> = {
      deposit: '#4CAF50',
      withdraw: '#F44336',
      payment: '#2196F3',
      topup: '#FF9800',
      refund: '#9C27B0',
      transfer: '#00BCD4',
      earning: '#4CAF50',
    }
    return colors[type] || '#9E9E9E'
  },

  async cancelWithdraw(transactionId: string): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) throw new Error('No auth token found')

      const response = await fetch(`${API_BASE_URL}/wallets/withdraw/${transactionId}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Không thể hủy yêu cầu rút tiền')
      }
    } catch (error: any) {
      throw error
    }
  },
}
