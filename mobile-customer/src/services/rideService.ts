import { API_BASE_URL } from '../constants'
import type { CreateRideDto } from '../types'

export const rideService = {
  /**
   * Tạo cuốc xe mới
   */
  async createRide(data: CreateRideDto, customerId: string) {
    try {
      // Validation
      if (!customerId) {
        throw new Error('Customer ID is required')
      }
      
      if (!data.pickupAddress || !data.dropoffAddress) {
        throw new Error('Pickup and dropoff addresses are required')
      }

      if (!data.licensePlate) {
        throw new Error('License plate is required')
      }

      console.log('[RideService] Creating ride:', { customerId, data })

      const response = await fetch(`${API_BASE_URL}/rides?customerId=${customerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[RideService] Create ride failed:', result)
        throw new Error(result.message || 'Failed to create ride')
      }

      console.log('[RideService] Create ride success:', result)
      return result
    } catch (error: any) {
      console.error('[RideService] Error:', error)
      throw error
    }
  },

  /**
   * Lấy thông tin cuốc xe theo ID
   */
  async getRideById(rideId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/rides/${rideId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get ride')
      }

      return result
    } catch (error: any) {
      console.error('[RideService] Get ride error:', error)
      throw error
    }
  },

  /**
   * Lấy danh sách cuốc xe của customer
   */
  async getCustomerRides(customerId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/rides/customer/${customerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get rides')
      }

      return result
    } catch (error: any) {
      console.error('[RideService] Get customer rides error:', error)
      throw error
    }
  },
}
