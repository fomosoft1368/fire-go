import { API_BASE_URL } from '../constants'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'

// Tạo axios instance với config mặc định
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
})

// Interceptor để tự động thêm token vào header - RẤT QUAN TRỌNG
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken')
    console.log('[Axios Interceptor] Request to:', config.url, 'hasToken:', !!token)
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('[Axios Interceptor] Token added to header, length:', token.length)
    } else {
      console.warn('[Axios Interceptor] NO TOKEN FOUND IN STORAGE!')
    }
    
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Interceptor để handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('[Axios Interceptor] Response error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
    })
    return Promise.reject(error)
  }
)

export const messageService = {
  /**
   * Gửi tin nhắn
   */
  // async sendMessage(
  //   tripId: string,
  //   text: string,
  //   senderType: 'customer' | 'driver',
  //   tripType: 'ride' | 'delivery' | 'combinedtrip' = 'ride'
  // ) {
  //   try {
  //     const token = await AsyncStorage.getItem('authToken')

  //     if (!token) {
  //       throw new Error('No auth token found. Please login again.')
  //     }

  //     if (!tripId || !text.trim()) {
  //       throw new Error('TripId and text are required')
  //     }

  //     console.log('[MessageService] Sending message:', {
  //       tripId,
  //       tripType,
  //       textLength: text.length,
  //       senderType,
  //       tokenLength: token?.length,
  //     })

  //     const messageData: any = {
  //       text,
  //       senderType,
  //       type: 'text',
  //     }

  //     if (tripType === 'ride') {
  //       messageData.rideId = tripId
  //     } else {
  //       messageData.deliveryId = tripId
  //     }

  //     const response = await apiClient.post(
  //       '/messages',
  //       messageData
  //     )

  //     console.log('[MessageService] Message sent successfully:', {
  //       messageId: response.data.data?._id,
  //       tripId,
  //       tripType,
  //       status: response.status,
  //     })

  //     return response.data.data
  //   } catch (error: any) {
  //     console.error('[MessageService] Send message error:', {
  //       message: error.message,
  //       response: error.response?.data,
  //       status: error.response?.status,
  //     })
  //     throw error
  //   }
  // },
async sendMessage(
  tripId: string,
  text: string,
  senderType: 'customer' | 'driver',
  tripType: 'ride' | 'delivery' | 'combinedtrip'
) {
  try {
    const token = await AsyncStorage.getItem('authToken')

    if (!token) {
      throw new Error('No auth token found. Please login again.')
    }

    if (!tripId || !text.trim()) {
      throw new Error('TripId and text are required')
    }

    console.log('[MessageService] Sending message:', {
      tripId,
      tripType,
      textLength: text.length,
      senderType,
      tokenLength: token?.length,
    })

    const messageData: any = {
      text,
      senderType,
      type: 'text',
    }

    // Fix: Handle all trip types correctly
    if (tripType === 'ride') {
      messageData.rideId = tripId
    } else if (tripType === 'delivery') {
      messageData.deliveryId = tripId
    } else if (tripType === 'combinedtrip') {
      messageData.combinedTripId = tripId // ← Fix: Thêm field combinedTripId
    }

    const response = await apiClient.post(
      '/messages',
      messageData
    )

    console.log('[MessageService] Message sent successfully:', {
      messageId: response.data.data?._id,
      tripId,
      tripType,
      status: response.status,
    })

    return response.data.data
  } catch (error: any) {
    console.error('[MessageService] Send message error:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status,
    })
    throw error
  }
},
  /**
   * Lấy danh sách tin nhắn
   */
  async getMessagesByTrip(
    tripId: string,
    tripType: 'ride' | 'delivery' | 'combinedtrip',
    limit: number = 50,
    skip: number = 0
  ) {
    try {
      const token = await AsyncStorage.getItem('authToken')

      if (!token) {
        throw new Error('No auth token found. Please login again.')
      }

      if (!tripId) {
        throw new Error('TripId is required')
      }

      console.log('[MessageService] Fetching messages:', {
        tripId,
        tripType,
        limit,
        skip,
        tokenLength: token?.length,
      })

      const response = await apiClient.get(`/messages/${tripType}/${tripId}`, {
        params: { limit, skip },
      })

      console.log('[MessageService] Retrieved messages:', {
        tripId,
        tripType,
        count: response.data.data?.messages?.length || 0,
        total: response.data.data?.total || 0,
        status: response.status,
      })

      return response.data.data
    } catch (error: any) {
      console.error('[MessageService] Get messages error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        tripId,
        tripType,
      })
      throw error
    }
  },

  /**
   * Lấy tin nhắn mới từ một thời điểm
   */
  async getNewMessages(
    tripId: string,
    tripType: 'ride' | 'delivery' | 'combinedtrip',
    sinceTimestamp?: number
  ) {
    try {
      const token = await AsyncStorage.getItem('authToken')

      if (!token) {
        console.warn('[MessageService] No auth token found')
        return []
      }

      if (!tripId) {
        throw new Error('TripId is required')
      }

      console.log('[MessageService] Polling new messages:', {
        tripId,
        tripType,
        since: sinceTimestamp,
        tokenLength: token?.length,
      })

      const response = await apiClient.get(`/messages/${tripType}/${tripId}/new`, {
        params: sinceTimestamp ? { since: sinceTimestamp } : {},
      })

      console.log('[MessageService] Retrieved new messages:', {
        tripId,
        tripType,
        count: response.data.data?.messages?.length || 0,
        status: response.status,
      })

      return response.data.data?.messages || []
    } catch (error: any) {
      // Handle 401 Unauthorized gracefully - just return empty array and continue
      if (error.response?.status === 401) {
        console.warn('[MessageService] Unauthorized (401), returning empty messages')
        return []
      }

      console.error('[MessageService] Get new messages error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        tripId,
        tripType,
      })
      
      // Return empty array instead of throwing for other errors too
      return []
    }
  },

  /**
   * Đánh dấu tất cả tin nhắn là đã đọc
   */
  async markAsRead(
    tripId: string,
    tripType: 'ride' | 'delivery' | 'combinedtrip'
  ) {
    try {
      const token = await AsyncStorage.getItem('authToken')

      const response = await apiClient.post(
        `/messages/${tripType}/${tripId}/mark-as-read`,
        {}
      )

      console.log('[MessageService] Marked messages as read:', { tripId, tripType })

      return response.data
    } catch (error: any) {
      console.error('[MessageService] Mark as read error:', error.message)
      throw error
    }
  },

  /**
   * Lấy số lượng tin nhắn chưa đọc
   */
  async getUnreadCount(rideId: string) {
    try {
      const token = await AsyncStorage.getItem('authToken')

      const response = await apiClient.get(
        `/messages/ride/${rideId}/unread-count`
      )

      console.log('[MessageService] Unread count:', {
        rideId,
        unreadCount: response.data.data.unreadCount,
      })

      return response.data.data.unreadCount
    } catch (error: any) {
      console.error('[MessageService] Get unread count error:', error.message)
      throw error
    }
  },

  /**
   * Xóa tin nhắn
   */
  async deleteMessage(messageId: string) {
    try {
      const token = await AsyncStorage.getItem('authToken')

      const response = await apiClient.delete(`/messages/${messageId}`)

      console.log('[MessageService] Message deleted:', { messageId })

      return response.data
    } catch (error: any) {
      console.error('[MessageService] Delete message error:', error.message)
      throw error
    }
  },
}
