import { API_BASE_URL } from '../constants'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface CreateHourlyServiceDto {
  customerId: string
  hours: number
  selectedDate: number
  selectedTime: string
  address: string
  notes?: string
  services: Array<{
    id: string
    name: string
    price: number
    duration: number
    selected: boolean
  }>
  estimatedPrice: number
}

export interface UpdateHourlyServiceDto {
  status?: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  workerId?: string
  actualPrice?: number
  cancelReason?: string
}

export interface RateHourlyServiceDto {
  rating: number
  comment?: string
  feedback?: string
}

export interface HourlyService {
  _id: string
  customerId: string
  workerId?: string
  hours: number
  selectedDate: number
  selectedTime: string
  month?: number
  year?: number
  address: string
  notes?: string
  services: Array<{
    id: string
    name: string
    price: number
    duration: number
    selected: boolean
  }>
  estimatedPrice: number
  actualPrice?: number
  status: string
  rating?: number
  comment?: string
  feedback?: string
  cancelReason?: string
  startTime?: string
  endTime?: string
  cancelledTime?: string
  createdAt: string
  updatedAt: string
}

class HourlyServiceService {
  private baseUrl = `${API_BASE_URL}/hourly-services`

  /**
   * Get all hourly services for current user
   */
  async getMyServices(): Promise<HourlyService[]> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      const response = await fetch(`${this.baseUrl}/my-services`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch hourly services: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data || []
    } catch (error) {
      console.error('[HourlyServiceService] Error fetching services:', error)
      throw error
    }
  }

  /**
   * Get hourly service details by ID
   */
  async getServiceDetail(serviceId: string): Promise<HourlyService> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      const response = await fetch(`${this.baseUrl}/${serviceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch service detail: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('[HourlyServiceService] Error fetching service detail:', error)
      throw error
    }
  }

  /**
   * Create new hourly service
   */
  async createService(payload: CreateHourlyServiceDto): Promise<HourlyService> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      
      console.log('[HourlyServiceService] Creating hourly service:', payload)
      console.log('[HourlyServiceService] Using token:', token ? `${token.substring(0, 30)}...` : 'NO TOKEN')
      console.log('[HourlyServiceService] Calling URL:', this.baseUrl)

      const response = await fetch(`${this.baseUrl}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      console.log('[HourlyServiceService] Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: response.statusText }
        }
        const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`
        console.error('[HourlyServiceService] Error response:', errorMsg)
        throw new Error(errorMsg)
      }

      const data = await response.json()
      console.log('[HourlyServiceService] Service created successfully:', data.data)
      return data.data
    } catch (error) {
      console.error('[HourlyServiceService] Error creating service:', error)
      throw error
    }
  }

  /**
   * Update hourly service
   */
  async updateService(serviceId: string, payload: UpdateHourlyServiceDto): Promise<HourlyService> {
    try {
      const token = await AsyncStorage.getItem('authToken')

      const response = await fetch(`${this.baseUrl}/${serviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Failed to update service: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('[HourlyServiceService] Error updating service:', error)
      throw error
    }
  }

  /**
   * Cancel hourly service
   */
  async cancelService(serviceId: string, cancelReason: string): Promise<HourlyService> {
    try {
      const token = await AsyncStorage.getItem('authToken')

      const response = await fetch(`${this.baseUrl}/${serviceId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cancelReason }),
      })

      if (!response.ok) {
        throw new Error(`Failed to cancel service: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('[HourlyServiceService] Error cancelling service:', error)
      throw error
    }
  }

  /**
   * Rate hourly service
   */
  async rateService(serviceId: string, payload: RateHourlyServiceDto): Promise<HourlyService> {
    try {
      const token = await AsyncStorage.getItem('authToken')

      const response = await fetch(`${this.baseUrl}/${serviceId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`Failed to rate service: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('[HourlyServiceService] Error rating service:', error)
      throw error
    }
  }

  /**
   * Get service pricing
   */
  async getPricing(hours: number, addOns: string[]): Promise<{ basePrice: number; addOnPrice: number; totalPrice: number }> {
    try {
      const token = await AsyncStorage.getItem('authToken')

      const response = await fetch(`${this.baseUrl}/pricing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ hours, addOns }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get pricing: ${response.statusText}`)
      }

      const data = await response.json()
      return data.data
    } catch (error) {
      console.error('[HourlyServiceService] Error getting pricing:', error)
      throw error
    }
  }

  /**
   * Get active addon services for booking
   */
  async getAddonServices(): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      const addonBaseUrl = `${API_BASE_URL}/addon-services`
      const url = `${addonBaseUrl}/active`

      console.log('[HourlyServiceService] Fetching addon services from:', url)
      console.log('[HourlyServiceService] Using token:', token ? `${token.substring(0, 30)}...` : 'NO TOKEN')

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      })

      console.log('[HourlyServiceService] Response status:', response.status, response.statusText)

      if (!response.ok) {
        let errorData: any
        try {
          errorData = await response.json()
        } catch {
          errorData = { message: response.statusText || 'Unknown error' }
        }
        const errorMsg = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText || 'Unknown error'}`
        console.error('[HourlyServiceService] Error response:', errorMsg)
        throw new Error(errorMsg)
      }

      const data = await response.json()
      console.log('[HourlyServiceService] Addon services fetched successfully:', data.data?.length || 0, 'services')
      return data.data || []
    } catch (error: any) {
      console.error('[HourlyServiceService] Error fetching addon services:', error)
      
      // Provide more detailed error messages
      if (error.message.includes('Network request failed')) {
        throw new Error('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.')
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('Không thể tải dữ liệu. Vui lòng kiểm tra máy chủ backend.')
      }
      
      throw error
    }
  }
}

export const hourlyServiceService = new HourlyServiceService()
