import React, { useCallback, useEffect, useState } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS, COLORS_DARK, COLORS_LIGHT } from '../constants'
import { notificationService } from '../services/notificationService'
import type { Notification } from '../services/notificationService'
import { RootState } from '../redux/store'

interface RouteParams {
  notification: Notification
  onDelete?: () => void
}

const NotificationDetailScreen = () => {
  const navigation = useNavigation()
  const route = useRoute()
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  
  const { notification, onDelete } = route.params as RouteParams
  const [deleting, setDeleting] = useState(false)

  // Mark as read when viewing the detail
  useEffect(() => {
    if (!notification.isRead) {
      const markAsRead = async () => {
        try {
          await notificationService.markAsRead(notification._id)
        } catch (error) {
          console.error('Mark as read error:', error)
        }
      }
      markAsRead()
    }
  }, [notification._id, notification.isRead])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Vừa xong'
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return 'Vừa xong'
      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Vừa xong'
    }
  }

  const handleDelete = useCallback(async () => {
    Alert.alert('Xóa thông báo', 'Bạn có chắc chắn muốn xóa thông báo này?', [
      {
        text: 'Hủy',
        onPress: () => {},
        style: 'cancel',
      },
      {
        text: 'Xóa',
        onPress: async () => {
          try {
            setDeleting(true)
            await notificationService.deleteNotification(notification._id)
            if (onDelete) {
              onDelete()
            }
            navigation.goBack()
          } catch (error) {
            Alert.alert('Lỗi', 'Không thể xóa thông báo')
            console.error('Delete error:', error)
          } finally {
            setDeleting(false)
          }
        },
        style: 'destructive',
      },
    ])
  }, [notification._id, onDelete, navigation])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <View style={[styles.header, { backgroundColor: colors.bgSecondary, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Chi tiết</Text>
        <TouchableOpacity onPress={handleDelete} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <MaterialIcons name="delete" size={24} color={colors.danger} />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={[styles.content, { backgroundColor: colors.bg }]}>
        <Text style={[styles.title, { color: colors.text }]}>{notification.title}</Text>
        <Text style={[styles.time, { color: colors.textSecondary }]}>
          {formatDate(notification.sentAt || notification.createdAt)}
        </Text>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        <Text style={[styles.message, { color: colors.text }]}>{notification.message}</Text>

        {notification.description && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Chi tiết thêm</Text>
            <Text style={[styles.description, { color: colors.text }]}>{notification.description}</Text>
          </>
        )}

        {notification.actionUrl && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                Alert.alert('Thông báo', 'Mở URL: ' + notification.actionUrl)
              }}
            >
              <Text style={styles.actionButtonText}>Xem chi tiết</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {notification.channels && notification.channels.length > 0 && (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Kênh gửi</Text>
            <View style={styles.channelsContainer}>
              {notification.channels.map((channel, index) => (
                <View
                  key={index}
                  style={[
                    styles.channelBadge,
                    {
                      backgroundColor: colors.primaryLight,
                      borderColor: colors.primary,
                    },
                  ]}
                >
                  <Text style={[styles.channelText, { color: colors.primary }]}>
                    {channel}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
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
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    lineHeight: 32,
  },
  time: {
    fontSize: 13,
    marginBottom: SPACING.md,
  },
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  actionButton: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  channelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  channelBadge: {
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderWidth: 1,
  },
  channelText: {
    fontSize: 12,
    fontWeight: '600',
  },
  spacing: {
    height: 30,
  },
})

export default NotificationDetailScreen
