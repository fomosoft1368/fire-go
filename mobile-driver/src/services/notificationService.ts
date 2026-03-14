import axios from 'axios'
import { API_BASE_URL } from '../constants/config'

// Create axios instance with timeout
const axiosInstance = axios.create({
  baseURL: API_BASE_URL, // Already includes /api
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

      console.log('📡 Calling /notifications with:', {
        url: `${API_BASE_URL}/notifications`,
        params,
        hasToken: !!this.token,
      })

      const response = await axiosInstance.post(`/notifications`, {}, {
        params,
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        timeout: 10000,
      })
      
      console.log('✅ Response received:', {
        status: response.status,
        dataLength: response.data?.data?.length || 0,
        total: response.data?.total || 0,
      })
      
      return response.data
    } catch (error: any) {
      console.error('❌ Get notifications error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })
      // Return empty response instead of throwing
      return { data: [], total: 0 }
    }
  }

  async getUnreadCount() {
    try {
      const response = await axiosInstance.get(`/notifications/unread/count`, {
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
      const response = await axiosInstance.patch(
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
      const response = await axiosInstance.delete(`/notifications/${notificationId}`, {
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
