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
  Share,
  Animated,
  Linking,
} from 'react-native'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
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

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `${notification.title}\n\n${notification.message}`,
        title: notification.title,
      })
    } catch (error) {
      console.error('Share error:', error)
    }
  }, [notification])

  const getNotificationIcon = useCallback(() => {
    const type = notification.type?.toLowerCase() || ''
    if (type.includes('ride')) return 'directions-car'
    if (type.includes('delivery')) return 'local-shipping'
    if (type.includes('payment') || type.includes('payment')) return 'account-balance-wallet'
    if (type.includes('rating')) return 'star'
    if (type.includes('promotion')) return 'local-offer'
    return 'notifications'
  }, [notification.type])

  const getNotificationColor = useCallback(() => {
    const type = notification.type?.toLowerCase() || ''
    if (type.includes('ride')) return '#3b82f6'
    if (type.includes('delivery')) return '#10b981'
    if (type.includes('payment')) return '#8b5cf6'
    if (type.includes('promotion')) return '#f59e0b'
    if (type.includes('rating')) return '#ec4899'
    return '#6366f1'
  }, [notification.type])

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header Gradient */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông báo</Text>
        <TouchableOpacity 
          onPress={handleShare}
          style={styles.headerButton}
        >
          <Ionicons name="share-social" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Notification Icon Card */}
        <View style={[styles.iconCard, { backgroundColor: getNotificationColor() + '15' }]}>
          <View 
            style={[
              styles.iconContainer, 
              { backgroundColor: getNotificationColor() }
            ]}
          >
            <MaterialIcons 
              name={getNotificationIcon() as any} 
              size={40} 
              color="#fff" 
            />
          </View>
        </View>

        {/* Main Content Card */}
        <View style={[styles.contentCard, { backgroundColor: colors.card }]}>
          {/* Title & Status */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text, flex: 1 }]}>
                {notification.title}
              </Text>
              {!notification.isRead && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>Mới</Text>
                </View>
              )}
            </View>
            <Text style={[styles.time, { color: colors.textSecondary }]}>
              {formatDate(notification.sentAt || notification.createdAt)}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          {/* Message */}
          <View style={styles.messageSection}>
            <Text style={[styles.message, { color: colors.text }]}>
              {notification.message}
            </Text>
          </View>

          {/* Description */}
          {notification.description && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.descriptionSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  📌 Chi tiết thêm
                </Text>
                <View style={[styles.descriptionBox, { backgroundColor: colors.background }]}>
                  <Text style={[styles.description, { color: colors.text }]}>
                    {notification.description}
                  </Text>
                </View>
              </View>
            </>
          )}

          {/* Channels */}
          {notification.channels && notification.channels.length > 0 && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.channelsSection}>
                <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  📨 Kênh gửi
                </Text>
                <View style={styles.channelsContainer}>
                  {notification.channels.map((channel, index) => (
                    <View
                      key={index}
                      style={[
                        styles.channelBadge,
                        {
                          backgroundColor: getNotificationColor() + '20',
                          borderColor: getNotificationColor(),
                        },
                      ]}
                    >
                      <Ionicons 
                        name={
                          channel.toLowerCase() === 'push'
                            ? 'notifications'
                            : channel.toLowerCase() === 'email'
                            ? 'mail'
                            : 'chat-bubble'
                        }
                        size={14}
                        color={getNotificationColor()}
                      />
                      <Text style={[styles.channelText, { color: getNotificationColor() }]}>
                        {channel}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </>
          )}
        </View>

        {/* Action Button */}
        {notification.actionUrl && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: getNotificationColor() }]}
              onPress={() => {
                const url = notification.actionUrl
                if (url?.startsWith('http')) {
                  Linking.openURL(url).catch(() => 
                    Alert.alert('Lỗi', 'Không thể mở liên kết')
                  )
                } else {
                  Alert.alert('Thông báo', 'Mở: ' + url)
                }
              }}
            >
              <Text style={styles.actionButtonText}>Xem chi tiết</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {/* Delete Button */}
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.danger }]}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.danger} />
          ) : (
            <>
              <MaterialIcons name="delete-outline" size={20} color={colors.danger} />
              <Text style={[styles.deleteButtonText, { color: colors.danger }]}>
                Xóa thông báo
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
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
    paddingVertical: SPACING.lg,
    paddingTop: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },

  // Icon Card
  iconCard: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    borderRadius: 20,
    marginBottom: SPACING.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },

  // Content Card
  contentCard: {
    borderRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  // Title Section
  titleSection: {
    marginBottom: SPACING.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 12,
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  time: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // Message Section
  messageSection: {
    marginVertical: SPACING.md,
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: -0.2,
    fontWeight: '500',
  },

  // Description Section
  descriptionSection: {
    marginVertical: SPACING.md,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: SPACING.md,
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  descriptionBox: {
    borderRadius: 12,
    padding: SPACING.md,
    borderLeftWidth: 4,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: -0.2,
  },

  // Channels Section
  channelsSection: {
    marginVertical: SPACING.md,
  },
  channelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  channelBadge: {
    flexDirection: 'row',
    borderRadius: 12,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  channelText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Divider
  divider: {
    height: 1,
    marginVertical: SPACING.md,
  },

  // Action Buttons
  actionButton: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.3,
  },
  deleteButton: {
    flexDirection: 'row',
    borderWidth: 2,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  deleteButtonText: {
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.3,
  },

  // Spacing
  bottomSpacing: {
    height: 20,
  },
})

export default NotificationDetailScreen
