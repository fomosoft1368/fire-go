const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.10:3000/api'

export interface Transaction {
  _id: string
  customerId: string | Customer
  transactionCode: string
  type: 'deposit' | 'withdraw' | 'withdrawal' | 'topup' | 'payment' | 'refund' | 'transfer' | 'earning'
  status: 'pending' | 'processing' | 'transferring' | 'success' | 'completed' | 'failed' | 'cancelled'
  amount: number
  fee?: number
  description?: string
  paymentMethod?: string
  bankAccount?: string
  balanceBefore?: number
  balanceAfter?: number
  metadata?: any
  createdAt: string
  updatedAt: string
}

export interface Customer {
  _id: string
  firstName: string
  lastName: string
  email: string
  phone: string
}

export interface PendingTransactionsResponse {
  data: Transaction[]
  total: number
  page: number
  limit: number
}

const getAuthToken = () => {
  const token = localStorage.getItem('token')
  console.log('[WalletService] Auth token:', token ? 'exists' : 'missing')
  return token || ''
}

const getHeaders = () => {
  const token = getAuthToken()
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

export const walletService = {
  // Get pending deposits and withdrawals
  async getPendingTransactions(type?: string, limit: number = 50): Promise<PendingTransactionsResponse> {
    const url = new URL(`${API_BASE_URL}/wallets/admin/pending`)
    if (type) {
      url.searchParams.append('type', type)
    }
    url.searchParams.append('limit', limit.toString())

    const response = await fetch(url.toString(), {
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch pending transactions: ${response.statusText}`)
    }

    const data = await response.json()

    // Handle both array and object responses
    const transactions = Array.isArray(data) ? data : (data.data || [])

    return {
      data: transactions,
      total: transactions.length,
      page: 1,
      limit,
    }
  },

  // Get all transactions (pending, processing, transferring, success, failed)
  async getAllTransactions(limit: number = 100): Promise<PendingTransactionsResponse> {
    const url = new URL(`${API_BASE_URL}/wallets/admin/transactions`)
    url.searchParams.append('limit', limit.toString())

    const response = await fetch(url.toString(), {
      headers: getHeaders(),
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch transactions: ${response.statusText}`)
    }

    const data = await response.json()

    // Handle both array and object responses
    const transactions = Array.isArray(data) ? data : (data.data || [])

    return {
      data: transactions,
      total: transactions.length,
      page: 1,
      limit,
    }
  },

  // Approve deposit
  async approveDeposit(transactionId: string): Promise<Transaction> {
    const response = await fetch(
      `${API_BASE_URL}/wallets/admin/deposit/${transactionId}/approve`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to approve deposit: ${response.statusText}`)
    }

    return response.json()
  },

  // Reject deposit
  async rejectDeposit(transactionId: string, reason: string): Promise<Transaction> {
    const response = await fetch(
      `${API_BASE_URL}/wallets/admin/deposit/${transactionId}/reject`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to reject deposit: ${response.statusText}`)
    }

    return response.json()
  },

  // Approve withdrawal
  async approveWithdraw(transactionId: string): Promise<Transaction> {
    const response = await fetch(
      `${API_BASE_URL}/wallets/admin/withdraw/${transactionId}/approve`,
      {
        method: 'POST',
        headers: getHeaders(),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to approve withdrawal: ${response.statusText}`)
    }

    return response.json()
  },

  // Reject withdrawal
  async rejectWithdraw(transactionId: string, reason: string): Promise<Transaction> {
    const response = await fetch(
      `${API_BASE_URL}/wallets/admin/withdraw/${transactionId}/reject`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ reason }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to reject withdrawal: ${response.statusText}`)
    }

    return response.json()
  },

  // Update withdrawal status
  async updateWithdrawStatus(transactionId: string, status: string): Promise<Transaction> {
    const response = await fetch(
      `${API_BASE_URL}/wallets/admin/withdraw/${transactionId}/status`,
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ status }),
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to update withdrawal status: ${response.statusText}`)
    }

    return response.json()
  },

  // Helper functions
  getTransactionTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      deposit: 'Nạp tiền',
      withdraw: 'Rút tiền',
      topup: 'Top up',
      payment: 'Thanh toán',
      refund: 'Hoàn tiền',
      transfer: 'Chuyển tiền',
      earning: 'Kiếm được',
    }
    return labels[type] || type
  },

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      pending: 'Chờ duyệt',
      processing: 'Đang xử lý',
      transferring: 'Đang chuyển',
      success: 'Hoàn thành',
      completed: 'Hoàn thành',
      failed: 'Thất bại',
      cancelled: 'Hủy',
    }
    return labels[status] || status
  },

  getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      pending: '#FFA500',
      processing: '#2196F3',
      transferring: '#9C27B0',
      success: '#4CAF50',
      completed: '#4CAF50',
      failed: '#F44336',
      cancelled: '#9E9E9E',
    }
    return colors[status] || '#999'
  },

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount)
  },

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleString('vi-VN')
  },
}
