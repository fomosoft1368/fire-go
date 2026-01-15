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
import { SPACING, BORDER_RADIUS, COLORS_DARK, COLORS_LIGHT } from '../constants'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'

type NotificationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Notifications'>

const NotificationsScreen = () => {
  const navigation = useNavigation<NotificationsScreenNavigationProp>()
  const token = useSelector((state: RootState) => state.auth.token)
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: '#FF6B00', borderBottomColor: colors.border }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: '#fff' }]}>Thông báo</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.notificationItem,
                {
                  backgroundColor: !item.isRead ? colors.bgSecondary : colors.bg,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => handleOpenDetail(item)}
              activeOpacity={0.7}
            >
              {!item.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
              <View style={styles.contentContainer}>
                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={[styles.time, { color: colors.textSecondary }]}>
                  {formatDate(item.sentAt || item.createdAt)}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inbox" size={64} color={colors.textSecondary} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Không có thông báo nào
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    paddingTop: 50,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  listContainer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  notificationItem: {
    flexDirection: 'row',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: SPACING.md,
    flexShrink: 0,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    marginTop: SPACING.md,
    fontWeight: '500',
  },
})

export default NotificationsScreen
