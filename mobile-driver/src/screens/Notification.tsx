import { useState, useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useFocusEffect } from '@react-navigation/native'
import { RootState } from '../redux/store'
import { notificationService, Notification as ApiNotification } from '../services/notificationService'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING } from '../constants'

interface GroupedNotification {
  title: string
  data: ApiNotification[]
}

export default function NotificationScreen({ navigation }: any) {
  const token = useSelector((state: RootState) => state.auth.token)
  const [notifications, setNotifications] = useState<ApiNotification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (token) {
      notificationService.setToken(token)
    }
  }, [token])

  useFocusEffect(
    useCallback(() => {
      fetchNotifications()
      fetchUnreadCount()
    }, [])
  )

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      console.log('🔍 Fetching notifications with token:', token ? 'Token exists' : 'No token')
      const response = await notificationService.getNotifications(50, 0)
      console.log('📥 Notifications response:', JSON.stringify(response, null, 2))
      const data = (response.data || []).sort((a: ApiNotification, b: ApiNotification) => {
        const dateA = new Date(a.sentAt || a.createdAt || 0).getTime()
        const dateB = new Date(b.sentAt || b.createdAt || 0).getTime()
        return dateB - dateA
      })
      console.log('✅ Sorted notifications count:', data.length)
      setNotifications(data)
    } catch (error) {
      console.error('❌ Fetch notifications error:', error)
      Alert.alert('Lỗi', 'Không thể tải thông báo')
    } finally {
      setLoading(false)
    }
  }, [token])

  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await notificationService.getUnreadCount()
      setUnreadCount(count)
    } catch (error) {
      console.error('Fetch unread count error:', error)
    }
  }, [token])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchNotifications(), fetchUnreadCount()])
    } finally {
      setRefreshing(false)
    }
  }, [fetchNotifications, fetchUnreadCount])

  const handleNotificationPress = async (item: ApiNotification) => {
    // Mark as read if unread
    if (!item.isRead) {
      await handleMarkAsRead(item._id)
    }
    
    // Navigate to detail screen
    navigation?.navigate('NotificationDetail' as never, {
      notification: {
        id: item._id,
        type: item.type,
        title: item.title,
        message: item.message,
        time: formatDate(item.sentAt || item.createdAt),
        details: item.description,
      }
    } as never)
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId)
      setNotifications(prev =>
        prev.map(n => (n._id === notificationId ? { ...n, isRead: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (error) {
      console.error('Mark as read error:', error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await notificationService.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
      setUnreadCount(0)
    } catch (error) {
      console.error('Mark all as read error:', error)
      Alert.alert('Lỗi', 'Không thể đánh dấu tất cả đã đọc')
    }
  }

  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn xóa thông báo này?',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa',
          style: 'destructive',
          onPress: async () => {
            try {
              await notificationService.deleteNotification(notificationId)
              setNotifications(prev => prev.filter(n => n._id !== notificationId))
              const deletedNotif = notifications.find(n => n._id === notificationId)
              if (deletedNotif && !deletedNotif.isRead) {
                setUnreadCount(prev => Math.max(0, prev - 1))
              }
            } catch (error) {
              console.error('Delete notification error:', error)
              Alert.alert('Lỗi', 'Không thể xóa thông báo')
            }
          },
        },
      ]
    )
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Vừa xong'

    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Vừa xong'

      const now = new Date()
      const diffMs = now.getTime() - date.getTime()
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return 'Vừa xong'
      if (diffMins < 60) return `${diffMins} phút trước`
      if (diffHours < 24) return `${diffHours} giờ trước`
      if (diffDays === 1) return 'Hôm qua'
      if (diffDays < 7) return `${diffDays} ngày trước`

      return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    } catch {
      return 'Vừa xong'
    }
  }

  const groupNotificationsByDate = (): GroupedNotification[] => {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

    const groups: { [key: string]: ApiNotification[] } = {
      'Hôm nay': [],
      'Hôm qua': [],
      'Tuần này': [],
      'Cũ hơn': [],
    }

    notifications.forEach(notif => {
      const date = new Date(notif.sentAt || notif.createdAt || 0)
      if (date >= today) {
        groups['Hôm nay'].push(notif)
      } else if (date >= yesterday) {
        groups['Hôm qua'].push(notif)
      } else if (date >= lastWeek) {
        groups['Tuần này'].push(notif)
      } else {
        groups['Cũ hơn'].push(notif)
      }
    })

    return Object.entries(groups)
      .filter(([_, items]) => items.length > 0)
      .map(([title, data]) => ({ title, data }))
  }

  const getNotificationIcon = (type: string): string => {
    const lowerType = type.toLowerCase()
    if (lowerType.includes('ride') || lowerType.includes('trip')) return 'local-taxi'
    if (lowerType.includes('delivery')) return 'local-shipping'
    if (lowerType.includes('promo')) return 'local-offer'
    if (lowerType.includes('earning') || lowerType.includes('payment')) return 'account-balance-wallet'
    if (lowerType.includes('review') || lowerType.includes('rating')) return 'star'
    return 'notifications'
  }

  const getNotificationColor = (type: string): { bg: string; icon: string; border: string } => {
    const lowerType = type.toLowerCase()
    if (lowerType.includes('ride') || lowerType.includes('trip'))
      return { bg: '#FFF4E6', icon: '#FF6B00', border: '#FFE0B2' }
    if (lowerType.includes('delivery'))
      return { bg: '#E0F2FE', icon: '#0284C7', border: '#BAE6FD' }
    if (lowerType.includes('promo'))
      return { bg: '#F3E8FF', icon: '#9333EA', border: '#E9D5FF' }
    if (lowerType.includes('earning') || lowerType.includes('payment'))
      return { bg: '#DCFCE7', icon: '#16A34A', border: '#BBF7D0' }
    if (lowerType.includes('review') || lowerType.includes('rating'))
      return { bg: '#FEF3C7', icon: '#F59E0B', border: '#FDE68A' }
    return { bg: '#F1F5F9', icon: '#64748B', border: '#E2E8F0' }
  }

  const renderNotificationItem = ({ item }: { item: ApiNotification }) => {
    const colors = getNotificationColor(item.type)
    const icon = getNotificationIcon(item.type)

    return (
      <TouchableOpacity
        style={[
          styles.notificationCard,
          !item.isRead && styles.notificationCardUnread,
          { borderLeftColor: colors.icon },
        ]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleDeleteNotification(item._id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: colors.bg }]}>
          <MaterialIcons name={icon as any} size={24} color={colors.icon} />
        </View>

        <View style={styles.contentWrapper}>
          <View style={styles.headerRow}>
            <Text style={styles.notificationTitle} numberOfLines={1}>
              {item.title}
            </Text>
            {!item.isRead && <View style={styles.unreadBadge} />}
          </View>

          {item.message && (
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item.message}
            </Text>
          )}

          <View style={styles.footerRow}>
            <Text style={styles.timeText}>{formatDate(item.sentAt || item.createdAt)}</Text>
            {!item.isRead && (
              <TouchableOpacity
                style={styles.readButton}
                onPress={() => handleMarkAsRead(item._id)}
              >
                <MaterialIcons name="check" size={14} color="#FF6B00" />
                <Text style={styles.readButtonText}>Đánh dấu đã đọc</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  const renderSectionHeader = ({ section }: { section: GroupedNotification }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <View style={styles.sectionLine} />
    </View>
  )

  const groupedData = groupNotificationsByDate()

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

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllButton} onPress={handleMarkAllAsRead}>
            <MaterialIcons name="done-all" size={20} color="#FF6B00" />
            <Text style={styles.markAllText}>Đọc tất cả</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <FlatList
          data={groupedData}
          renderItem={({ item: section }) => (
            <View>
              {renderSectionHeader({ section })}
              {section.data.map(notif => (
                <View key={notif._id}>
                  {renderNotificationItem({ item: notif })}
                </View>
              ))}
            </View>
          )}
          keyExtractor={(_, index) => `section-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <MaterialIcons name="notifications-none" size={64} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>Không có thông báo</Text>
              <Text style={styles.emptyMessage}>
                Bạn chưa có thông báo nào. Các thông báo mới sẽ xuất hiện ở đây.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B00"
              colors={['#FF6B00']}
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? SPACING.md : SPACING.xxl,
    paddingBottom: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FF6B00',
    fontWeight: '600',
    marginTop: 2,
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: '#FFF4E6',
    borderRadius: 20,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF6B00',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 3,
  },
  loadingText: {
    marginTop: SPACING.lg,
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    gap: SPACING.md,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  notificationCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: 16,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#E2E8F0',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationCardUnread: {
    backgroundColor: '#FFFBF5',
    shadowOpacity: 0.08,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  contentWrapper: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  notificationTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
    marginLeft: SPACING.sm,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: SPACING.sm,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  readButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    backgroundColor: '#FFF4E6',
    borderRadius: 12,
  },
  readButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF6B00',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 4,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  emptyMessage: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
    maxWidth: 260,
  },
})
