import axios from 'axios'

const API_BASE = 'http://192.168.1.14:3000'

// Create axios instance with timeout
const axiosInstance = axios.create({
  baseURL: API_BASE,
  timeout: 10000, // 10 second timeout
})

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

      const response = await axiosInstance.get(`/api/notifications/customer`, {
        params,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        timeout: 10000,
      })
      return response.data
    } catch (error: any) {
      console.error('Get notifications error:', error.message || error)
      // Return empty response instead of throwing
      return { data: [], total: 0 }
    }
  }

  async getUnreadCount() {
    try {
      const response = await axiosInstance.get(`/api/notifications/unread/count`, {
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        timeout: 10000,
      })
      return response.data.unreadCount || 0
    } catch (error: any) {
      console.error('Get unread count error:', error.message || error)
      // Return 0 instead of throwing
      return 0
    }
  }

  async markAsRead(notificationId: string) {
    try {
      const response = await axiosInstance.patch(
        `/api/notifications/${notificationId}/read`,
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
      const response = await axiosInstance.patch(
        `/api/notifications/read-all`,
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
      const response = await axiosInstance.delete(`/api/notifications/${notificationId}`, {
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
