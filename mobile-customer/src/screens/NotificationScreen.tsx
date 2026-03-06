import React, { useEffect, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { RootState } from '../redux/store'
import { notificationService, Notification } from '../services/notificationService'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'

type NotificationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Notifications'>

const NotificationsScreen = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>()
  const token = useSelector((state: RootState) => state.auth.token)

  const [notifications, setNotifications] = React.useState<Notification[]>([])
  const [loading, setLoading] = React.useState(true)
  const [refreshing, setRefreshing] = React.useState(false)

  useEffect(() => {
    if (token) {
      notificationService.setToken(token)
    }
  }, [token])

  // Fetch notifications when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchNotifications()
    }, [])
  )

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const response = await notificationService.getNotifications(50, 0)
      const data = (response.data || []).sort((a: Notification, b: Notification) => {
        const dateA = new Date(a.sentAt || a.createdAt || 0).getTime()
        const dateB = new Date(b.sentAt || b.createdAt || 0).getTime()
        return dateB - dateA // Newest first
      })
      setNotifications(data)
    } catch (error) {
      console.error('Fetch notifications error:', error)
      Alert.alert('Lỗi', 'Không thể tải thông báo')
    } finally {
      setLoading(false)
    }
  }, [])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    try {
      await fetchNotifications()
    } finally {
      setRefreshing(false)
    }
  }, [fetchNotifications])

  const handleOpenDetail = async (notification: Notification) => {
    // Navigate to detail screen
    navigation.navigate('NotificationDetailScreen', {
      notification,
      onDelete: () => {
        setNotifications(prev => prev.filter(n => n._id !== notification._id))
      },
    })
  }

  const getNotificationIcon = (type: string) => {
    const iconMap: { [key: string]: string } = {
      'ride': 'directions-car',
      'delivery': 'local-shipping',
      'payment': 'payment',
      'promotion': 'local-offer',
      'system': 'info',
      'booking': 'event-note',
      'rating': 'star',
    }
    return iconMap[type] || 'notifications'
  }

  const getNotificationColor = (type: string) => {
    const colorMap: { [key: string]: string } = {
      'ride': '#10b981',
      'delivery': '#f59e0b',
      'payment': '#6366f1',
      'promotion': '#ef4444',
      'system': '#64748b',
      'booking': '#FF6B35',
      'rating': '#fbbf24',
    }
    return colorMap[type] || '#FF6B35'
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
      if (diffMins < 60) return `${diffMins}m`
      if (diffHours < 24) return `${diffHours}h`
      if (diffDays < 7) return `${diffDays}d`

      return date.toLocaleDateString('vi-VN')
    } catch {
      return 'Vừa xong'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#FF6B35" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Đang tải thông báo...</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={({ item }) => {
            const notificationColor = getNotificationColor(item.type)
            const notificationIcon = getNotificationIcon(item.type)
            
            return (
              <TouchableOpacity
                style={[
                  styles.notificationItem,
                  !item.isRead && styles.notificationItemUnread,
                ]}
                onPress={() => handleOpenDetail(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: notificationColor + '15' }]}>
                  <MaterialIcons 
                    name={notificationIcon as any} 
                    size={24} 
                    color={notificationColor} 
                  />
                </View>
                <View style={styles.contentContainer}>
                  <View style={styles.titleRow}>
                    <Text style={styles.title} numberOfLines={2}>
                      {item.title}
                    </Text>
                    {!item.isRead && <View style={styles.unreadBadge} />}
                  </View>
                  {item.message && (
                    <Text style={styles.message} numberOfLines={2}>
                      {item.message}
                    </Text>
                  )}
                  <View style={styles.footer}>
                    <MaterialIcons name="schedule" size={14} color="#94a3b8" />
                    <Text style={styles.time}>
                      {formatDate(item.sentAt || item.createdAt)}
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={20} color="#cbd5e1" />
              </TouchableOpacity>
            )
          }}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconBox}>
                <MaterialIcons name="notifications-none" size={64} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyTitle}>Chưa có thông báo</Text>
              <Text style={styles.emptyText}>
                Các thông báo quan trọng sẽ hiển thị ở đây
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF6B35"
              colors={['#FF6B35']}
            />
          }
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    paddingTop: 50,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF3EE',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  listContainer: {
    padding: 16,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  notificationItemUnread: {
    backgroundColor: '#FFF9F5',
    borderColor: '#FFD4B8',
    borderWidth: 1.5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contentContainer: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    lineHeight: 20,
    letterSpacing: -0.2,
  },
  unreadBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B35',
  },
  message: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  time: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 20,
  },
})

export default NotificationsScreen
