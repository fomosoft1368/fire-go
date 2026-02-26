import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { walletService } from '../services/walletService'

interface Transaction {
  _id: string
  driverId: string
  type: 'topup' | 'withdrawal' | 'commission' | 'bonus' | 'refund'
  amount: number
  balanceBefore: number
  balanceAfter: number
  status: 'pending' | 'completed' | 'failed' | 'cancelled' | 'processing' | 'transferring' | 'success'
  paymentMethod?: string
  description: string
  createdAt: string
  completedAt?: string
  bankAccountNumber?: string
  bankName?: string
  accountHolderName?: string
  transactionCode?: string
}

export default function TransactionHistoryScreen({ navigation }: any) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'topup' | 'withdrawal' | 'commission'>('all')

  useEffect(() => {
    loadTransactions()
  }, [])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      const data = await walletService.getTransactions(50, 0)
      setTransactions(data)
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải lịch sử giao dịch')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadTransactions()
    setRefreshing(false)
  }

  const handleCancelWithdraw = async (transaction: Transaction) => {
    Alert.alert(
      'Hủy lệnh rút tiền',
      `Bạn có chắc muốn hủy lệnh rút ${Math.abs(transaction.amount).toLocaleString('vi-VN')}đ?\n\nSố tiền sẽ được hoàn lại vào ví của bạn.`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Đồng ý',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true)
              await walletService.cancelWithdraw(transaction._id)
              Alert.alert('Thành công', 'Đã hủy lệnh rút tiền. Số tiền đã được hoàn lại vào ví.')
              loadTransactions()
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể hủy lệnh rút tiền')
            } finally {
              setLoading(false)
            }
          },
        },
      ],
    )
  }

  const getFilteredTransactions = () => {
    if (filter === 'all') return transactions
    return transactions.filter(t => t.type === filter)
  }

  const filteredTransactions = getFilteredTransactions()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return COLORS.success
      case 'pending':
        return '#fbbf24'
      case 'processing':
      case 'transferring':
        return '#3b82f6'
      case 'failed':
      case 'cancelled':
        return '#ef4444'
      default:
        return COLORS.textSecondary
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
      case 'success':
        return 'Hoàn thành'
      case 'pending':
        return 'Chờ duyệt'
      case 'processing':
        return 'Đang xử lý'
      case 'transferring':
        return 'Đang chuyển'
      case 'failed':
        return 'Thất bại'
      case 'cancelled':
        return 'Đã hủy'
      default:
        return status
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'topup':
        return 'Nạp tiền'
      case 'withdrawal':
        return 'Rút tiền'
      case 'commission':
        return 'Hoa hồng'
      case 'bonus':
        return 'Thưởng'
      case 'refund':
        return 'Hoàn tiền'
      default:
        return type
    }
  }

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'topup':
        return { icon: 'add-circle-outline', color: COLORS.success, bg: COLORS.success + '20' }
      case 'withdrawal':
        return { icon: 'account-balance', color: '#ff6b6b', bg: '#ff6b6b20' }
      case 'commission':
        return { icon: 'local-taxi', color: COLORS.primary, bg: COLORS.primary + '20' }
      case 'bonus':
        return { icon: 'card-giftcard', color: '#8b5cf6', bg: '#8b5cf620' }
      case 'refund':
        return { icon: 'refresh', color: '#10b981', bg: '#10b98120' }
      default:
        return { icon: 'receipt', color: COLORS.textSecondary, bg: COLORS.darkBorder }
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.md }}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử giao dịch</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <FilterButton label="Tất cả" active={filter === 'all'} onPress={() => setFilter('all')} />
          <FilterButton label="Nạp tiền" active={filter === 'topup'} onPress={() => setFilter('topup')} />
          <FilterButton label="Rút tiền" active={filter === 'withdrawal'} onPress={() => setFilter('withdrawal')} />
          <FilterButton label="Hoa hồng" active={filter === 'commission'} onPress={() => setFilter('commission')} />
        </ScrollView>
      </View>

      {/* Transactions List */}
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="receipt-long" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
          </View>
        ) : (
          filteredTransactions.map(transaction => {
            const { icon, color, bg } = getIconAndColor(transaction.type)
            const canCancel = transaction.type === 'withdrawal' && transaction.status === 'pending'

            return (
              <View key={transaction._id} style={styles.transactionCard}>
                <View style={styles.transactionHeader}>
                  <View style={[styles.iconBox, { backgroundColor: bg }]}>
                    <MaterialIcons name={icon as any} size={24} color={color} />
                  </View>
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionType}>{getTypeLabel(transaction.type)}</Text>
                    <Text style={styles.transactionDate}>{formatDate(transaction.createdAt)}</Text>
                    {transaction.transactionCode && (
                      <Text style={styles.transactionCode}>Mã: {transaction.transactionCode}</Text>
                    )}
                  </View>
                  <View style={styles.transactionRight}>
                    <Text
                      style={[
                        styles.transactionAmount,
                        { color: transaction.amount > 0 ? COLORS.success : '#ff6b6b' },
                      ]}
                    >
                      {transaction.amount > 0 ? '+' : ''}
                      {transaction.amount.toLocaleString('vi-VN')}đ
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(transaction.status) + '20' }]}>
                      <Text style={[styles.statusText, { color: getStatusColor(transaction.status) }]}>
                        {getStatusLabel(transaction.status)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Description */}
                {transaction.description && (
                  <Text style={styles.description}>{transaction.description}</Text>
                )}

                {/* Bank Info for Withdrawal */}
                {transaction.type === 'withdrawal' && transaction.bankName && (
                  <View style={styles.bankInfoBox}>
                    <MaterialIcons name="account-balance" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.bankInfo}>
                      {transaction.bankName} - {transaction.bankAccountNumber}
                    </Text>
                  </View>
                )}

                {/* Cancel Button for Pending Withdrawals */}
                {canCancel && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => handleCancelWithdraw(transaction)}
                  >
                    <MaterialIcons name="cancel" size={18} color="#ef4444" />
                    <Text style={styles.cancelButtonText}>Hủy lệnh rút tiền</Text>
                  </TouchableOpacity>
                )}
              </View>
            )
          })
        )}

        <View style={{ height: SPACING.xl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

interface FilterButtonProps {
  label: string
  active: boolean
  onPress: () => void
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.filterButton, active && styles.filterButtonActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
  </TouchableOpacity>
)

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterScroll: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  filterButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: SPACING.sm,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#fff',
  },
  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  transactionCode: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: SPACING.xs,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    marginTop: SPACING.md,
    lineHeight: 18,
  },
  bankInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: '#f8fafc',
    borderRadius: BORDER_RADIUS.sm,
  },
  bankInfo: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1.5,
    borderColor: '#ef4444',
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#fef2f2',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    fontWeight: '600',
  },
})
