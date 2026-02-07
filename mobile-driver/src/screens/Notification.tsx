import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING } from '../constants'

type NotificationType = 'trip' | 'promo' | 'system' | 'earnings'
type FilterType = 'all' | 'trip' | 'promo' | 'system'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  time: string
  timestamp: Date
  read: boolean
  actionLabel?: string
  amount?: number
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'trip',
    title: 'Chuyến đi mới #X892',
    message: 'Bạn có chuyến đi mới từ Quận 1 đến Quận 7. Hành khách đang chờ.',
    time: '5 phút trước',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    read: false,
    actionLabel: 'Xem chi tiết',
  },
  {
    id: '2',
    type: 'earnings',
    title: 'Thu nhập +150.000đ',
    message: 'Chúc mừng! Bạn vừa hoàn thành chuyến đi và nhận 150.000đ',
    time: '15 phút trước',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    read: false,
    amount: 150000,
  },
  {
    id: '3',
    type: 'promo',
    title: '🎁 Khuyến mãi cuối tuần',
    message: 'Nhận thêm 20% thu nhập cho mọi chuyến đi từ 18:00 - 22:00 hôm nay',
    time: '1 giờ trước',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    read: true,
    actionLabel: 'Xem thêm',
  },
  {
    id: '4',
    type: 'trip',
    title: 'Hành khách đã hủy chuyến',
    message: 'Chuyến đi #X891 đã bị hủy bởi hành khách. Phí hủy: 15.000đ',
    time: '2 giờ trước',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    read: true,
  },
  {
    id: '5',
    type: 'system',
    title: 'Cập nhật hệ thống',
    message: 'Phiên bản mới 2.5.0 đã có sẵn. Cập nhật ngay để trải nghiệm tính năng mới',
    time: 'Hôm qua',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
    read: true,
    actionLabel: 'Cập nhật',
  },
  {
    id: '6',
    type: 'earnings',
    title: 'Thưởng tuần +500.000đ',
    message: 'Xuất sắc! Bạn đã hoàn thành 50 chuyến tuần này và nhận thưởng 500.000đ',
    time: 'Hôm qua',
    timestamp: new Date(Date.now() - 26 * 60 * 60 * 1000),
    read: true,
    amount: 500000,
  },
  {
    id: '7',
    type: 'system',
    title: 'Xác minh tài khoản',
    message: 'Tài khoản của bạn đã được xác minh thành công. Chào mừng bạn đến với FireGo!',
    time: '3 ngày trước',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    read: true,
  },
]

export default function NotificationScreen({ navigation }: any) {
  const [filter, setFilter] = useState<FilterType>('all')
  const [notifications, setNotifications] = useState(mockNotifications)

  const filteredNotifications = notifications.filter((notif) => {
    if (filter === 'all') return true
    return notif.type === filter
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'trip':
        return 'local-taxi'
      case 'promo':
        return 'card-giftcard'
      case 'system':
        return 'info'
      case 'earnings':
        return 'account-balance-wallet'
    }
  }

  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'trip':
        return { icon: '#FF6B00', bg: '#fff5eb' }
      case 'promo':
        return { icon: '#8b5cf6', bg: '#ede9fe' }
      case 'system':
        return { icon: '#3b82f6', bg: '#dbeafe' }
      case 'earnings':
        return { icon: '#10b981', bg: '#d1fae5' }
    }
  }

  const groupNotificationsByDate = () => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const groups: { [key: string]: Notification[] } = {
      'Hôm nay': [],
      'Hôm qua': [],
      'Tuần trước': [],
      'Cũ hơn': [],
    }

    filteredNotifications.forEach((notif) => {
      if (notif.timestamp >= today) {
        groups['Hôm nay'].push(notif)
      } else if (notif.timestamp >= yesterday) {
        groups['Hôm qua'].push(notif)
      } else if (notif.timestamp >= lastWeek) {
        groups['Tuần trước'].push(notif)
      } else {
        groups['Cũ hơn'].push(notif)
      }
    })

    return Object.entries(groups).filter(([_, items]) => items.length > 0)
  }

  const renderNotificationItem = (item: Notification) => {
    const colors = getNotificationColor(item.type)

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.notificationItem, !item.read && styles.notificationUnread]}
        onPress={() => {
          markAsRead(item.id)
          navigation?.navigate('NotificationDetail', { notification: item })
        }}
        activeOpacity={0.7}
      >
        <View style={[styles.notificationIcon, { backgroundColor: colors.bg }]}>
          <MaterialIcons name={getNotificationIcon(item.type) as any} size={24} color={colors.icon} />
        </View>

        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>

          <Text style={styles.notificationMessage} numberOfLines={2}>
            {item.message}
          </Text>

          <View style={styles.notificationFooter}>
            <Text style={styles.notificationTime}>{item.time}</Text>
            {item.actionLabel && (
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>{item.actionLabel}</Text>
                <MaterialIcons name="arrow-forward" size={14} color="#FF6B00" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Thông báo</Text>
            {unreadCount > 0 && (
              <Text style={styles.headerSubtitle}>{unreadCount} chưa đọc</Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.markAllButton}
          onPress={markAllAsRead}
          disabled={unreadCount === 0}
        >
          <MaterialIcons
            name="done-all"
            size={24}
            color={unreadCount > 0 ? '#FF6B00' : '#cbd5e1'}
          />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <FilterTab
            label="Tất cả"
            count={notifications.length}
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          <FilterTab
            label="Chuyến xe"
            count={notifications.filter((n) => n.type === 'trip').length}
            active={filter === 'trip'}
            onPress={() => setFilter('trip')}
            icon="local-taxi"
          />
          <FilterTab
            label="Khuyến mãi"
            count={notifications.filter((n) => n.type === 'promo').length}
            active={filter === 'promo'}
            onPress={() => setFilter('promo')}
            icon="card-giftcard"
          />
          <FilterTab
            label="Hệ thống"
            count={notifications.filter((n) => n.type === 'system').length}
            active={filter === 'system'}
            onPress={() => setFilter('system')}
            icon="settings"
          />
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {filteredNotifications.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconBox}>
              <MaterialIcons name="notifications-off" size={64} color="#cbd5e1" />
            </View>
            <Text style={styles.emptyTitle}>Không có thông báo</Text>
            <Text style={styles.emptyMessage}>
              {filter === 'all'
                ? 'Bạn chưa có thông báo nào'
                : 'Không có thông báo trong danh mục này'}
            </Text>
          </View>
        ) : (
          groupNotificationsByDate().map(([dateLabel, items]) => (
            <View key={dateLabel} style={styles.dateGroup}>
              <Text style={styles.dateLabel}>{dateLabel}</Text>
              {items.map((item) => renderNotificationItem(item))}
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

interface FilterTabProps {
  label: string
  count: number
  active: boolean
  onPress: () => void
  icon?: string
}

const FilterTab: React.FC<FilterTabProps> = ({ label, count, active, onPress, icon }) => (
  <TouchableOpacity
    style={[styles.filterTab, active && styles.filterTabActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {icon && (
      <MaterialIcons
        name={icon as any}
        size={18}
        color={active ? '#fff' : '#64748b'}
        style={styles.filterIcon}
      />
    )}
    <Text style={[styles.filterTabText, active && styles.filterTabTextActive]}>
      {label}
    </Text>
    <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
      <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
        {count}
      </Text>
    </View>
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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: '600',
    marginTop: 2,
  },
  markAllButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  filterScroll: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    gap: SPACING.xs,
  },
  filterTabActive: {
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  filterIcon: {
    marginRight: 2,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  filterTabTextActive: {
    color: '#fff',
  },
  filterBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  filterBadgeTextActive: {
    color: '#fff',
  },
  dateGroup: {
    marginTop: SPACING.xl,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xl,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: SPACING.xl,
    marginBottom: SPACING.md,
    borderRadius: 16,
    padding: SPACING.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  notificationUnread: {
    backgroundColor: '#fffbeb',
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B00',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
    marginLeft: SPACING.xs,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: SPACING.sm,
    fontWeight: '500',
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B00',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 3,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
})
