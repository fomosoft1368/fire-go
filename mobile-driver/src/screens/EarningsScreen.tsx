import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { walletService } from '../services/walletService'
import { driverService } from '../services/driverService'
import { pricingService } from '../services/pricingService'
import { earningsService } from '../services/earningsService'
import { withTimeout } from '../utils/api'

interface DailyData {
  day: string
  amount: number
}

// Removed mock data - using real API data

export default function EarningsScreen({ navigation }: any) {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month' | 'year'>('week')
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)
  const [pending, setPending] = useState(0)
  const [stats, setStats] = useState({
    thisWeek: 0,
    thisMonth: 0,
    total: 0,
    tripCount: 0,
    avgRating: 0,
    bonusAmount: 0,
  })
  const [transactions, setTransactions] = useState<any[]>([])
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [weekTrend, setWeekTrend] = useState(0)
  const [walletBalance, setWalletBalance] = useState(0)
  const [showLowBalanceWarning, setShowLowBalanceWarning] = useState(false)
  const [earningsData, setEarningsData] = useState<any>(null)

  useEffect(() => {
    // Initial load
    fetchWalletData()

    // Poll balance every 2 seconds for real-time balance updates
    const pollingInterval = setInterval(() => {
      updateWalletBalance()
    }, 2000)

    // Cleanup polling on unmount
    return () => clearInterval(pollingInterval)
  }, [])

  // Refresh balance when screen comes into focus (e.g., after topup)
  useFocusEffect(
    React.useCallback(() => {
      console.log('[EarningsScreen] 👁️ Screen focused - refreshing balance')
      fetchWalletData()
    }, [timeFilter]),
  )

  // Update wallet balance and check for warning
  const updateWalletBalance = async () => {
    try {
      const profile = await driverService.getProfile()
      const balance = profile?.walletBalance || 0
      setWalletBalance(balance)
      
      // ✅ Get dynamic minimum balance from config
      const minBalance = await pricingService.getMinWalletBalanceToGoOnline()
      setShowLowBalanceWarning(balance < minBalance)
      
      console.log('[EarningsScreen] 💰 Wallet balance:', balance, 'Min required:', minBalance, 'Warning:', balance < minBalance)
    } catch (error) {
      console.error('[EarningsScreen] Error fetching wallet:', error)
    }
  }

  const fetchWalletData = async () => {
    const startTime = Date.now()
    console.log('🚀 [Earnings] Bắt đầu tải dữ liệu...')
    
    try {
      setLoading(true)
      // First update wallet balance
      const updateStartTime = Date.now()
      await updateWalletBalance()
      console.log(`⚡ [Earnings] updateWalletBalance() trong ${Date.now() - updateStartTime}ms`)
      
      const apiStartTime = Date.now()
      const [balanceData, statsData, transactionsData, earnings] = await withTimeout(
        Promise.all([
          walletService.getBalance(),
          walletService.getStats(),
          walletService.getTransactions(10),
          earningsService.getEarningsByTimeRange(timeFilter),
        ]),
        20000, // 20 second timeout for multiple APIs
        'Tải dữ liệu thu nhập hết thời gian. Vui lòng thử lại.'
      )
      const apiDuration = Date.now() - apiStartTime
      console.log(`⚡ [Earnings] 4 API song song phản hồi trong ${apiDuration}ms (${(apiDuration/1000).toFixed(2)}s)`)

      console.log('[EarningsScreen] 💰 Earnings data:', {
        totalEarnings: earnings.totalEarnings,
        totalTrips: earnings.totalTrips,
        transactions: earnings.transactions.length,
      })

      setBalance(balanceData.balance)
      setPending(balanceData.pending)
      setStats(statsData)
      setTransactions(transactionsData) // Recent wallet transactions for display
      setEarningsData(earnings)

      // ✅ Generate chart data from real earnings transactions
      const chartData = generateChartData(earnings.transactions, timeFilter)
      console.log('[EarningsScreen] 📈 Chart data points:', chartData.length)
      setDailyData(chartData)

      // ✅ Calculate week-over-week trend from earnings
      const trend = calculateWeekTrend(earnings)
      setWeekTrend(trend)
      
      const totalDuration = Date.now() - startTime
      console.log(`✅ [Earnings] Hoàn tất trong ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`)
    } catch (error: any) {
      const errorDuration = Date.now() - startTime
      console.error(`❌ [Earnings] Lỗi sau ${errorDuration}ms:`, error)
      Alert.alert('Lỗi', error.message || 'Không thể tải dữ liệu ví')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Generate chart data based on time filter from real transactions
  const generateChartData = (transactions: any[], filter: 'day' | 'week' | 'month' | 'year'): DailyData[] => {
    console.log('[generateChartData] Input:', transactions.length, 'transactions, filter:', filter)
    
    const today = new Date()
    const dataMap = new Map<string, number>()
    let labels: string[] = []
    let keys: string[] = []

    if (filter === 'day') {
      // Last 24 hours - hourly breakdown
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(today)
        hour.setHours(today.getHours() - i, 0, 0, 0)
        const key = `${hour.getHours()}h`
        keys.push(hour.toISOString())
        labels.push(i % 4 === 0 ? key : '') // Show every 4 hours
        dataMap.set(hour.toISOString(), 0)
      }
    } else if (filter === 'week') {
      // Last 7 days
      const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today)
        date.setDate(date.getDate() - i)
        date.setHours(0, 0, 0, 0)
        const key = date.toISOString().split('T')[0]
        keys.push(key)
        labels.push(days[date.getDay()])
        dataMap.set(key, 0)
      }
    } else if (filter === 'month') {
      // Last 30 days - by week
      for (let i = 4; i >= 0; i--) {
        const weekStart = new Date(today)
        weekStart.setDate(today.getDate() - (i * 7 + 6))
        weekStart.setHours(0, 0, 0, 0)
        const key = weekStart.toISOString().split('T')[0]
        keys.push(key)
        labels.push(`T${5 - i}`)
        dataMap.set(key, 0)
      }
    } else {
      // Last 12 months
      const months = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12']
      for (let i = 11; i >= 0; i--) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1)
        const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`
        keys.push(key)
        labels.push(months[month.getMonth()])
        dataMap.set(key, 0)
      }
    }

    // Sum up earnings from ride/combined_trip/delivery transactions
    console.log('[generateChartData] Processing transactions:', transactions.length)
    
    transactions.forEach(t => {
        const date = new Date(t.completedAt)
        const earnings = t.driverEarnings || 0
        
        if (filter === 'day') {
          // Group by hour
          const hourKey = new Date(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours()).toISOString()
          if (dataMap.has(hourKey)) {
            dataMap.set(hourKey, dataMap.get(hourKey)! + earnings)
          }
        } else if (filter === 'week') {
          // Group by day
          const dayKey = date.toISOString().split('T')[0]
          if (dataMap.has(dayKey)) {
            dataMap.set(dayKey, dataMap.get(dayKey)! + earnings)
          }
        } else if (filter === 'month') {
          // Group by week
          const weekIndex = Math.floor((today.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000))
          if (weekIndex >= 0 && weekIndex < 5) {
            const weekKey = keys[4 - weekIndex]
            if (dataMap.has(weekKey)) {
              dataMap.set(weekKey, dataMap.get(weekKey)! + earnings)
            }
          }
        } else {
          // Group by month
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
          if (dataMap.has(monthKey)) {
            dataMap.set(monthKey, dataMap.get(monthKey)! + earnings)
          }
        }
      })

    // Convert to array format for chart
    const result: DailyData[] = []
    keys.forEach((key, index) => {
      result.push({
        day: labels[index],
        amount: dataMap.get(key) || 0,
      })
    })

    console.log('[generateChartData] Result:', result.length, 'data points, total amount:', result.reduce((sum, d) => sum + d.amount, 0))
    
    return result
  }

  // ✅ Calculate week-over-week growth percentage from earnings
  const calculateWeekTrend = (_earnings: any): number => {
    // Simple return 0 for now as we don't have last week earnings yet
    return 0
  }

  const maxAmount = dailyData.length > 0 
    ? Math.max(...dailyData.map((d) => d.amount)) 
    : 1000000

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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Thu nhập</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={() => navigation?.navigate('DriverBonus')}
            >
              <MaterialIcons name="card-giftcard" size={24} color="#FF6B00" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.supportButton}
              onPress={() => navigation?.navigate('Support')}
            >
              <MaterialIcons name="help-outline" size={24} color="#0f172a" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Low Balance Warning Banner */}
        {showLowBalanceWarning && (
          <View style={styles.warningBanner}>
            <MaterialIcons name="warning" size={24} color="#fff" style={{marginRight: SPACING.md}} />
            <View style={styles.warningContent}>
              <Text style={styles.warningTitle}>⚠️ Cảnh báo số dư ví</Text>
              <Text style={styles.warningText}>
                Số dư của bạn là {walletBalance.toLocaleString('vi-VN')}đ. Bạn cần nạp tiền để tiếp tục nhận cuốc.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation?.navigate('Topup')}
              style={styles.warningAction}
            >
              <Text style={styles.warningActionText}>Nạp</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Balance Card */}
        <View style={styles.balanceCardWrapper}>
          <LinearGradient
            colors={['#FF8A3D', '#FF6B00', '#E85D00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            
            <View style={styles.balanceHeader}>
              <View style={styles.walletIconBox}>
                <MaterialIcons name="account-balance-wallet" size={24} color="#fff" />
              </View>
              <Text style={styles.walletLabel}>Số dư khả dụng</Text>
            </View>

            <View style={styles.balanceMainRow}>
              <View style={styles.balanceLeft}>
                <Text style={styles.balanceAmount}>
                  {balance.toLocaleString('vi-VN')}đ
                </Text>
              </View>
              {weekTrend !== 0 && (
                <View style={styles.trendBadge}>
                  <MaterialIcons 
                    name={weekTrend >= 0 ? "trending-up" : "trending-down"} 
                    size={16} 
                    color="#fff" 
                  />
                  <Text style={styles.trendText}>
                    {weekTrend > 0 ? '+' : ''}{weekTrend}%
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={styles.pendingAmount}>
              Chờ xử lý: {pending.toLocaleString('vi-VN')}đ
            </Text>

            <View style={styles.balanceActions}>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation?.navigate('Topup')}
              >
                <View style={styles.actionIconBox}>
                  <MaterialIcons name="add" size={20} color="#FF6B00" />
                </View>
                <Text style={styles.actionButtonText}>Nạp tiền</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => navigation?.navigate('Withdrawal')}
              >
                <View style={styles.actionIconBox}>
                  <MaterialIcons name="logout" size={20} color="#FF6B00" />
                </View>
                <Text style={styles.actionButtonText}>Rút tiền</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('TransactionHistory')}>
                <View style={styles.actionIconBox}>
                  <MaterialIcons name="history" size={20} color="#FF6B00" />
                </View>
                <Text style={styles.actionButtonText}>Lịch sử</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>

        {/* Time Filter */}
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Text style={styles.sectionTitle}>Thống kê</Text>
            <TouchableOpacity 
              onPress={() => navigation?.navigate('EarningsDetail', { filter: timeFilter })}
              style={styles.detailButton}
            >
              <Text style={styles.detailButtonText}>Chi tiết</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#FF6B00" />
            </TouchableOpacity>
          </View>
          <View style={styles.timeFilter}>
            <FilterButton
              label="Ngày"
              active={timeFilter === 'day'}
              onPress={() => setTimeFilter('day')}
            />
            <FilterButton
              label="Tuần"
              active={timeFilter === 'week'}
              onPress={() => setTimeFilter('week')}
            />
            <FilterButton
              label="Tháng"
              active={timeFilter === 'month'}
              onPress={() => setTimeFilter('month')}
            />
            <FilterButton
              label="Năm"
              active={timeFilter === 'year'}
              onPress={() => setTimeFilter('year')}
            />
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>
              {timeFilter === 'day' ? 'Thu nhập hôm nay' :
               timeFilter === 'week' ? 'Thu nhập tuần này' :
               timeFilter === 'month' ? 'Thu nhập tháng này' :
               'Thu nhập năm nay'}
            </Text>
            <View style={styles.chartTotal}>
              <Text style={styles.chartTotalLabel}>
                {timeFilter === 'day' ? 'Tổng ngày' :
                 timeFilter === 'week' ? 'Tổng tuần' :
                 timeFilter === 'month' ? 'Tổng tháng' :
                 'Tổng năm'}
              </Text>
              <Text style={styles.chartTotalValue}>
                {dailyData.length > 0 
                  ? (dailyData.reduce((sum, d) => sum + d.amount, 0) / 1000000).toFixed(1)
                  : '0.0'}tr
              </Text>
            </View>
          </View>

          <View style={styles.chart}>
            {dailyData.length > 0 ? (
              dailyData.map((item, index) => {
                // Better height calculation with min/max bounds
                const normalizedHeight = maxAmount > 0 ? (item.amount / maxAmount) : 0
                const minHeight = item.amount > 0 ? 35 : 8 // Min height for non-zero values
                const maxHeight = 160
                const calculatedHeight = normalizedHeight * maxHeight
                const height = Math.max(minHeight, Math.min(calculatedHeight, maxHeight))
                
                const isHighest = item.amount === maxAmount && maxAmount > 0
                // Only show value if bar is tall enough and amount > 0
                const shouldShowValue = item.amount > 0 && height > 50
                
                return (
                  <View key={index} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      {shouldShowValue && (
                        <Text style={[styles.barValue, isHighest && styles.barValueHighest]}>
                          {item.amount >= 1000000 
                            ? `${(item.amount / 1000000).toFixed(1)}tr`
                            : item.amount >= 1000
                            ? `${Math.round(item.amount / 1000)}k`
                            : `${item.amount}đ`}
                        </Text>
                      )}
                      <LinearGradient
                        colors={item.amount > 0 
                          ? (isHighest ? ['#FFB84D', '#FF8A3D', '#FF6B00'] : ['#FF9F5A', '#FF7A2F'])
                          : ['#f1f5f9', '#e2e8f0']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={[
                          styles.bar,
                          { height },
                          item.amount > 0 && styles.barActive,
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, item.amount > 0 && styles.barLabelActive]}>
                      {item.day}
                    </Text>
                  </View>
                )
              })
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#64748b', fontSize: 14 }}>
                  Chưa có dữ liệu
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Tổng quan</Text>
          <View style={styles.statsGrid}>
            <StatCard
              icon="local-taxi"
              iconColor="#FF6B00"
              iconBg="#fff5eb"
              value={stats.tripCount.toString()}
              label="Chuyến xe"
            />
            <StatCard
              icon="star"
              iconColor="#fbbf24"
              iconBg="#fef3c7"
              value={stats.avgRating.toFixed(1)}
              label="Đánh giá"
            />
            <StatCard
              icon="schedule"
              iconColor="#10b981"
              iconBg="#d1fae5"
              value={`${(stats.thisWeek / 1000000).toFixed(1)}tr`}
              label="Thu tuần"
            />
            <StatCard
              icon="card-giftcard"
              iconColor="#8b5cf6"
              iconBg="#ede9fe"
              value={`${(stats.bonusAmount / 1000).toFixed(0)}k`}
              label="Thưởng"
            />
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionHeader}>
            <Text style={styles.sectionTitle}>Giao dịch gần đây</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
              <Text style={styles.seeAllLink}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {transactions.length > 0 ? (
            transactions.map((transaction) => (
              <RealTransactionItem key={transaction._id} transaction={transaction} />
            ))
          ) : (
            <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
              <MaterialIcons name="receipt-long" size={48} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, marginTop: SPACING.md }}>
                Chưa có giao dịch nào
              </Text>
            </View>
          )}
        </View>
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
    style={[styles.filterBtn, active && styles.filterBtnActive]}
    onPress={onPress}
  >
    <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
  </TouchableOpacity>
)

interface StatCardProps {
  icon: string
  iconColor: string
  iconBg: string
  value: string
  label: string
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconColor, iconBg, value, label }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIconBox, { backgroundColor: iconBg }]}>
      <MaterialIcons name={icon as any} size={24} color={iconColor} />
    </View>
    <View style={styles.statInfo}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
)

// Component cho real transactions từ API
const RealTransactionItem: React.FC<{ transaction: any }> = ({ transaction }) => {
  const getIconAndColor = () => {
    switch (transaction.type) {
      case 'topup':
        return { icon: 'add-circle-outline', color: COLORS.success, bg: COLORS.success + '20' }
      case 'withdrawal':
        return { icon: 'account-balance', color: '#ff6b6b', bg: '#ff6b6b20' }
      case 'commission':
        return { icon: 'local-taxi', color: COLORS.primary, bg: COLORS.primary + '20' }
      case 'bonus':
        return { icon: 'card-giftcard', color: COLORS.success, bg: COLORS.success + '20' }
      default:
        return { icon: 'receipt', color: COLORS.textSecondary, bg: COLORS.darkBorder }
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    
    if (hours < 1) return 'Vừa xong'
    if (hours < 24) return `${hours} giờ trước`
    
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Hôm qua'
    if (days < 7) return `${days} ngày trước`
    
    return date.toLocaleDateString('vi-VN')
  }

  const { icon, color, bg } = getIconAndColor()

  return (
    <View style={styles.transactionItem}>
      <View style={[styles.transactionIcon, { backgroundColor: bg }]}>
        <MaterialIcons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>{transaction.description}</Text>
        <Text style={styles.transactionTime}>{formatDate(transaction.createdAt)}</Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          transaction.amount > 0 ? { color: COLORS.success } : { color: '#ff6b6b' },
        ]}
      >
        {transaction.amount > 0 ? '+' : ''}
        {transaction.amount.toLocaleString('vi-VN')}đ
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D32F2F',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.md,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  warningText: {
    fontSize: 12,
    color: '#ffebee',
    marginTop: SPACING.xs,
    lineHeight: 18,
  },
  warningAction: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
  },
  warningActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
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
  supportButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceCardWrapper: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  balanceCard: {
    borderRadius: 24,
    padding: SPACING.xl,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    zIndex: 1,
  },
  walletIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  walletLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
  },
  balanceMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
    zIndex: 1,
  },
  balanceLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },
  trendText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '800',
  },
  pendingAmount: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.75)',
    marginBottom: SPACING.lg,
    fontWeight: '500',
    zIndex: 1,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    zIndex: 1,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  actionIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  filterSection: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  detailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  detailButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B00',
  },
  timeFilter: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  filterTextActive: {
    color: '#fff',
  },
  chartSection: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: SPACING.xl,
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  chartTotal: {
    alignItems: 'flex-end',
  },
  chartTotalLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2,
  },
  chartTotalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FF6B00',
    letterSpacing: -0.5,
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 180,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginHorizontal: 2,
  },
  barWrapper: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
    width: '100%',
  },
  barValue: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    marginBottom: 6,
    textAlign: 'center',
  },
  barValueHighest: {
    color: '#FF6B00',
    fontSize: 11,
    fontWeight: '900',
  },
  bar: {
    width: '85%',
    minWidth: 24,
    maxWidth: 36,
    borderRadius: 8,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  barActive: {
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  barLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginTop: SPACING.xs,
  },
  barLabelActive: {
    color: '#FF6B00',
    fontWeight: '800',
  },
  statsSection: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  statsGrid: {
    flexDirection: 'column',
    gap: SPACING.md,
  },
  statCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  statInfo: {
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 2,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  transactionsSection: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  seeAllLink: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '700',
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
    letterSpacing: -0.3,
  },
})
