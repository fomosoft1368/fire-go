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

      // Chỉ kiểm tra licensePlate khi là chế độ lái xe hộ (hire)
      if (data.rideType === 'hire' && !data.licensePlate) {
        throw new Error('License plate is required for hire rides')
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

  /**
   * Tìm cuốc xe ghép gần vị trí hiện tại
   */
  async findNearbyRides(longitude: number, latitude: number, maxDistance?: number) {
    try {
      const params = new URLSearchParams({
        longitude: longitude.toString(),
        latitude: latitude.toString(),
      })
      
      if (maxDistance) {
        params.append('maxDistance', maxDistance.toString())
      }

      const response = await fetch(`${API_BASE_URL}/rides/nearby?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to find nearby rides')
      }

      console.log('[RideService] Found nearby rides:', result)
      return result
    } catch (error: any) {
      console.error('[RideService] Find nearby rides error:', error)
      throw error
    }
  },

  /**
   * Chấp nhận cuốc xe (tìm thấy khách hàng phù hợp)
   */
  async acceptRide(rideId: string, driverId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/accept`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ driverId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to accept ride')
      }

      return result
    } catch (error: any) {
      console.error('[RideService] Accept ride error:', error)
      throw error
    }
  },

  /**
   * Bắt đầu cuốc xe
   */
  async startRide(rideId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/start`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to start ride')
      }

      return result
    } catch (error: any) {
      console.error('[RideService] Start ride error:', error)
      throw error
    }
  },

  /**
   * Hoàn thành cuốc xe
   */
  async completeRide(rideId: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/complete`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to complete ride')
      }

      return result
    } catch (error: any) {
      console.error('[RideService] Complete ride error:', error)
      throw error
    }
  },

  /**
   * Hủy cuốc xe
   */
  async cancelRide(rideId: string, cancellationBy: 'driver' | 'customer', reason?: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/cancel`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancellationBy, reason }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to cancel ride')
      }

      return result
    } catch (error: any) {
      console.error('[RideService] Cancel ride error:', error)
      throw error
    }
  },

  /**
   * Đánh giá cuốc xe
   */
  async rateRide(rideId: string, rating: number, review?: string, ratedBy?: 'driver' | 'customer') {
    try {
      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/rate`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, review, ratedBy }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to rate ride')
      }

      return result
    } catch (error: any) {
      console.error('[RideService] Rate ride error:', error)
      throw error
    }
  },
}
