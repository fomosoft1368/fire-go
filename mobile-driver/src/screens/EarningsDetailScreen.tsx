import { useState, useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Platform } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { COLORS, SPACING } from '../constants'
import { earningsService } from '../services/earningsService'
import { withTimeout } from '../utils/api'

interface EarningsDetailScreenProps {
  navigation: any
  route: {
    params?: {
      filter?: 'day' | 'week' | 'month' | 'year'
    }
  }
}

export default function EarningsDetailScreen({ navigation }: EarningsDetailScreenProps) {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])
  const [totalRevenue, setTotalRevenue] = useState(0)
  
  // Date range picker states
  const today = new Date()
  const [startDate, setStartDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1)) // First day of current month
  const [endDate, setEndDate] = useState(today)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pickerType, setPickerType] = useState<'start' | 'end'>('start')

  useEffect(() => {
    fetchEarningsData()
  }, [startDate, endDate])

  const fetchEarningsData = async () => {
    const startTime = Date.now()
    console.log('🚀 [EarningsDetail] Bắt đầu tải dữ liệu...')
    
    try {
      setLoading(true)
      console.log('[EarningsDetail] Fetching earnings from:', startDate, 'to:', endDate)
      
      // Set time boundaries
      const start = new Date(startDate)
      start.setHours(0, 0, 0, 0)
      const end = new Date(endDate)
      end.setHours(23, 59, 59, 999)
      
      // Fetch real earnings from completed trips
      const apiStartTime = Date.now()
      const earningsData = await withTimeout(
        earningsService.getEarningsByDateRange(start, end),
        15000, // 15 second timeout
        'Tải chi tiết thu nhập hết thời gian. Vui lòng thử lại.'
      )
      const apiDuration = Date.now() - apiStartTime
      console.log(`⚡ [EarningsDetail] API phản hồi trong ${apiDuration}ms (${(apiDuration/1000).toFixed(2)}s)`)
      
      console.log('[EarningsDetail] Earnings data:', {
        totalEarnings: earningsData.totalEarnings,
        totalTrips: earningsData.totalTrips,
        transactions: earningsData.transactions.length,
      })
      
      setTransactions(earningsData.transactions)
      setTotalRevenue(earningsData.totalEarnings)
      
      const totalDuration = Date.now() - startTime
      console.log(`✅ [EarningsDetail] Hoàn tất trong ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`)
    } catch (error) {
      const errorDuration = Date.now() - startTime
      console.error(`❌ [EarningsDetail] Lỗi sau ${errorDuration}ms:`, error)
    } finally {
      setLoading(false)
    }
  }

  const getFilterLabel = () => {
    const startStr = startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const endStr = endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    return `${startStr} - ${endStr}`
  }

  const handleDateChange = (_event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios') // Keep open on iOS
    if (date) {
      if (pickerType === 'start') {
        setStartDate(date)
        // If start date is after end date, adjust end date
        if (date > endDate) {
          setEndDate(date)
        }
      } else {
        setEndDate(date)
        // If end date is before start date, adjust start date
        if (date < startDate) {
          setStartDate(date)
        }
      }
    }
  }

  const openDatePicker = (type: 'start' | 'end') => {
    setPickerType(type)
    setShowDatePicker(true)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTime = (dateStr: string | Date) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return 'Vừa xong'
    if (hours < 24) return `${hours} giờ trước`
    
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Hôm qua'
    if (days < 7) return `${days} ngày trước`
    
    return formatDate(date.toISOString())
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'ride': return 'local-taxi'
      case 'combined_trip': return 'people'
      case 'delivery': return 'delivery-dining'
      default: return 'local-taxi'
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.md }}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Chi tiết doanh thu</Text>
            <Text style={styles.headerSubtitle}>{getFilterLabel()}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Date Range Selector */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => openDatePicker('start')}
          >
            <MaterialIcons name="event" size={18} color="#FF6B00" />
            <View style={styles.dateButtonContent}>
              <Text style={styles.dateButtonLabel}>Từ ngày</Text>
              <Text style={styles.dateButtonValue}>{startDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.dateSeparator}>
            <MaterialIcons name="arrow-forward" size={16} color="#94a3b8" />
          </View>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => openDatePicker('end')}
          >
            <MaterialIcons name="event" size={18} color="#FF6B00" />
            <View style={styles.dateButtonContent}>
              <Text style={styles.dateButtonLabel}>Đến ngày</Text>
              <Text style={styles.dateButtonValue}>{endDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Current Range Display */}
        <View style={styles.selectionDisplay}>
          <Text style={styles.selectionLabel}>Khoảng thời gian:</Text>
          <Text style={styles.selectionValue}>{getFilterLabel()}</Text>
        </View>

        {/* Date Picker */}
        {showDatePicker && (
          <DateTimePicker
            value={pickerType === 'start' ? startDate : endDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryIconBox}>
            <MaterialIcons name="paid" size={32} color="#FF6B00" />
          </View>
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Tổng doanh thu</Text>
            <Text style={styles.summaryAmount}>{totalRevenue.toLocaleString('vi-VN')}đ</Text>
            <Text style={styles.summarySubtext}>{transactions.length} giao dịch</Text>
          </View>
        </View>

        {/* Transactions List */}
        <ScrollView style={styles.transactionsList} showsVerticalScrollIndicator={false}>
          {transactions.length > 0 ? (
            transactions.map((transaction, index) => (
              <View key={transaction._id || index} style={styles.transactionItem}>
                <View style={styles.transactionIcon}>
                  <MaterialIcons name={getTransactionIcon(transaction.type) as any} size={20} color="#FF6B00" />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionTitle}>{transaction.description}</Text>
                  <Text style={styles.transactionTime}>{formatTime(transaction.completedAt)}</Text>
                </View>
                <Text style={styles.transactionAmount}>
                  +{transaction.driverEarnings.toLocaleString('vi-VN')}đ
                </Text>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt-long" size={64} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Chưa có doanh thu</Text>
              <Text style={styles.emptySubtext}>trong khoảng thời gian này</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    borderRadius: 16,
    padding: SPACING.md,
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
    backgroundColor: '#fff5eb',
    gap: SPACING.xs,
  },
  dateButtonContent: {
    alignItems: 'flex-start',
  },
  dateButtonLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  dateButtonValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '800',
    marginTop: 2,
  },
  dateSeparator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  filterButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTextActive: {
    color: '#0f172a',
    fontWeight: '800',
  },
  selectionDisplay: {
    backgroundColor: '#fff',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    padding: SPACING.md + 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectionLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  selectionValue: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '800',
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
    padding: SPACING.xl,
    borderRadius: 20,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryIconBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff5eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  summaryInfo: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  transactionsList: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff5eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  transactionTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '500',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
    letterSpacing: -0.3,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: SPACING.xs,
  },
})
