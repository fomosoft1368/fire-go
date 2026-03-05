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
  notes?: string
  createdAt: string
  distance?: number
  startTime?: string
  endTime?: string
  actualPrice?: number
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
   * Accept a hourly service request (assign worker/driver)
   * POST /api/hourly-services/:id/assign-worker
   */
  async acceptService(serviceId: string, workerId: string): Promise<any> {
    try {
      console.log('[HourlyServiceService] Accepting service:', serviceId, 'for worker:', workerId)

      const response = await this.api.patch<any>(`/${serviceId}/assign-worker`, {
        workerId,
      })

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
      throw new Error(error.response?.data?.message || error.message || 'Không thể nhận nhiệm vụ')
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
   * Update hourly service status (in_progress, completed, etc.)
   * PATCH /api/hourly-services/:id
   */
  async updateStatus(
    serviceId: string,
    status: 'confirmed' | 'in_progress' | 'completed' | 'cancelled',
    additionalData?: { startTime?: string; endTime?: string }
  ): Promise<any> {
    try {
      console.log('[HourlyServiceService] Updating status:', serviceId, status)

      const response = await this.api.patch<any>(`/${serviceId}`, {
        status,
        ...additionalData,
      })

      if (response.data.success) {
        console.log('[HourlyServiceService] Status updated successfully')
        return response.data.data
      } else {
        throw new Error(response.data.message || 'Failed to update status')
      }
    } catch (error: any) {
      console.error('[HourlyServiceService] Error updating status:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
      throw new Error(error.response?.data?.message || error.message || 'Không thể cập nhật trạng thái')
    }
  }

  /**
   * Get completed hourly services for driver
   * GET /api/hourly-services/worker-services?status=completed
   */
  async getCompletedServices(driverId: string): Promise<HourlyRequest[]> {
    try {
      console.log('[HourlyServiceService] Fetching completed services for driver:', driverId)

      const response = await this.api.get<GetHourlyRequestsResponse>('/worker-services', {
        params: { 
          status: 'completed'
        },
      })

      if (response.data.success) {
        const driverServices = response.data.data || []
        console.log('[HourlyServiceService] Got completed services from worker-services endpoint:', driverServices.length)
        if (driverServices.length > 0) {
          console.log('[HourlyServiceService] Sample service:', JSON.stringify(driverServices[0], null, 2))
        }
        return driverServices
      } else {
        console.warn('[HourlyServiceService] API returned success=false:', response.data.message)
        return []
      }
    } catch (error: any) {
      console.error('[HourlyServiceService] Error fetching completed services:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
      })
      return []
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
