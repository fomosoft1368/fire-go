import React, { useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

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

  const maxAmount = Math.max(...mockDailyData.map((d) => d.amount))

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Quản lý thu nhập</Text>
          <TouchableOpacity>
            <Text style={styles.supportLink}>Hỗ trợ</Text>
          </TouchableOpacity>
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={styles.walletIcon}>
              <MaterialIcons name="account-balance-wallet" size={20} color={COLORS.primary} />
            </View>
            <Text style={styles.walletLabel}>Số dư khả dụng</Text>
          </View>

          <Text style={styles.balanceAmount}>
            {mockEarnings.balance.toLocaleString('vi-VN')}đ
          </Text>
          <Text style={styles.pendingAmount}>
            Chế độ: {mockEarnings.pending.toLocaleString('vi-VN')}đ
          </Text>

          <View style={styles.balanceActions}>
            <TouchableOpacity style={styles.withdrawBtn}>
              <MaterialIcons name="wallet" size={18} color={COLORS.text} />
              <Text style={styles.withdrawBtnText}>Rút tiền</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.moreBtn}>
              <MaterialIcons name="more-vert" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Time Filter */}
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

        {/* Chart */}
        <View style={styles.chartSection}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Biểu đồ thu nhập</Text>
            <View style={styles.percentageBadge}>
              <MaterialIcons name="trending-up" size={14} color={COLORS.success} />
              <Text style={styles.percentageText}>+12%</Text>
            </View>
          </View>

          <View style={styles.chart}>
            {mockDailyData.map((item, index) => {
              const height = (item.amount / maxAmount) * 180
              return (
                <View key={index} style={styles.barContainer}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: item.day === 'T6' ? COLORS.primary : COLORS.darkBorder,
                      },
                    ]}
                  />
                  <Text style={styles.barLabel}>{item.day}</Text>
                </View>
              )
            })}
          </View>

          {/* Max Amount Label */}
          <View style={styles.chartMaxLabel}>
            <Text style={styles.maxAmount}>
              {(maxAmount / 1000000).toFixed(1)}tr
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <StatCard
            icon="local-taxi"
            iconBg="#ff6b2620"
            value="24"
            label="CHUYẾN XE"
          />
          <StatCard
            icon="star"
            iconBg="#ffb80020"
            value="4.9"
            label="ĐÁNH GIÁ"
          />
          <StatCard
            icon="card-giftcard"
            iconBg="#10b98120"
            value="50k"
            label="THƯỞNG"
          />
        </View>

        {/* Transactions */}
        <View style={styles.transactionsSection}>
          <View style={styles.transactionHeader}>
            <Text style={styles.transactionTitle}>Giao dịch gần đây</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllLink}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>

          {mockTransactions.map((transaction) => (
            <TransactionItem key={transaction.id} transaction={transaction} />
          ))}
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
  iconBg: string
  value: string
  label: string
}

const StatCard: React.FC<StatCardProps> = ({ icon, iconBg, value, label }) => (
  <View style={styles.statCard}>
    <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
      <MaterialIcons name={icon as any} size={24} color={COLORS.text} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
)

interface TransactionItemProps {
  transaction: Transaction
}

const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const getIconColor = () => {
    if (transaction.type === 'completed') return COLORS.primary
    if (transaction.type === 'withdrawal') return '#ff6b6b'
    return COLORS.success
  }

  const getIconBg = () => {
    if (transaction.type === 'completed') return COLORS.primary + '20'
    if (transaction.type === 'withdrawal') return '#ff6b6b20'
    return COLORS.success + '20'
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
          transaction.amount > 0
            ? { color: COLORS.success }
            : { color: COLORS.text },
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
    backgroundColor: COLORS.darkBg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    paddingTop: 45,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  supportLink: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  balanceCard: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  walletIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  walletLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  pendingAmount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  withdrawBtn: {
    flex: 1,
    backgroundColor: '#ff6b2d',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  withdrawBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  moreBtn: {
    width: 48,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeFilter: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.darkCard,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  chartSection: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  percentageBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 200,
    marginBottom: SPACING.lg,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  bar: {
    width: '80%',
    borderRadius: BORDER_RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  barLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  chartMaxLabel: {
    position: 'absolute',
    top: 10,
    right: SPACING.lg,
  },
  maxAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    backgroundColor: COLORS.darkBg,
    paddingHorizontal: SPACING.sm,
  },
  statsSection: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  transactionsSection: {
    marginBottom: SPACING.xl,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  seeAllLink: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  success: {
    color: COLORS.success,
  },
})
