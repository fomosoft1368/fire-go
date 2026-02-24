import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { walletService } from '../services/walletService'
import { driverService } from '../services/driverService'

interface EarningsData {
  balance: number
  pending: number
  thisWeek: number
  thisMonth: number
  total: number
}

interface Transaction {
  id: string
  type: 'completed' | 'withdrawal' | 'bonus'
  title: string
  time: string
  amount: number
  icon: string
}

interface DailyData {
  day: string
  amount: number
}

// Removed mock data - using real API data

export default function EarningsScreen({ navigation }: any) {
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('week')
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

  useEffect(() => {
    fetchWalletData()
  }, [])

  // Update wallet balance and check for warning
  const updateWalletBalance = async () => {
    try {
      const profile = await driverService.getProfile()
      const balance = profile?.walletBalance || 0
      setWalletBalance(balance)
      setShowLowBalanceWarning(balance < 200000)
      console.log('[EarningsScreen] 💰 Wallet balance:', balance, 'Warning:', balance < 200000)
    } catch (error) {
      console.error('[EarningsScreen] Error fetching wallet:', error)
    }
  }

  const fetchWalletData = async () => {
    try {
      setLoading(true)
      // First update wallet balance
      await updateWalletBalance()
      const [balanceData, statsData, transactionsData] = await Promise.all([
        walletService.getBalance(),
        walletService.getStats(),
        walletService.getTransactions(10),
      ])

      setBalance(balanceData.balance)
      setPending(balanceData.pending)
      setStats(statsData)
      setTransactions(transactionsData)

      // ✅ Generate daily data for last 7 days from transactions
      const dailyEarnings = generateDailyData(transactionsData)
      setDailyData(dailyEarnings)

      // ✅ Calculate week-over-week trend
      const trend = calculateWeekTrend(statsData)
      setWeekTrend(trend)
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải dữ liệu ví')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Generate daily earnings data for chart from transactions
  const generateDailyData = (transactions: any[]): DailyData[] => {
    const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
    const today = new Date()
    const dailyMap = new Map<string, number>()

    // Initialize last 7 days with 0
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const key = date.toISOString().split('T')[0]
      dailyMap.set(key, 0)
    }

    // Sum up earnings from commission transactions
    transactions
      .filter(t => t.type === 'commission' && t.status === 'completed')
      .forEach(t => {
        const date = new Date(t.createdAt).toISOString().split('T')[0]
        if (dailyMap.has(date)) {
          dailyMap.set(date, dailyMap.get(date)! + Math.abs(t.amount))
        }
      })

    // Convert to array format for chart
    const result: DailyData[] = []
    let index = 0
    dailyMap.forEach((amount, date) => {
      const dateObj = new Date(date)
      const dayIndex = dateObj.getDay()
      result.push({
        day: days[dayIndex],
        amount: amount,
      })
      index++
    })

    return result
  }

  // ✅ Calculate week-over-week growth percentage
  const calculateWeekTrend = (stats: any): number => {
    const thisWeek = stats.thisWeek || 0
    const lastWeek = stats.lastWeek || 0
    
    if (lastWeek === 0) return 0
    
    const growth = ((thisWeek - lastWeek) / lastWeek) * 100
    return Math.round(growth)
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
          <TouchableOpacity 
            style={styles.supportButton}
            onPress={() => navigation?.navigate('Support')}
          >
            <MaterialIcons name="help-outline" size={24} color="#0f172a" />
          </TouchableOpacity>
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
              
              <TouchableOpacity style={styles.actionButton}>
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
          <Text style={styles.sectionTitle}>Thống kê</Text>
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
          </View>
        </View>

        {/* Chart */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Biểu đồ thu nhập tuần</Text>
            <View style={styles.chartTotal}>
              <Text style={styles.chartTotalLabel}>Tổng tuần</Text>
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
                const height = maxAmount > 0 ? (item.amount / maxAmount) * 160 : 20
                const isHighest = item.amount === maxAmount && maxAmount > 0
                return (
                  <View key={index} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      {isHighest && item.amount > 0 && (
                        <Text style={styles.barValue}>
                          {(item.amount / 1000000).toFixed(1)}tr
                        </Text>
                      )}
                      <LinearGradient
                        colors={isHighest ? ['#FF8A3D', '#FF6B00'] : ['#e2e8f0', '#cbd5e1']}
                        style={[
                          styles.bar,
                          { height: Math.max(height, 20) },
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, isHighest && styles.barLabelActive]}>
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
            <TouchableOpacity>
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

interface TransactionItemProps {
  transaction: Transaction
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const getIconColor = () => {
    if (transaction.type === 'completed') return '#FF6B00'
    if (transaction.type === 'withdrawal') return '#ef4444'
    return '#10b981'
  }

  const getIconBg = () => {
    if (transaction.type === 'completed') return '#fff5eb'
    if (transaction.type === 'withdrawal') return '#fee2e2'
    return '#d1fae5'
  }

  return (
    <View style={styles.transactionItem}>
      <View style={[styles.transactionIcon, { backgroundColor: getIconBg() }]}>
        <MaterialIcons
          name={transaction.icon as any}
          size={20}
          color={getIconColor()}
        />
      </View>
      <View style={styles.transactionInfo}>
        <Text style={styles.transactionTitle}>{transaction.title}</Text>
        <Text style={styles.transactionTime}>{transaction.time}</Text>
      </View>
      <Text
        style={[
          styles.transactionAmount,
          { color: transaction.amount > 0 ? '#10b981' : '#64748b' },
        ]}
      >
        {transaction.amount > 0 ? '+' : ''}
        {transaction.amount.toLocaleString('vi-VN')}đ
      </Text>
    </View>
  )
}

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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: SPACING.md,
  },
  timeFilter: {
    flexDirection: 'row',
    gap: SPACING.md,
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
  },
  barWrapper: {
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  barValue: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B00',
    marginBottom: 4,
  },
  bar: {
    width: 32,
    borderRadius: 8,
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
