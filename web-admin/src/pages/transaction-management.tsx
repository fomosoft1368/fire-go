import { useState, useEffect } from 'react'
import {
  Modal,
  Input,
  Select,
  message as antdMessage,
} from 'antd'
import Layout from '../components/Layout'
import { walletService, Transaction } from '../services/walletService'
import { useNotification } from '../context/NotificationContext'

export default function WalletManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(false)
  const [searchCode, setSearchCode] = useState('')
  const [pageSize, setPageSize] = useState(15)
  const [rejectModalVisible, setRejectModalVisible] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [newStatus, setNewStatus] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'processing' | 'transferring' | 'success' | 'failed'>('all')
  const { addNotification } = useNotification()

  // Helper functions to check transaction types
  const isDeposit = (type: string) => type === 'deposit' || type === 'topup'
  const isWithdrawal = (type: string) => type === 'withdraw' || type === 'withdrawal'
  
  // Helper to normalize status (backend uses 'completed', frontend uses 'success')
  const isCompleted = (status: string) => status === 'completed' || status === 'success'
  const isFailed = (status: string) => status === 'failed' || status === 'cancelled'

  const stats = {
    pendingDeposits: transactions
      .filter(t => isDeposit(t.type) && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0),
    pendingWithdrawals: transactions
      .filter(t => isWithdrawal(t.type) && t.status === 'pending')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
    totalPending: transactions
      .filter(t => t.status === 'pending')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0),
  }

  useEffect(() => {
    loadTransactions()
  }, [activeTab])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      let response
      
      if (activeTab === 'pending') {
        // Only "Chờ duyệt" tab = only PENDING transactions
        response = await walletService.getPendingTransactions(undefined, 100)
      } else if (activeTab === 'all') {
        // Tab "Tất cả" = show ALL transactions
        response = await walletService.getAllTransactions(100)
      } else {
        // For processing, transferring, success, failed, cancelled - filter from all
        response = await walletService.getAllTransactions(100)
        let data = response.data || []
        
        // Map 'success' tab to both 'success' and 'completed' status
        if (activeTab === 'success') {
          data = data.filter(t => t.status === 'success' || t.status === 'completed')
        } else {
          data = data.filter(t => t.status === activeTab)
        }
        
        setTransactions(data)
        return
      }
      
      const data = response.data || []
      setTransactions(data)
    } catch (error: any) {
      console.error('[TransactionManagement] Error:', error)
      antdMessage.error(error.message || 'Không thể tải giao dịch')
    } finally {
      setLoading(false)
    }
  }

  const getFilteredTransactions = () => {
    let filtered = transactions
    
    // Apply search filter
    if (searchCode) {
      filtered = filtered.filter(t => {
        const matchesCode = t.transactionCode?.toLowerCase().includes(searchCode.toLowerCase())
        
        // Check customer name
        const customer = (t as any).customerId
        const customerName = customer && typeof customer === 'object'
          ? `${customer.firstName} ${customer.lastName}`.toLowerCase()
          : ''
        
        // Check driver name
        const driver = (t as any).driverId
        const driverName = driver && typeof driver === 'object'
          ? `${driver.firstName} ${driver.lastName}`.toLowerCase()
          : ''
        
        return matchesCode || 
               customerName.includes(searchCode.toLowerCase()) ||
               driverName.includes(searchCode.toLowerCase())
      })
    }
    
    return filtered
  }

  const filteredTransactions = getFilteredTransactions()

  const handleRejectClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setRejectReason('')
    setRejectModalVisible(true)
  }

  const handleStatusClick = (transaction: Transaction) => {
    // If status is PENDING, we need to approve first (which changes to PROCESSING)
    // Then open modal to continue with PROCESSING → TRANSFERRING or TRANSFERRING → SUCCESS
    if (transaction.status === 'pending') {
      setSelectedTransaction(transaction)
      setNewStatus('processing') // Auto-select next status for pending
      setStatusModalVisible(true)
    } else {
      // For PROCESSING or TRANSFERRING, show modal to select next status
      setSelectedTransaction(transaction)
      setNewStatus(null)
      setStatusModalVisible(true)
    }
  }

  const getNextWithdrawStatus = (currentStatus: string): string[] => {
    const transitions: Record<string, string[]> = {
      pending: ['processing'],
      processing: ['transferring'],
      transferring: ['success'],
    }
    return transitions[currentStatus] || []
  }

  const handleRejectConfirm = async () => {
    if (!rejectReason.trim()) {
      antdMessage.error('Vui lòng nhập lý do từ chối')
      return
    }

    if (!selectedTransaction) return

    try {
      setLoading(true)
      if (isDeposit(selectedTransaction.type)) {
        await walletService.rejectDeposit(selectedTransaction._id, rejectReason)
        addNotification({
          id: `success-${Date.now()}`,
          type: 'other',
          title: 'Thành công',
          message: 'Từ chối nạp tiền thành công',
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'normal',
        })
      } else if (isWithdrawal(selectedTransaction.type)) {
        await walletService.rejectWithdraw(selectedTransaction._id, rejectReason)
        addNotification({
          id: `success-${Date.now()}`,
          type: 'other',
          title: 'Thành công',
          message: 'Từ chối rút tiền thành công',
          timestamp: new Date().toISOString(),
          read: false,
          priority: 'normal',
        })
      }
      setRejectModalVisible(false)
      loadTransactions()
    } catch (error: any) {
      console.error('[WalletManagement] Reject error:', error)
      addNotification({
        id: `error-${Date.now()}`,
        type: 'other',
        title: 'Lỗi',
        message: error.message || 'Lỗi từ chối giao dịch',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleStatusConfirm = async () => {
    if (!newStatus) {
      antdMessage.error('Vui lòng chọn trạng thái')
      return
    }

    if (!selectedTransaction) return

    try {
      setLoading(true)
      await walletService.updateWithdrawStatus(selectedTransaction._id, newStatus)
      addNotification({
        id: `success-${Date.now()}`,
        type: 'other',
        title: 'Thành công',
        message: `Cập nhật trạng thái rút tiền thành công`,
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'normal',
      })
      setStatusModalVisible(false)
      loadTransactions()
    } catch (error: any) {
      console.error('[WalletManagement] Status update error:', error)
      addNotification({
        id: `error-${Date.now()}`,
        type: 'other',
        title: 'Lỗi',
        message: error.message || 'Lỗi cập nhật trạng thái',
        timestamp: new Date().toISOString(),
        read: false,
        priority: 'high',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="p-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-500 text-xl">account_balance_wallet</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Nạp chờ duyệt</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.pendingDeposits.toLocaleString()} VND
            </p>
          </div>

          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-500 text-xl">credit_card</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Rút chờ duyệt</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.pendingWithdrawals.toLocaleString()} VND
            </p>
          </div>

          <div className="bg-white dark:bg-card-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="size-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-purple-500 text-xl">trending_up</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Tổng chờ xử lý</p>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              {stats.totalPending.toLocaleString()} VND
            </p>
          </div>
        </div>

        {/* Filter + Pagination Controls */}
        <div className="flex flex-row items-center justify-between gap-2 mb-4 w-full">
          <div className="flex gap-2 items-center flex-wrap">
            <button 
              className={`flex h-10 items-center justify-center px-4 rounded-lg transition-all ${
                activeTab === 'all' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => setActiveTab('all')}
            >
              <span className="text-sm font-medium">Tất cả</span>
            </button>
            <button 
              className={`flex h-10 items-center justify-center px-4 rounded-lg transition-all ${
                activeTab === 'pending' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => setActiveTab('pending')}
            >
              <span className="text-sm font-medium">Chờ duyệt</span>
              {stats.totalPending > 0 && (
                <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500/20 px-1.5 text-xs font-bold text-orange-500">{transactions.filter(t => t.status === 'pending').length}</span>
              )}
            </button>
            <button 
              className={`flex h-10 items-center justify-center px-4 rounded-lg transition-all ${
                activeTab === 'processing' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => setActiveTab('processing')}
            >
              <span className="text-sm font-medium">Đang xử lý</span>
            </button>
            <button 
              className={`flex h-10 items-center justify-center px-4 rounded-lg transition-all ${
                activeTab === 'transferring' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => setActiveTab('transferring')}
            >
              <span className="text-sm font-medium">Đang chuyển</span>
            </button>
            <button 
              className={`flex h-10 items-center justify-center px-4 rounded-lg transition-all ${
                activeTab === 'success' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => setActiveTab('success')}
            >
              <span className="text-sm font-medium">Thành công</span>
            </button>
            <button 
              className={`flex h-10 items-center justify-center px-4 rounded-lg transition-all ${
                activeTab === 'failed' 
                  ? 'bg-primary text-white shadow-md shadow-primary/20' 
                  : 'bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
              onClick={() => setActiveTab('failed')}
            >
              <span className="text-sm font-medium">Thất bại</span>
            </button>
          </div>
          {/* Pagination Selector */}
          <Select
            value={pageSize.toString()}
            onChange={(value) => setPageSize(parseInt(value))}
            options={[
              { label: '15 / trang', value: '15' },
              { label: '30 / trang', value: '30' },
              { label: '50 / trang', value: '50' }
            ]}
            className="w-32"
            style={{ width: '140px' }}
          />
        </div>

        {/* Search Bar riêng */}
        <div className="w-full mb-6">
          <div className="flex w-full max-w-2xl items-center rounded-xl h-12 bg-white dark:bg-card-dark border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-primary focus-within:border-primary transition-all">
            <div className="pl-4 flex items-center justify-center text-slate-400">
              <span className="material-symbols-outlined">search</span>
            </div>
            <input 
              className="flex-1 bg-transparent border-none text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-0 px-3 text-base" 
              placeholder="Tìm mã giao dịch, tên khách hàng..."
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
            />
            <button className="pr-4 text-slate-400 hover:text-primary transition-colors">
              <span className="material-symbols-outlined">tune</span>
            </button>
          </div>
        </div>

        {/* Bảng danh sách giao dịch */}
        <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Mã giao dịch</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Khách hàng</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Loại</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Mô tả</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Số tiền</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Ngày tạo</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-center text-xs font-bold text-slate-500 dark:text-slate-300 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-card-dark divide-y divide-slate-200 dark:divide-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400">Không có giao dịch nào phù hợp.</td>
                </tr>
              ) : (
                filteredTransactions.slice(0, pageSize).map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-primary text-sm">{transaction.transactionCode}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        // Check for customer first
                        const customer = (transaction as any).customerId
                        if (typeof customer === 'object' && customer !== null) {
                          return (
                            <div className="flex items-center gap-3">
                              <img
                                className="size-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                src={`https://i.pravatar.cc/150?u=${customer.email || customer._id}`}
                                alt={customer.firstName}
                              />
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                  {customer.firstName} {customer.lastName}
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{customer.email}</div>
                              </div>
                            </div>
                          )
                        }
                        
                        // Check for driver
                        const driver = (transaction as any).driverId
                        if (typeof driver === 'object' && driver !== null) {
                          return (
                            <div className="flex items-center gap-3">
                              <img
                                className="size-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                                src={`https://i.pravatar.cc/150?u=${driver.email || driver._id}`}
                                alt={driver.firstName}
                              />
                              <div>
                                <div className="font-semibold text-slate-900 dark:text-white text-sm">
                                  {driver.firstName} {driver.lastName}
                                  <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">Tài xế</span>
                                </div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{driver.email}</div>
                              </div>
                            </div>
                          )
                        }
                        
                        return <span className="text-slate-500">-</span>
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                        isDeposit(transaction.type)
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                        {isDeposit(transaction.type) ? 'Nạp tiền' : 'Rút tiền'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {transaction.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-primary text-sm">
                        {walletService.formatCurrency(transaction.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">
                      {new Date(transaction.createdAt).toLocaleString('vi-VN', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        transaction.status === 'pending'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          : transaction.status === 'processing'
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                          : transaction.status === 'transferring'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : isCompleted(transaction.status)
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        <span className="material-symbols-outlined text-sm align-middle">
                          {transaction.status === 'pending' ? 'pending' : transaction.status === 'processing' ? 'schedule' : transaction.status === 'transferring' ? 'send' : isCompleted(transaction.status) ? 'check_circle' : 'cancel'}
                        </span>
                        {transaction.status === 'pending' ? 'Chờ duyệt' : transaction.status === 'processing' ? 'Đang xử lý' : transaction.status === 'transferring' ? 'Đang chuyển' : isCompleted(transaction.status) ? 'Thành công' : 'Thất bại'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      {isDeposit(transaction.type) ? (
                        // DEPOSIT: Only view details, no status update workflow
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium text-xs transition-colors"
                          onClick={() => {
                            setSelectedTransaction(transaction)
                            setDetailModalVisible(true)
                          }}
                        >
                          <span className="material-symbols-outlined text-base align-middle">info</span>
                          Chi tiết
                        </button>
                      ) : (
                        // WITHDRAW: Status workflow + reject
                        <>
                          <div className="flex items-center justify-center gap-2 flex-wrap justify-center">
                            {(transaction.status === 'pending' || transaction.status === 'processing' || transaction.status === 'transferring') && (
                              <>
                                {transaction.status === 'pending' && (
                                  <button
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 font-medium text-xs transition-colors"
                                    onClick={() => handleStatusClick(transaction)}
                                  >
                                    <span className="material-symbols-outlined text-base align-middle">arrow_forward</span>
                                    Tiếp theo
                                  </button>
                                )}
                                <button
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 font-medium text-xs transition-colors"
                                  onClick={() => {
                                    setSelectedTransaction(transaction)
                                    setDetailModalVisible(true)
                                  }}
                                >
                                  <span className="material-symbols-outlined text-base align-middle">info</span>
                                  Chi tiết
                                </button>
                                {transaction.status === 'processing' && (
                                  <button
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 hover:bg-purple-200 dark:hover:bg-purple-900/50 font-medium text-xs transition-colors"
                                    onClick={() => handleStatusClick(transaction)}
                                  >
                                    <span className="material-symbols-outlined text-base align-middle">arrow_forward</span>
                                    Tiếp theo
                                  </button>
                                )}
                                {transaction.status === 'transferring' && (
                                  <button
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 font-medium text-xs transition-colors"
                                    onClick={() => handleStatusClick(transaction)}
                                  >
                                    <span className="material-symbols-outlined text-base align-middle">done</span>
                                    Hoàn thành
                                  </button>
                                )}
                                <button
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 font-medium text-xs transition-colors"
                                  onClick={() => handleRejectClick(transaction)}
                                >
                                  <span className="material-symbols-outlined text-base align-middle">close</span>
                                  Hủy
                                </button>
                              </>
                            )}
                            {(isCompleted(transaction.status) || isFailed(transaction.status)) && (
                              <span className="text-slate-500 text-xs">-</span>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Reject Modal */}
        <Modal
          title={null}
          open={rejectModalVisible}
          onOk={handleRejectConfirm}
          onCancel={() => setRejectModalVisible(false)}
          confirmLoading={loading}
          okText="Xác nhận từ chối"
          cancelText="Hủy"
          okButtonProps={{ danger: true, size: 'large' }}
          cancelButtonProps={{ size: 'large' }}
          wrapClassName="dark:bg-slate-900"
          className="dark:text-white"
          width={600}
          bodyStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: 0 }}
        >
          {selectedTransaction && (
            <div className="divide-y divide-slate-200">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-2xl text-red-600">cancel</span>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Từ chối giao dịch</h3>
                    <p className="text-sm text-slate-600">Mã: <span className="font-mono font-bold text-primary">{selectedTransaction.transactionCode}</span></p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Transaction Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Loại</p>
                    <p className="text-base font-bold text-slate-900">
                      {isDeposit(selectedTransaction.type) ? 'Nạp tiền' : 'Rút tiền'}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                    <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-2">Số tiền</p>
                    <p className="text-base font-bold text-red-600">{walletService.formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex gap-3">
                  <span className="material-symbols-outlined text-red-600 flex-shrink-0 mt-0.5">warning</span>
                  <div>
                    <p className="font-semibold text-red-900">Hành động này sẽ hoàn tiền cho khách hàng</p>
                    <p className="text-sm text-red-700 mt-1">Vui lòng nhập lý do từ chối để thông báo cho khách hàng</p>
                  </div>
                </div>

                {/* Reject Reason */}
                <div>
                  <label className="block font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-red-600">edit_note</span>
                    Lý do từ chối <span className="text-red-600">*</span>
                  </label>
                  <Input.TextArea
                    rows={5}
                    placeholder="Nhập lý do từ chối (vd: Tài khoản không hợp lệ, Yêu cầu không đầy đủ, v.v.)"
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    style={{
                      fontSize: '14px',
                      fontFamily: 'inherit'
                    }}
                  />
                  <p className="text-xs text-slate-500 mt-2">Lý do sẽ được gửi cho khách hàng</p>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Status Update Modal */}
        <Modal
          title={selectedTransaction ? (isDeposit(selectedTransaction.type) ? 'Cập nhật trạng thái nạp tiền' : 'Cập nhật trạng thái rút tiền') : 'Cập nhật trạng thái'}
          open={statusModalVisible}
          onOk={() => {
            console.log('[StatusModal] OK clicked, newStatus:', newStatus)
            handleStatusConfirm()
          }}
          onCancel={() => {
            setStatusModalVisible(false)
            setNewStatus(null)
          }}
          confirmLoading={loading}
          okText="Xác nhận"
          cancelText="Hủy"
          okButtonProps={{ disabled: !newStatus }}
          wrapClassName="dark:bg-slate-900"
          className="dark:text-white"
          width={650}
          bodyStyle={{ backgroundColor: '#ffffff', borderRadius: '8px' }}
        >
          {selectedTransaction && (
            <div className="space-y-6">
              {/* Workflow Progress */}
              <div>
                <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm block mb-4">Quy trình xử lý:</span>
                <div className="flex items-center justify-between mb-2">
                  {['pending', 'processing', 'transferring', 'success'].map((status, idx) => {
                    const isCurrent = selectedTransaction.status === status
                    const isCompleted = ['pending', 'processing', 'transferring'].includes(selectedTransaction.status) && 
                                       ['pending', 'processing', 'transferring', 'success'].indexOf(status) <= ['pending', 'processing', 'transferring', 'success'].indexOf(selectedTransaction.status)
                    const isNext = getNextWithdrawStatus(selectedTransaction.status)?.includes(status)
                    
                    return (
                      <div key={status} className="flex flex-col items-center flex-1">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm transition-all ${
                            isCurrent
                              ? 'bg-orange-500 text-white ring-2 ring-orange-500 ring-offset-2'
                              : isCompleted || isNext
                              ? 'bg-blue-100 text-blue-600 border-2 border-blue-300'
                              : 'bg-slate-100 text-slate-400 border-2 border-slate-300'
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <span className="text-xs font-medium mt-2 text-center text-slate-700 dark:text-slate-600 leading-tight">
                          {status === 'pending' && 'Chờ duyệt'}
                          {status === 'processing' && 'Đang xử lý'}
                          {status === 'transferring' && 'Đang chuyển'}
                          {status === 'success' && 'Hoàn thành'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Current Status */}
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-blue-600 flex-shrink-0">info</span>
                  <div>
                    <p className="text-sm font-semibold text-blue-900">Trạng thái hiện tại</p>
                    <p className="text-sm text-blue-700 mt-1 font-medium">
                      {walletService.getStatusLabel(selectedTransaction.status)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block font-semibold text-slate-900 mb-3 text-sm">
                  {selectedTransaction.status === 'pending' 
                    ? (isDeposit(selectedTransaction.type) 
                        ? 'Duyệt lệnh nạp tiền (chuyển sang Đang xử lý):' 
                        : 'Duyệt lệnh rút tiền (chuyển sang Đang xử lý):')
                    : 'Chọn trạng thái tiếp theo:'}
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {getNextWithdrawStatus(selectedTransaction.status)?.map(status => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        console.log('[StatusModal] Clicked status:', status)
                        setNewStatus(status)
                      }}
                      disabled={selectedTransaction.status === 'pending'}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTransaction.status === 'pending'
                          ? 'border-orange-500 bg-orange-50 cursor-default'
                          : newStatus === status
                          ? 'border-orange-500 bg-orange-50 cursor-pointer'
                          : 'border-slate-200 hover:border-orange-300 hover:bg-slate-50 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${
                            newStatus === status || selectedTransaction.status === 'pending'
                              ? 'border-orange-500 bg-orange-500'
                              : 'border-slate-300'
                          }`}
                        >
                          <span className="material-symbols-outlined text-white text-sm">check</span>
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 text-sm">
                            {walletService.getStatusLabel(status)}
                          </p>
                          <p className="text-xs text-slate-600 mt-1">
                            {status === 'processing' && (selectedTransaction.status === 'pending' 
                              ? (isDeposit(selectedTransaction.type)
                                  ? 'Hệ thống sẽ duyệt lệnh nạp tiền của khách hàng'
                                  : 'Hệ thống sẽ duyệt lệnh rút tiền của khách hàng')
                              : (isDeposit(selectedTransaction.type)
                                  ? 'Xác nhận đã nhận lệnh nạp tiền'
                                  : 'Xác nhận đã nhận lệnh rút tiền'))}
                            {status === 'transferring' && (isDeposit(selectedTransaction.type)
                              ? 'Đang nạp tiền cho khách hàng'
                              : 'Đang chuyển tiền cho khách hàng')}
                            {status === 'success' && (isDeposit(selectedTransaction.type)
                              ? 'Hoàn thành nạp tiền'
                              : 'Hoàn thành chuyển tiền')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Transaction Detail Modal */}
        <Modal
          title={null}
          open={detailModalVisible}
          onCancel={() => {
            setDetailModalVisible(false)
            setSelectedTransaction(null)
          }}
          footer={[
            <button
              key="close"
              onClick={() => {
                setDetailModalVisible(false)
                setSelectedTransaction(null)
              }}
              className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              Đóng
            </button>,
          ]}
          wrapClassName="dark:bg-slate-900"
          className="dark:text-white"
          width={700}
          bodyStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: 0 }}
        >
          {selectedTransaction && (
            <div className="divide-y divide-slate-200">
              {/* Header Section */}
              <div className="bg-gradient-to-r from-primary/10 to-orange-50 px-6 py-6">
                <h3 className="text-xl font-bold text-slate-900 mb-1">Chi tiết giao dịch</h3>
                <p className="text-sm text-slate-600">Mã: <span className="font-mono font-bold text-primary">{selectedTransaction.transactionCode}</span></p>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Transaction Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 border border-orange-700 shadow-md">
                    <p className="text-xs font-semibold text-orange-100 uppercase tracking-wider mb-3">Loại giao dịch</p>
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-3xl text-white">
                        {isDeposit(selectedTransaction.type) ? 'account_balance_wallet' : 'payments'}
                      </span>
                      <p className="text-lg font-bold text-white">
                        {isDeposit(selectedTransaction.type) ? 'Nạp tiền' : 'Rút tiền'}
                      </p>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 border border-blue-700 shadow-md">
                    <p className="text-xs font-semibold text-blue-100 uppercase tracking-wider mb-3">Số tiền</p>
                    <p className="text-lg font-bold text-white">{walletService.formatCurrency(selectedTransaction.amount)}</p>
                  </div>
                </div>

                {/* Status & Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Trạng thái</p>
                    <span className={`inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-bold ${walletService.getStatusColor(selectedTransaction.status)} w-full justify-center`}>
                      <span className="material-symbols-outlined text-base">
                        {selectedTransaction.status === 'pending' ? 'pending' : selectedTransaction.status === 'processing' ? 'schedule' : selectedTransaction.status === 'transferring' ? 'send' : isCompleted(selectedTransaction.status) ? 'check_circle' : 'cancel'}
                      </span>
                      {walletService.getStatusLabel(selectedTransaction.status)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Ngày tạo</p>
                    <p className="text-sm font-medium text-slate-700 bg-slate-50 px-3 py-2 rounded-lg">
                      {new Date(selectedTransaction.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>

                {/* Divider */}
                <div className="h-px bg-slate-200"></div>

                {/* Divider */}
                <div className="h-px bg-slate-200"></div>

               

              {/* Customer/Driver Info */}
              {(() => {
                const customer = (selectedTransaction as any).customerId
                const driver = (selectedTransaction as any).driverId
                const user = customer || driver
                const userType = customer ? 'khách hàng' : 'tài xế'
                const userTypeBg = customer ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'
                const userTypeText = customer ? 'text-blue-900' : 'text-purple-900'
                
                if (!user) return null
                
                return (
                  <div className={`${userTypeBg} rounded-lg p-4 space-y-3 border`}>
                    <div className={`font-semibold ${userTypeText} mb-3 flex items-center gap-2`}>
                      <span className="material-symbols-outlined">
                        {customer ? 'person' : 'local_taxi'}
                      </span>
                      Thông tin {userType}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-slate-700">Họ tên:</span>
                      <span className="text-slate-900 font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-slate-700">Email:</span>
                      <span className="text-slate-900">{user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-semibold text-slate-700">Điện thoại:</span>
                      <span className="text-slate-900">{user.phone}</span>
                    </div>
                  </div>
                )
              })()}

              

              {/* Bank Info for Withdraw */}
              {isWithdrawal(selectedTransaction.type) && (
                <div className="bg-green-50 rounded-lg p-4 space-y-3 border border-green-200">
                  <div className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">account_balance</span>
                    Thông tin tài khoản rút tiền
                  </div>
                  <div className="bg-white rounded p-3 border border-green-200">
                    {(() => {
                      // Check if bankAccount is populated (customer withdraw with saved payment method)
                      const bankAccount = (selectedTransaction as any).bankAccount
                      if (bankAccount && typeof bankAccount === 'object') {
                        return (
                          <>
                            {bankAccount.accountNumber && (
                              <div className="flex justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-700">STK:</span>
                                <span className="font-mono font-bold text-slate-900">{bankAccount.accountNumber}</span>
                              </div>
                            )}
                            {bankAccount.accountHolder && (
                              <div className="flex justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-700">Chủ TK:</span>
                                <span className="text-slate-900 font-medium">{bankAccount.accountHolder}</span>
                              </div>
                            )}
                            {bankAccount.bankName && (
                              <div className="flex justify-between">
                                <span className="text-sm font-semibold text-slate-700">Ngân hàng:</span>
                                <span className="text-slate-900 font-medium">{bankAccount.bankName}</span>
                              </div>
                            )}
                          </>
                        )
                      }
                      
                      // Otherwise check for direct bank fields (manual entry or driver withdrawal)
                      const tx = selectedTransaction as any
                      if (tx.bankAccountNumber || tx.bankName || tx.accountHolderName) {
                        return (
                          <>
                            {tx.bankAccountNumber && (
                              <div className="flex justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-700">STK:</span>
                                <span className="font-mono font-bold text-slate-900">{tx.bankAccountNumber}</span>
                              </div>
                            )}
                            {tx.accountHolderName && (
                              <div className="flex justify-between mb-2">
                                <span className="text-sm font-semibold text-slate-700">Chủ TK:</span>
                                <span className="text-slate-900 font-medium">{tx.accountHolderName}</span>
                              </div>
                            )}
                            {tx.bankName && (
                              <div className="flex justify-between">
                                <span className="text-sm font-semibold text-slate-700">Ngân hàng:</span>
                                <span className="text-slate-900 font-medium">{tx.bankName}</span>
                              </div>
                            )}
                          </>
                        )
                      }
                      
                      return <p className="text-slate-500 text-sm">Không có thông tin ngân hàng</p>
                    })()}
                  </div>
                </div>
              )}

                {/* Description */}
                {selectedTransaction.description && (
                  <div>
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Mô tả</p>
                    <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                      <p className="text-slate-700 leading-relaxed">{selectedTransaction.description}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  )
}
