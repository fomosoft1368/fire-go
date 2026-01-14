import axios from 'axios'

const API_BASE = 'http://192.168.1.18:3000'

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

      const response = await axios.get(`${API_BASE}/api/notifications/customer`, {
        params,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })
      return response.data
    } catch (error) {
      console.error('Get notifications error:', error)
      throw error
    }
  }

  async getUnreadCount() {
    try {
      const response = await axios.get(`${API_BASE}/api/notifications/unread/count`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })
      return response.data.unreadCount
    } catch (error) {
      console.error('Get unread count error:', error)
      return 0
    }
  }

  async markAsRead(notificationId: string) {
    try {
      const response = await axios.patch(
        `${API_BASE}/api/notifications/${notificationId}/read`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Mark as read error:', error)
      throw error
    }
  }

  async markAllAsRead() {
    try {
      const response = await axios.patch(
        `${API_BASE}/api/notifications/read-all`,
        {},
        {
          headers: {
            Authorization: `Bearer ${this.token}`,
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Mark all as read error:', error)
      throw error
    }
  }

  async deleteNotification(notificationId: string) {
    try {
      const response = await axios.delete(`${API_BASE}/api/notifications/${notificationId}`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
      })
      return response.data
    } catch (error) {
      console.error('Delete notification error:', error)
      throw error
    }
  }
}

export const notificationService = new NotificationService()
