import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { walletService } from '../services/walletService'

const { width } = Dimensions.get('window')

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

const mockEarnings: EarningsData = {
  balance: 5240000,
  pending: 150000,
  thisWeek: 8500000,
  thisMonth: 35000000,
  total: 125000000,
}

const mockDailyData: DailyData[] = [
  { day: 'T2', amount: 1000000 },
  { day: 'T3', amount: 1100000 },
  { day: 'T4', amount: 950000 },
  { day: 'T5', amount: 1300000 },
  { day: 'T6', amount: 2400000 },
  { day: 'T7', amount: 1200000 },
  { day: 'CN', amount: 800000 },
]

const mockTransactions: Transaction[] = [
  {
    id: '1',
    type: 'completed',
    title: 'Hoàn thành chuyến #X829',
    time: '10:30 AM • Hôm nay',
    amount: 150000,
    icon: 'local-taxi',
  },
  {
    id: '2',
    type: 'withdrawal',
    title: 'Rút về VCB',
    time: '16:45 PM • Hôm qua',
    amount: -2000000,
    icon: 'account-balance',
  },
  {
    id: '3',
    type: 'bonus',
    title: 'Thưởng tuần',
    time: '08:00 AM • Thứ hai',
    amount: 200000,
    icon: 'card-giftcard',
  },
]

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

  useEffect(() => {
    fetchWalletData()
  }, [])

  const fetchWalletData = async () => {
    try {
      setLoading(true)
      const [balanceData, statsData, transactionsData] = await Promise.all([
        walletService.getBalance(),
        walletService.getStats(),
        walletService.getTransactions(10),
      ])

      setBalance(balanceData.balance)
      setPending(balanceData.pending)
      setStats(statsData)
      setTransactions(transactionsData)
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải dữ liệu ví')
    } finally {
      setLoading(false)
    }
  }

  const maxAmount = Math.max(...mockDailyData.map((d) => d.amount))

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

          <Text style={styles.balanceAmount}>
            {balance.toLocaleString('vi-VN')}đ
          </Text>
          <Text style={styles.pendingAmount}>
            Chế độ: {pending.toLocaleString('vi-VN')}đ
          </Text>

          <View style={styles.balanceActions}>
            <TouchableOpacity 
              style={styles.withdrawBtn}
              onPress={() => navigation?.navigate('Topup')}
            >
              <MaterialIcons name="add-circle-outline" size={18} color={COLORS.text} />
              <Text style={styles.withdrawBtnText}>Nạp tiền</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.withdrawBtn}
              onPress={() => navigation?.navigate('Withdraw')}
            >
              <MaterialIcons name="wallet" size={18} color={COLORS.text} />
              <Text style={styles.withdrawBtnText}>Rút tiền</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn}>
              <MaterialIcons name="more-vert" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
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
              <Text style={styles.chartTotalLabel}>Tổng</Text>
              <Text style={styles.chartTotalValue}>
                {(mockDailyData.reduce((sum, d) => sum + d.amount, 0) / 1000000).toFixed(1)}tr
              </Text>
            </View>
          </View>

          <View style={styles.chart}>
            {mockDailyData.map((item, index) => {
              const height = (item.amount / maxAmount) * 160
              const isHighest = item.amount === maxAmount
              return (
                <View key={index} style={styles.barContainer}>
                  <View style={styles.barWrapper}>
                    {isHighest && (
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
            })}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <StatCard
            icon="local-taxi"
            iconBg="#ff6b2620"
            value={stats.tripCount.toString()}
            label="CHUYẾN XE"
          />
          <StatCard
            icon="star"
            iconBg="#ffb80020"
            value={stats.avgRating.toFixed(1)}
            label="ĐÁNH GIÁ"
          />
          <StatCard
            icon="card-giftcard"
            iconBg="#10b98120"
            value={`${(stats.bonusAmount / 1000).toFixed(0)}k`}
            label="THƯỞNG"
          />
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
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -2,
  },
  balanceCurrency: {
    fontSize: 20,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    marginLeft: 6,
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
