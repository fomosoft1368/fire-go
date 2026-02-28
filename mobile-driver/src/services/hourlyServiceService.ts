import axios, { AxiosInstance } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

export interface HourlyRequest {
  _id: string
  customerId: {
    _id: string
    firstName: string
    lastName: string
    phone: string
    avatar?: string
  }
  hours: number
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  address: string
  selectedDate: number
  selectedTime: string
  estimatedPrice: number
  services: Array<{
    name: string
    price: number
    selected: boolean
  }>
  createdAt: string
  distance?: number
}

export interface GetHourlyRequestsResponse {
  success: boolean
  message: string
  data: HourlyRequest[]
}

class HourlyServiceService {
  private api: AxiosInstance
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
    this.api = axios.create({
      baseURL: `${baseURL}/hourly-services`,
      timeout: 10000,
    })

    // Add JWT token to every request
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }

  /**
   * Get pending hourly service requests
   * GET /api/hourly-services/pending
   */
  async getPendingServices(limit: number = 20, skip: number = 0): Promise<HourlyRequest[]> {
    try {
      console.log('[HourlyServiceService] Fetching pending services:', { limit, skip })

      const response = await this.api.get<GetHourlyRequestsResponse>('/pending', {
        params: { limit, skip },
      })

      if (response.data.success) {
        console.log('[HourlyServiceService] Got pending services:', response.data.data.length)
        return response.data.data || []
      } else {
        console.warn('[HourlyServiceService] API returned success=false:', response.data.message)
        return []
      }
    } catch (error: any) {
      console.error('[HourlyServiceService] Error fetching pending services:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
      throw error
    }
  }

  /**
   * Get specific hourly service request details
   * GET /api/hourly-services/:id
   */
  async getServiceDetail(serviceId: string): Promise<HourlyRequest> {
    try {
      console.log('[HourlyServiceService] Fetching service detail:', serviceId)

      const response = await this.api.get<any>(`/${serviceId}`)

      if (response.data.success) {
        console.log('[HourlyServiceService] Got service detail')
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Failed to fetch service detail')
      }
    } catch (error: any) {
      console.error('[HourlyServiceService] Error fetching service detail:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
      throw error
    }
  }

  /**
   * Accept a hourly service request
   * POST /api/hourly-services/:id/accept
   */
  async acceptService(serviceId: string): Promise<any> {
    try {
      console.log('[HourlyServiceService] Accepting service:', serviceId)

      const response = await this.api.post<any>(`/${serviceId}/accept`, {})

      if (response.data.success) {
        console.log('[HourlyServiceService] Service accepted successfully')
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Failed to accept service')
      }
    } catch (error: any) {
      console.error('[HourlyServiceService] Error accepting service:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
      throw error
    }
  }

  /**
   * Reject a hourly service request
   * POST /api/hourly-services/:id/reject
   */
  async rejectService(serviceId: string): Promise<any> {
    try {
      console.log('[HourlyServiceService] Rejecting service:', serviceId)

      const response = await this.api.post<any>(`/${serviceId}/reject`, {})

      if (response.data.success) {
        console.log('[HourlyServiceService] Service rejected successfully')
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Failed to reject service')
      }
    } catch (error: any) {
      console.error('[HourlyServiceService] Error rejecting service:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
      throw error
    }
  }

  /**
   * Set token for authenticated requests
   */
  setToken(token: string) {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  }
}

// Export singleton instance
export const hourlyServiceService = new HourlyServiceService()
export default hourlyServiceService
