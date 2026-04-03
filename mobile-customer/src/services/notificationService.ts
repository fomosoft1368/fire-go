import { apiClient } from './apiClient'

export interface Notification {
  _id: string
  title: string
  message: string
  type: string
  description?: string
  actionUrl?: string
  channels: string[]
  isRead: boolean
  sentAt?: string
  createdAt?: string
  driverId?: string
  customerId?: string
}

export interface NotificationsResponse {
  data: Notification[]
  total: number
}

class NotificationService {
  private token: string | null = null

  setToken(token: string) {
    this.token = token
  }

  async getNotifications(limit: number = 20, skip: number = 0, type?: string) {
    try {
      const params: any = { limit, skip }
      if (type) params.type = type

      const response = await apiClient.get(`/notifications/customer`, {
        params,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        timeout: 10000,
      })
      return response.data
    } catch (error: any) {
      console.error('Get notifications error:', error.message || error)
      return { data: [], total: 0 }
    }
  }

  async getUnreadCount() {
    try {
      const response = await apiClient.get(`/notifications/unread/count`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        timeout: 10000,
      })
      return response.data.unreadCount || 0
    } catch (error: any) {
      console.error('Get unread count error:', error.message || error)
      return 0
    }
  }

  async markAsRead(notificationId: string) {
    try {
      const response = await apiClient.patch(
        `/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          timeout: 10000,
        }
      )
      return response.data
    } catch (error: any) {
      console.error('Mark as read error:', error.message || error)
      throw error
    }
  }

  async markAllAsRead() {
    try {
      const response = await apiClient.patch(
        `/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
          timeout: 10000,
        }
      )
      return response.data
    } catch (error: any) {
      console.error('Mark all as read error:', error.message || error)
      throw error
    }
  }

  async deleteNotification(notificationId: string) {
    try {
      const response = await apiClient.delete(`/notifications/${notificationId}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        timeout: 10000,
      })
      return response.data
    } catch (error: any) {
      console.error('Delete notification error:', error.message || error)
      throw error
    }
  }
}

export const notificationService = new NotificationService()
