import React from 'react'
import { View, Text, Switch, StyleSheet, TouchableOpacity } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { SPACING } from '../constants'

interface BalanceCardProps {
  amount: number
  dailyAmount: number
  increase: number
  breakdown?: {
    rides: { trips: number; totalFare: number; driverEarnings: number }
    combinedTrips: { trips: number; requests: number; totalFare: number; driverEarnings: number }
    deliveries: { deliveries: number; totalFare: number; driverEarnings: number }
  }
  isOnline: boolean
  onToggleOnline: (value: boolean) => void
  onViewDetails?: () => void
  totalRides?: number
  averageRating?: number
  onlineHours?: number
}

export const BalanceCard: React.FC<BalanceCardProps> = ({
  amount,
  dailyAmount,
  increase,
  breakdown,
  isOnline,
  onToggleOnline,
  onViewDetails,
  totalRides = 0,
  averageRating = 0,
  onlineHours = 0,
}) => {
  // Calculate if we have earnings from each source
  const hasRidesEarnings = (breakdown?.rides?.driverEarnings || 0) > 0
  const hasCombinedEarnings = (breakdown?.combinedTrips?.driverEarnings || 0) > 0
  const hasDeliveryEarnings = (breakdown?.deliveries?.driverEarnings || 0) > 0
  return (
    <View style={styles.cardWrapper}>
      <LinearGradient
        colors={['#FF6B35', '#FF6B35', '#FF6B35']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        {/* Decorative circles */}
        <View style={styles.decorCircle1} />
        <View style={styles.decorCircle2} />
        
        {/* Header with Toggle */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={[styles.statusIndicator, isOnline && styles.statusIndicatorOnline]}>
              <View style={[styles.statusDot, isOnline && styles.statusDotOnline]} />
            </View>
            <View>
              <Text style={styles.statusLabel}>Trạng thái</Text>
              <Text style={styles.statusText}>
                {isOnline ? 'Đang hoạt động' : 'Ngoại tuyến'}
              </Text>
            </View>
          </View>
          <Switch
            value={isOnline}
            onValueChange={onToggleOnline}
            trackColor={{ false: 'rgba(255, 255, 255, 0.25)', true: 'rgba(16, 185, 129, 0.3)' }}
            thumbColor={isOnline ? '#10b981' : '#fff'}
            ios_backgroundColor="rgba(255, 255, 255, 0.25)"
          />
        </View>

        {/* Main Balance */}
        <View style={styles.mainBalanceSection}>
          <View style={styles.balanceHeader}>
            <MaterialIcons name="account-balance-wallet" size={24} color="rgba(255, 255, 255, 0.9)" />
            <Text style={styles.balanceLabel}>Thu nhập hôm nay</Text>
          </View>
          <View style={styles.balanceAmountRow}>
            <Text style={styles.balanceAmount}>{amount.toLocaleString('vi-VN')}</Text>
            <Text style={styles.balanceCurrency}>đ</Text>
          </View>
          <View style={styles.trendRow}>
            <View style={[styles.trendBadge, increase >= 0 ? styles.trendUp : styles.trendDown]}>
              <MaterialIcons 
                name={increase >= 0 ? "trending-up" : "trending-down"} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.trendText}>{Math.abs(increase)}%</Text>
            </View>
            <Text style={styles.trendLabel}>so với hôm qua</Text>
          </View>
          
          {/* Earnings Breakdown Badges */}
          {breakdown && (hasRidesEarnings || hasCombinedEarnings || hasDeliveryEarnings) && (
            <View style={styles.breakdownRow}>
              {hasRidesEarnings && (
                <View style={styles.breakdownBadge}>
                  <MaterialIcons name="directions-car" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.breakdownText}>
                    {(breakdown.rides.driverEarnings || 0).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}
              {hasCombinedEarnings && (
                <View style={styles.breakdownBadge}>
                  <MaterialIcons name="people" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.breakdownText}>
                    {(breakdown.combinedTrips.driverEarnings || 0).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}
              {hasDeliveryEarnings && (
                <View style={styles.breakdownBadge}>
                  <MaterialIcons name="local-shipping" size={14} color="rgba(255, 255, 255, 0.9)" />
                  <Text style={styles.breakdownText}>
                    {(breakdown.deliveries.driverEarnings || 0).toLocaleString('vi-VN')}đ
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <View style={styles.statIconBox}>
              <MaterialIcons name="local-shipping" size={20} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{totalRides}</Text>
              <Text style={styles.statLabel}>Chuyến đi</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconBox}>
              <MaterialIcons name="access-time" size={20} color="#fff" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{onlineHours > 0 ? `${onlineHours.toFixed(1)}h` : '--'}</Text>
              <Text style={styles.statLabel}>Trực tuyến</Text>
            </View>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <View style={styles.statIconBox}>
              <MaterialIcons name="star" size={20} color="#FFD700" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statValue}>{averageRating > 0 ? averageRating.toFixed(1) : '--'}</Text>
              <Text style={styles.statLabel}>Đánh giá</Text>
            </View>
          </View>
        </View>

        {/* Quick Action Hint */}
        <TouchableOpacity 
          style={styles.detailsButton} 
          activeOpacity={0.7}
          onPress={onViewDetails}
        >
          <Text style={styles.detailsText}>Xem chi tiết thu nhập</Text>
          <MaterialIcons name="arrow-forward" size={16} color="rgba(255, 255, 255, 0.9)" />
        </TouchableOpacity>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  cardWrapper: {
    marginHorizontal: SPACING.lg,
    marginTop: 16,
    marginBottom: SPACING.lg,
  },
  card: {
    borderRadius: 24,
    padding: SPACING.xl,
    shadowColor: '#FF6B35',
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
    zIndex: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  statusIndicator: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  statusIndicatorOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  statusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
  },
  statusDotOnline: {
    backgroundColor: '#10b981',
  },
  statusLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
    marginBottom: 2,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  mainBalanceSection: {
    marginBottom: SPACING.xl,
    zIndex: 1,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  balanceAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: SPACING.sm,
  },
  balanceAmount: {
    fontSize: 42,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1.5,
  },
  balanceCurrency: {
    fontSize: 24,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.85)',
    marginLeft: 4,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 20,
    gap: 4,
  },
  trendUp: {
    backgroundColor: 'rgba(16, 185, 129, 0.25)',
  },
  trendDown: {
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
  },
  trendText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '800',
  },
  trendLabel: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.75)',
    fontWeight: '500',
  },
  breakdownRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  breakdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  breakdownText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.95)',
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 16,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    zIndex: 1,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: SPACING.xs,
  },
  detailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    zIndex: 1,
  },
  detailsText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: -0.2,
  },
})
