import React, { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert
} from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { COLORS, SPACING } from '../constants'
import { bonusService } from '../services/bonusService'

const PERIOD_LABELS: Record<string, string> = {
  daily: 'Hàng ngày',
  weekly: 'Hàng tuần',
  monthly: 'Hàng tháng',
  yearly: 'Hàng năm',
}

const PERIOD_COLORS: Record<string, [string, string]> = {
  daily: ['#10b981', '#059669'],
  weekly: ['#3b82f6', '#2563eb'],
  monthly: ['#8b5cf6', '#7c3aed'],
  yearly: ['#f59e0b', '#d97706'],
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending: { label: 'Chờ duyệt', color: '#d97706', bg: '#fef3c7', icon: 'hourglass-empty' },
  approved: { label: 'Đã nhận', color: '#059669', bg: '#d1fae5', icon: 'check-circle' },
  rejected: { label: 'Từ chối', color: '#dc2626', bg: '#fee2e2', icon: 'cancel' },
}

// ==================== Animated Progress Bar ====================
const ProgressBar: React.FC<{ progress: number; colors: [string, string] }> = ({ progress, colors }) => {
  const width = Math.min(100, Math.max(0, progress))
  return (
    <View style={styles.progressTrack}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.progressFill, { width: `${width}%` as any }]}
      />
    </View>
  )
}

// ==================== Bonus Rule Card ====================
const BonusCard: React.FC<{
  item: any
  onClaim: () => void
  claiming: boolean
}> = ({ item, onClaim, claiming }) => {
  const periodColors = PERIOD_COLORS[item.period] || ['#64748b', '#475569']
  const isEligible = item.isEligible
  const claimStatus = item.claimStatus

  return (
    <View style={styles.card}>
      {/* Period badge + Amount */}
      <View style={styles.cardHeader}>
        <LinearGradient
          colors={periodColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.periodBadge}
        >
          <Text style={styles.periodText}>{PERIOD_LABELS[item.period] || item.period}</Text>
        </LinearGradient>
        <View style={styles.amountContainer}>
          <Text style={styles.amountValue}>
            {(item.bonusAmount || 0).toLocaleString('vi-VN')}
          </Text>
          <Text style={styles.amountCurrency}>đ</Text>
        </View>
      </View>

      {/* Name + description */}
      <Text style={styles.cardTitle}>{item.rule?.name || 'Thưởng'}</Text>
      {item.rule?.description ? (
        <Text style={styles.cardDesc}>{item.rule.description}</Text>
      ) : null}

      {/* Progress */}
      <View style={styles.progressSection}>
        <View style={styles.progressLabelRow}>
          <View style={styles.progressLabelLeft}>
            <MaterialIcons name="local-taxi" size={16} color={periodColors[0]} />
            <Text style={styles.progressLabel}>Tiến độ</Text>
          </View>
          <Text style={[styles.progressCount, { color: isEligible ? '#059669' : COLORS.primary }]}>
            {item.tripCount}/{item.requiredTrips} chuyến
          </Text>
        </View>
        <ProgressBar progress={item.progress} colors={periodColors} />
        <Text style={styles.progressPercent}>{item.progress}%</Text>
      </View>

      {/* Status / Claim button */}
      <View style={styles.cardFooter}>
        {claimStatus ? (
          <View>
            <View style={[styles.statusBadge, { backgroundColor: STATUS_CONFIG[claimStatus]?.bg }]}>
              <MaterialIcons
                name={STATUS_CONFIG[claimStatus]?.icon as any}
                size={16}
                color={STATUS_CONFIG[claimStatus]?.color}
              />
              <Text style={[styles.statusLabel, { color: STATUS_CONFIG[claimStatus]?.color }]}>
                {STATUS_CONFIG[claimStatus]?.label}
              </Text>
            </View>
            {claimStatus === 'rejected' && item.rejectionReason && (
              <View style={styles.rejectionBox}>
                <Text style={styles.rejectionTitle}>Lý do từ chối:</Text>
                <Text style={styles.rejectionText}>{item.rejectionReason}</Text>
              </View>
            )}
          </View>
        ) : isEligible ? (
          <TouchableOpacity
            style={[styles.claimBtn, claiming && styles.claimBtnDisabled]}
            onPress={onClaim}
            disabled={claiming}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#10b981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.claimBtnGradient}
            >
              {claiming ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="card-giftcard" size={20} color="#fff" />
                  <Text style={styles.claimBtnText}>Nhận thưởng</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.lockedHint}>
            <MaterialIcons name="lock-outline" size={16} color="#94a3b8" />
            <Text style={styles.lockedText}>
              Còn {Math.max(0, item.requiredTrips - item.tripCount)} chuyến nữa để mở khóa
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ==================== Main Screen ====================
export default function BonusScreen({ navigation }: any) {
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)
  const [progressData, setProgressData] = useState<any[]>([])
  const [activeFilter, setActiveFilter] = useState<string>('all')

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const data = await bonusService.getDriverProgress()
      setProgressData(Array.isArray(data) ? data : [])
    } catch (err: any) {
      console.error('[BonusScreen] Load error:', err)
      Alert.alert('Lỗi', err.message || 'Không thể tải dữ liệu thưởng')
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      loadData()
    }, [loadData])
  )

  const handleClaim = async (item: any) => {
    const ruleId = item.rule?._id
    if (!ruleId) return

    Alert.alert(
      'Xác nhận nhận thưởng',
      `Bạn có muốn gửi yêu cầu nhận thưởng "${item.rule?.name}" trị giá ${(item.bonusAmount || 0).toLocaleString('vi-VN')}đ không?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi yêu cầu',
          style: 'default',
          onPress: async () => {
            try {
              setClaiming(ruleId)
              await bonusService.createClaim(ruleId)
              Alert.alert('✅ Thành công', 'Yêu cầu nhận thưởng đã được gửi. Admin sẽ xem xét và duyệt sớm nhất!')
              loadData()
            } catch (err: any) {
              Alert.alert('Lỗi', err.message || 'Không thể gửi yêu cầu thưởng')
            } finally {
              setClaiming(null)
            }
          },
        },
      ]
    )
  }

  const filterOptions = [
    { key: 'all', label: 'Tất cả' },
    { key: 'daily', label: 'Ngày' },
    { key: 'weekly', label: 'Tuần' },
    { key: 'monthly', label: 'Tháng' },
    { key: 'yearly', label: 'Năm' },
  ]

  const filteredData = activeFilter === 'all'
    ? progressData
    : progressData.filter(item => item.period === activeFilter)

  const earnedCount = progressData.filter(i => i.claimStatus === 'approved').length
  const pendingCount = progressData.filter(i => i.claimStatus === 'pending').length
  const eligibleCount = progressData.filter(i => i.isEligible && !i.claimStatus).length

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Thưởng & Ưu đãi</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thưởng & Ưu đãi</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={loadData}>
          <MaterialIcons name="refresh" size={22} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Hero Banner */}
        <LinearGradient
          colors={['#FF8A3D', '#FF6B00', '#E85D00']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroBanner}
        >
          <View style={styles.heroDecor1} />
          <View style={styles.heroDecor2} />
          <View style={styles.heroContent}>
            <Text style={styles.heroEmoji}>🎁</Text>
            <View>
              <Text style={styles.heroTitle}>Chương trình thưởng</Text>
              <Text style={styles.heroSub}>Hoàn thành chỉ tiêu để nhận thưởng hấp dẫn!</Text>
            </View>
          </View>
          {/* Quick Stats */}
          <View style={styles.heroStats}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNum}>{eligibleCount}</Text>
              <Text style={styles.heroStatLabel}>Sẵn nhận</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNum}>{pendingCount}</Text>
              <Text style={styles.heroStatLabel}>Chờ duyệt</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNum}>{earnedCount}</Text>
              <Text style={styles.heroStatLabel}>Đã nhận</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Filter Chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContainer}
        >
          {filterOptions.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, activeFilter === f.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Text style={[styles.filterChipText, activeFilter === f.key && styles.filterChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Bonus Cards */}
        <View style={styles.cardsContainer}>
          {filteredData.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyEmoji}>🎯</Text>
              <Text style={styles.emptyTitle}>Không có thưởng nào</Text>
              <Text style={styles.emptySub}>Hiện chưa có chương trình thưởng cho loại này</Text>
            </View>
          ) : (
            filteredData.map((item, idx) => (
              <BonusCard
                key={item.rule?._id || idx}
                item={item}
                onClaim={() => handleClaim(item)}
                claiming={claiming === item.rule?._id}
              />
            ))
          )}
        </View>

        {/* Info note */}
        <View style={styles.infoNote}>
          <MaterialIcons name="info-outline" size={18} color="#64748b" />
          <Text style={styles.infoText}>
            Tiền thưởng sẽ được cộng trực tiếp vào ví của bạn sau khi admin duyệt yêu cầu.
          </Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.lg,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtn: {
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
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  loadingText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '500',
  },
  // Hero Banner
  heroBanner: {
    margin: SPACING.xl,
    borderRadius: 24,
    padding: SPACING.xl,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
  },
  heroDecor1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  heroDecor2: {
    position: 'absolute',
    bottom: -30,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  heroEmoji: {
    fontSize: 48,
    lineHeight: 56,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
    fontWeight: '500',
  },
  heroStats: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: SPACING.md,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatNum: {
    fontSize: 24,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  heroStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  // Filter Chips
  filtersContainer: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    marginRight: SPACING.sm,
  },
  filterChipActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  // Cards
  cardsContainer: {
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: SPACING.xl,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: SPACING.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  periodBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
  },
  periodText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#059669',
    letterSpacing: -1,
  },
  amountCurrency: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  cardDesc: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: SPACING.md,
    fontWeight: '500',
  },
  // Progress
  progressSection: {
    marginBottom: SPACING.lg,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: SPACING.lg,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  progressLabelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  progressCount: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    textAlign: 'right',
  },
  // Card Footer
  cardFooter: {
    marginTop: SPACING.xs,
  },
  claimBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  claimBtnDisabled: {
    opacity: 0.65,
  },
  claimBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: 14,
    borderRadius: 14,
  },
  claimBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    marginBottom: SPACING.sm,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  rejectionBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 3,
    borderLeftColor: '#dc2626',
  },
  rejectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: 13,
    color: '#7f1d1d',
    lineHeight: 18,
    fontWeight: '500',
  },
  lockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.sm,
  },
  lockedText: {
    fontSize: 13,
    color: '#94a3b8',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  // Empty & Info
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: SPACING.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: SPACING.sm,
  },
  emptySub: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    padding: SPACING.lg,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
    fontWeight: '500',
  },
})
