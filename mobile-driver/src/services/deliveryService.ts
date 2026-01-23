import axios, { AxiosInstance } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

export interface Delivery {
  _id: string
  customerId: {
    _id: string
    name?: string
    firstName?: string
    lastName?: string
    phone: string
  }
  driverId?: string
  pickupAddress: string
  pickupCoordinates: [number, number]
  dropoffAddress: string
  dropoffCoordinates: [number, number]
  goodsType: 'light' | 'bulky' | 'food'
  weight: '<20' | '20-50' | '>50'
  vehicle: 'bike' | 'truck'
  estimatedPrice: number
  actualPrice?: number
  distance?: string
  duration?: string
  status: 'pending' | 'finding_driver' | 'driver_assigned' | 'picking_up' | 'delivering' | 'delivered' | 'cancelled'
  notes?: string
  rating?: number
  comment?: string
  pickupTime?: string
  deliveredTime?: string
  createdAt: string
  updatedAt: string
}

export interface DeliveryStats {
  total: number
  completed: number
  cancelled: number
  active: number
  earnings: number
}

export class DeliveryService {
  private api: AxiosInstance
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
    this.api = axios.create({
      baseURL: `${baseURL}/deliveries`,
      timeout: 10000,
    })

    // Add JWT token to each request
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })
  }

  /**
   * Find nearby delivery orders available for pickup
   */
  async findNearbyDeliveries(latitude: number, longitude: number, maxDistance: number = 5000): Promise<Delivery[]> {
    try {
      console.log('[DeliveryService] Finding nearby deliveries:', { latitude, longitude, maxDistance })
      const token = await AsyncStorage.getItem('token')
      console.log('[DeliveryService] Token exists:', !!token)
      
      const response = await this.api.get('/nearby', {
        params: {
          latitude,
          longitude,
          maxDistance,
        },
      })
      console.log('[DeliveryService] Found deliveries:', response.data.length)
      return response.data
    } catch (error: any) {
      console.error('[DeliveryService] Find nearby error:', error.response?.data || error.message)
      console.error('[DeliveryService] Error status:', error.response?.status)
      throw new Error(error.response?.data?.message || 'Không thể tìm đơn giao hàng gần bạn')
    }
  }

  /**
   * Accept a delivery order (assign driver)
   */
  async acceptDelivery(deliveryId: string, driverId: string): Promise<Delivery> {
    try {
      const response = await this.api.patch(`/${deliveryId}/assign-driver`, {
        driverId,
      })
      return response.data
    } catch (error: any) {
      console.error('[DeliveryService] Accept delivery error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Không thể nhận đơn hàng')
    }
  }

  /**
   * Get delivery by ID
   */
  async getDelivery(deliveryId: string): Promise<Delivery> {
    try {
      const response = await this.api.get(`/${deliveryId}`)
      return response.data
    } catch (error: any) {
      console.error('[DeliveryService] Get delivery error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Không thể tải thông tin đơn hàng')
    }
  }

  /**
   * Get all deliveries for current driver
   */
  async getMyDeliveries(): Promise<Delivery[]> {
    try {
      const driverId = await AsyncStorage.getItem('driverId')
      if (!driverId) {
        throw new Error('Driver ID not found')
      }

      const response = await this.api.get(`/driver/${driverId}`)
      return response.data
    } catch (error: any) {
      console.error('[DeliveryService] Get my deliveries error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách đơn hàng')
    }
  }

  /**
   * Update delivery status
   */
  async updateDeliveryStatus(
    deliveryId: string,
    status: 'driver_assigned' | 'picking_up' | 'delivering' | 'delivered' | 'cancelled'
  ): Promise<Delivery> {
    try {
      const response = await this.api.patch(`/${deliveryId}`, {
        status,
      })
      return response.data
    } catch (error: any) {
      console.error('[DeliveryService] Update status error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Không thể cập nhật trạng thái')
    }
  }

  /**
   * Start pickup (update status to picking_up)
   */
  async startPickup(deliveryId: string): Promise<Delivery> {
    return this.updateDeliveryStatus(deliveryId, 'picking_up')
  }

  /**
   * Pickup completed, start delivery
   */
  async startDelivery(deliveryId: string): Promise<Delivery> {
    return this.updateDeliveryStatus(deliveryId, 'delivering')
  }

  /**
   * Complete delivery
   */
  async completeDelivery(deliveryId: string, actualPrice?: number): Promise<Delivery> {
    try {
      const updateData: any = { status: 'delivered' }
      if (actualPrice) {
        updateData.actualPrice = actualPrice
      }

      const response = await this.api.patch(`/${deliveryId}`, updateData)
      return response.data
    } catch (error: any) {
      console.error('[DeliveryService] Complete delivery error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Không thể hoàn thành đơn hàng')
    }
  }

  /**
   * Cancel delivery
   */
  async cancelDelivery(deliveryId: string, reason: string): Promise<Delivery> {
    try {
      const response = await this.api.post(`/${deliveryId}/cancel`, {
        reason,
      })
      return response.data
    } catch (error: any) {
      console.error('[DeliveryService] Cancel delivery error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Không thể hủy đơn hàng')
    }
  }

  /**
   * Get delivery statistics for driver
   */
  async getDriverStats(): Promise<DeliveryStats> {
    try {
      const driverId = await AsyncStorage.getItem('driverId')
      if (!driverId) {
        throw new Error('Driver ID not found')
      }

      const response = await this.api.get(`/stats/${driverId}`)
      return response.data
    } catch (error: any) {
      console.error('[DeliveryService] Get stats error:', error.response?.data || error.message)
      throw new Error(error.response?.data?.message || 'Không thể tải thống kê')
    }
  }
}

// Export singleton instance
export const deliveryService = new DeliveryService()
