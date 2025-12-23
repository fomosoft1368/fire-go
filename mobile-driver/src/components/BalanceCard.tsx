import React from 'react'
import { View, Text, Switch, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

interface BalanceCardProps {
  amount: number
  dailyAmount: number
  increase: number
  isOnline: boolean
  onToggleOnline: (value: boolean) => void
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  amount,
  dailyAmount,
  increase,
  isOnline,
  onToggleOnline,
}) => {
  return (
    <View style={styles.card}>
      {/* Balance Info */}
      <View style={styles.balanceTop}>
        <View>
          <Text style={styles.label}>Thứ hôm nay</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amount}>{amount.toLocaleString('vi-VN')}đ</Text>
            <View style={styles.increaseTag}>
              <MaterialIcons name="trending-up" size={14} color={COLORS.success} />
              <Text style={styles.increaseText}>{increase}%</Text>
            </View>
          </View>
        </View>
        <View>
          <Text style={styles.label}>Từ đơn hôm nay</Text>
          <Text style={styles.subAmount}>{dailyAmount.toLocaleString('vi-VN')}đ</Text>
        </View>
      </View>

      {/* Toggle */}
      <View style={styles.toggleRow}>
        <Text style={styles.toggleLabel}>
          {isOnline ? 'Đang làm việc' : 'Đã dừng'}
        </Text>
        <Switch
          value={isOnline}
          onValueChange={onToggleOnline}
          trackColor={{ false: COLORS.darkBorder, true: COLORS.primary + '50' }}
          thumbColor={isOnline ? COLORS.primary : COLORS.textSecondary}
        />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.primary,
  },
  increaseTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.success + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: SPACING.xs,
  },
  increaseText: {
    fontSize: 12,
    color: COLORS.success,
    fontWeight: '600',
  },
  subAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkBorder,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
})
