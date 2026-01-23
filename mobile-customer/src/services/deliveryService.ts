import { API_BASE_URL } from '../constants'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface CreateDeliveryDto {
  customerId: string
  pickupAddress: string
  pickupCoordinates: [number, number]
  dropoffAddress: string
  dropoffCoordinates: [number, number]
  goodsType: 'light' | 'bulky' | 'food'
  weight: '<20' | '20-50' | '>50'
  vehicle: 'bike' | 'truck'
  estimatedPrice: number
  distance?: string
  duration?: string
  notes?: string
}

export interface UpdateDeliveryDto {
  status?: 'pending' | 'finding_driver' | 'driver_assigned' | 'picking_up' | 'delivering' | 'delivered' | 'cancelled'
  driverId?: string
  actualPrice?: number
  distance?: string
  duration?: string
  cancelReason?: string
}

export interface RateDeliveryDto {
  rating: number
  comment?: string
  feedback?: string
}

export interface Delivery {
  _id: string
  customerId: string
  driverId?: string
  pickupAddress: string
  pickupCoordinates: [number, number]
  dropoffAddress: string
  dropoffCoordinates: [number, number]
  goodsType: string
  weight: string
  vehicle: string
  estimatedPrice: number
  actualPrice?: number
  distance?: string
  duration?: string
  status: string
  notes?: string
  rating?: number
  comment?: string
  feedback?: string
  cancelReason?: string
  pickupTime?: string
  deliveredTime?: string
  cancelledTime?: string
  createdAt: string
  updatedAt: string
}

export interface DeliveryStats {
  total: number
  completed: number
  cancelled: number
  active: number
}

export const deliveryService = {
  /**
   * Create new delivery order
   */
  async createDelivery(deliveryData: CreateDeliveryDto): Promise<Delivery> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      console.log('[DeliveryService] Creating delivery:', deliveryData)

      const response = await fetch(`${API_BASE_URL}/deliveries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(deliveryData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create delivery')
      }

      console.log('[DeliveryService] Delivery created:', data)
      return data
    } catch (error) {
      console.error('[DeliveryService] Create delivery error:', error)
      throw error
    }
  },

  /**
   * Get all deliveries for current user
   */
  async getMyDeliveries(): Promise<Delivery[]> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/deliveries/my-deliveries`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get deliveries')
      }

      return data
    } catch (error) {
      console.error('[DeliveryService] Get deliveries error:', error)
      throw error
    }
  },

  /**
   * Get single delivery by ID
   */
  async getDelivery(id: string): Promise<Delivery> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/deliveries/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get delivery')
      }

      return data
    } catch (error) {
      console.error('[DeliveryService] Get delivery error:', error)
      throw error
    }
  },

  /**
   * Update delivery status
   */
  async updateDelivery(id: string, updateData: UpdateDeliveryDto): Promise<Delivery> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/deliveries/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update delivery')
      }

      return data
    } catch (error) {
      console.error('[DeliveryService] Update delivery error:', error)
      throw error
    }
  },

  /**
   * Rate completed delivery
   */
  async rateDelivery(id: string, rating: RateDeliveryDto): Promise<Delivery> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/deliveries/${id}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(rating),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to rate delivery')
      }

      return data
    } catch (error) {
      console.error('[DeliveryService] Rate delivery error:', error)
      throw error
    }
  },

  /**
   * Cancel delivery
   */
  async cancelDelivery(id: string, reason: string): Promise<Delivery> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/deliveries/${id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel delivery')
      }

      return data
    } catch (error) {
      console.error('[DeliveryService] Cancel delivery error:', error)
      throw error
    }
  },

  /**
   * Get delivery statistics for current user
   */
  async getMyStats(): Promise<DeliveryStats> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const response = await fetch(`${API_BASE_URL}/deliveries/my-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get stats')
      }

      return data
    } catch (error) {
      console.error('[DeliveryService] Get stats error:', error)
      throw error
    }
  },

  /**
   * Find nearby deliveries (for drivers)
   */
  async findNearbyDeliveries(latitude: number, longitude: number, maxDistance?: number): Promise<Delivery[]> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
      })

      if (maxDistance) {
        params.append('maxDistance', maxDistance.toString())
      }

      const response = await fetch(`${API_BASE_URL}/deliveries/nearby?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to find nearby deliveries')
      }

      return data
    } catch (error) {
      console.error('[DeliveryService] Find nearby error:', error)
      throw error
    }
  },
}
