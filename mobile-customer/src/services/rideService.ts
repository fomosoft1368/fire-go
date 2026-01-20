import { API_BASE_URL } from '../constants'
import type { CreateRideDto } from '../types'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Standalone fallback pricing calculation - MUST be defined before rideService
function calculateFareFallback(distance: number, duration: number, vehicleType: string = 'basic', isPeakHour?: boolean, isRainy?: boolean) {
  const pricingRates: Record<string, any> = {
    'basic': {
      baseFare: 0,
      pricePerKm: 10000,
      minimumFare: 25000,
    },
    'comfort': {
      baseFare: 0,
      pricePerKm: 15000,
      minimumFare: 40000,
    },
    'premium': {
      baseFare: 0,
      pricePerKm: 20000,
      minimumFare: 60000,
    },
  }

  const rates = pricingRates[vehicleType] || pricingRates['basic']
  
  const distanceFare = distance * rates.pricePerKm
  let totalFare = rates.baseFare + distanceFare

  // Apply minimum fare
  if (totalFare < rates.minimumFare) {
    totalFare = rates.minimumFare
  }

  // Apply surges
  let passengerSurge = 0
  if (isPeakHour) {
    passengerSurge = totalFare * 0.2 // 20% peak hour surge
    totalFare += passengerSurge
  }
  if (isRainy) {
    const rainySurge = totalFare * 0.15 // 15% rainy day surge
    totalFare += rainySurge
  }

  console.log('[calculateFareFallback] Result:', { distanceFare, totalFare, minFare: rates.minimumFare })
  return {
    baseFare: rates.baseFare,
    distanceFare: Math.round(distanceFare),
    timeFare: 0,
    passengerSurge: Math.round(passengerSurge),
    totalFare: Math.round(totalFare),
    vehicleType,
    distance,
    duration,
    message: 'Pricing calculated locally (backend unavailable)',
  }
}

export const rideService = {
  /**
   * Get directions between two points
   */
  async getDirections(startLng: number, startLat: number, endLng: number, endLat: number) {
    try {
      const params = new URLSearchParams({
        startLng: startLng.toString(),
        startLat: startLat.toString(),
        endLng: endLng.toString(),
        endLat: endLat.toString(),
      })

      console.log('[RideService] Getting directions:', { startLng, startLat, endLng, endLat })

      const response = await fetch(`${API_BASE_URL}/rides/directions?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[RideService] Get directions failed:', result)
        throw new Error(result.message || 'Failed to get directions')
      }

      console.log('[RideService] Directions:', result)
      return result
    } catch (error: any) {
      console.error('[RideService] Get directions error:', error)
      throw error
    }
  },

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

      // Lấy token từ AsyncStorage
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('Authentication required. Please login again.')
      }

      console.log('[RideService] Creating ride:', { customerId, data })

      const response = await fetch(`${API_BASE_URL}/rides`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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
   * Tự động chỉ định tài xế cho cuốc xe
   */
  async autoAssignDriver(rideId: string) {
    try {
      console.log('[RideService] Auto-assigning driver for ride:', rideId)

      const token = await AsyncStorage.getItem('authToken')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/auto-assign`, {
        method: 'POST',
        headers,
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[RideService] Auto-assign failed:', result)
        throw new Error(result.message || 'Failed to auto-assign driver')
      }

      console.log('[RideService] Auto-assign success:', result)
      return result
    } catch (error: any) {
      console.error('[RideService] Auto-assign error:', error)
      throw error
    }
  },

  /**
   * Lấy danh sách cuốc xe của customer
   */
  async getCustomerRides(customerId: string) {
    try {
      const token = await AsyncStorage.getItem('authToken')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/rides/customer/${customerId}`, {
        method: 'GET',
        headers,
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
      const token = await AsyncStorage.getItem('authToken')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/accept`, {
        method: 'PATCH',
        headers,
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
      const token = await AsyncStorage.getItem('authToken')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/start`, {
        method: 'PATCH',
        headers,
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
      const token = await AsyncStorage.getItem('authToken')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/complete`, {
        method: 'PATCH',
        headers,
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
      const token = await AsyncStorage.getItem('authToken')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/cancel`, {
        method: 'PATCH',
        headers,
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
      const token = await AsyncStorage.getItem('authToken')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/rides/${rideId}/rate`, {
        method: 'PATCH',
        headers,
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

  /**
   * Lấy thông tin chi tiết của một cuốc xe
   */
  async getRideById(rideId: string, token?: string) {
    try {
      console.log('[RideService] Fetching ride details:', rideId)

      const headers: any = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const url = `${API_BASE_URL}/rides/${rideId}`
      console.log('[RideService] Fetch URL:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers,
      })

      console.log('[RideService] Response status:', response.status, response.statusText)

      if (!response.ok) {
        console.error('[RideService] Response not ok, status:', response.status)
        throw new Error(`Failed to fetch ride: ${response.status}`)
      }

      const result = await response.json()
      console.log('[RideService] Response data:', result)

      // Backend trả về ride object trực tiếp, không wrapped trong .data
      const rideData = result.data || result
      
      console.log('[RideService] Ride data received:', {
        rideId,
        status: rideData?.status,
        driverName: rideData?.driverId?.firstName,
        hasDriverId: !!rideData?.driverId,
      })

      return rideData
    } catch (error: any) {
      console.error('[RideService] Get ride error:', {
        message: error.message,
        rideId,
      })
      throw error
    }
  },

  /**
   * Lấy cuốc xe hiện tại (đang diễn ra)
   */
  async getCurrentRide(customerId: string, token?: string) {
    try {
      console.log('[RideService] Fetching current ride for customer:', customerId)

      const headers: any = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/rides/customer/${customerId}`, {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch rides: ${response.status}`)
      }

      const result = await response.json()
      const rides = result.data || []

      // Lọc cuốc xe đang hoạt động (ACCEPTED, IN_PROGRESS, STARTED)
      const currentRide = rides.find((ride: any) =>
        ['ACCEPTED', 'IN_PROGRESS', 'STARTED'].includes(ride.status)
      )

      console.log('[RideService] Current ride:', {
        customerId,
        found: !!currentRide,
        status: currentRide?.status,
      })

      return currentRide || null
    } catch (error: any) {
      console.error('[RideService] Get current ride error:', {
        message: error.message,
        customerId,
      })
      throw error
    }
  },

  /**
   * Lấy lịch sử chuyến đi của khách hàng
   */
  async getRideHistory(customerId: string, status?: string) {
    try {
      if (!customerId) {
        throw new Error('Customer ID is required')
      }

      console.log('[RideService] Fetching ride history for customer:', customerId, 'status:', status)

      const token = await AsyncStorage.getItem('authToken')
      console.log('[RideService] Auth token exists:', !!token)
      
      const headers: any = {
        'Content-Type': 'application/json',
      }

      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      let url = `${API_BASE_URL}/rides/customer/${customerId}`
      if (status) {
        url += `?status=${status}`
      }

      console.log('[RideService] Calling URL:', url)
      console.log('[RideService] Headers:', { Authorization: headers.Authorization ? 'Bearer ...' : 'none' })

      const response = await fetch(url, {
        method: 'GET',
        headers,
      })

      console.log('[RideService] Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[RideService] Failed to fetch ride history:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        })
        return []
      }

      const result = await response.json()
      console.log('[RideService] Raw response:', JSON.stringify(result).substring(0, 500))
      
      const rides = Array.isArray(result) ? result : (result.data || [])
      
      console.log('[RideService] Fetched', rides.length, 'rides')
      
      if (rides.length > 0) {
        console.log('[RideService] First ride sample:', rides[0])
      }

      // Transform API data to match UI expectations
      return rides.map((ride: any) => ({
        id: ride._id,
        status: ride.status?.toLowerCase() || 'pending',
        pickupLocation: ride.pickupAddress || ride.pickupLocation || '',
        pickupDistrict: ride.pickupDistrict || '',
        dropoffLocation: ride.dropoffAddress || ride.dropoffLocation || '',
        dropoffDistrict: ride.dropoffDistrict || '',
        distance: ride.distance ? `${ride.distance.toFixed(1)} km` : ride.estimatedDistance ? `${ride.estimatedDistance.toFixed(1)} km` : '0 km',
        estimatedTime: ride.duration ? `${Math.round(ride.duration / 60)} phút` : '0 phút',
        estimatedFare: ride.totalFare || ride.actualFare || ride.fare || ride.estimatedFare || 0,
        actualFare: ride.totalFare || ride.actualFare || ride.fare || 0,
        rideType: ride.rideType || 'share',
        driverName: ride.driverName || 'N/A',
        driverRating: ride.driverRating || 0,
        carPlate: ride.carPlate || '',
        bookingTime: ride.createdAt ? new Date(ride.createdAt).toLocaleString('vi-VN') : '',
        startTime: ride.pickupTime || ride.createdAt,
        endTime: ride.dropoffTime || ride.updatedAt,
        rating: ride.rating || null,
      }))
    } catch (error: any) {
      console.error('[RideService] Error fetching ride history:', {
        message: error.message,
        customerId,
        stack: error.stack,
      })
      return []
    }
  },

  /**
   * Calculate fare based on distance, duration and vehicle type
   */
  async calculateFare(distance: number, duration: number, vehicleType: string = 'basic', isPeakHour?: boolean, isRainy?: boolean) {
    try {
      const payload = {
        distance,
        duration,
        vehicleType,
        isPeakHour: isPeakHour || false,
        isRainy: isRainy || false,
      }

      console.log('[RideService] Calculating fare with:', payload)

      const response = await fetch(`${API_BASE_URL}/rides/calculate-fare`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      console.log('[RideService] API response status:', response.status, response.ok)

      if (!response.ok) {
        console.error('[RideService] Calculate fare API returned error status:', response.status)
        console.log('[RideService] Using fallback pricing for:', { distance, duration, vehicleType })
        try {
          const fallbackResult = calculateFareFallback(distance, duration, vehicleType, isPeakHour, isRainy)
          console.log('[RideService] Fallback result:', fallbackResult)
          return fallbackResult
        } catch (fallbackError) {
          console.error('[RideService] Fallback pricing also failed:', fallbackError)
          throw fallbackError
        }
      }

      const result = await response.json()
      console.log('[RideService] API response JSON:', JSON.stringify(result, null, 2))

      if (result.message && result.statusCode === 400) {
        console.error('[RideService] Calculate fare failed:', result)
        console.log('[RideService] Using fallback pricing for:', { distance, duration, vehicleType })
        try {
          const fallbackResult = calculateFareFallback(distance, duration, vehicleType, isPeakHour, isRainy)
          console.log('[RideService] Fallback result:', fallbackResult)
          return fallbackResult
        } catch (fallbackError) {
          console.error('[RideService] Fallback pricing also failed:', fallbackError)
          throw fallbackError
        }
      }

      console.log('[RideService] Fare calculation success:', result)
      return result
    } catch (error: any) {
      console.error('[RideService] Calculate fare error:', error)
      console.log('[RideService] Using fallback pricing due to error for:', { distance, duration, vehicleType })
      try {
        const fallbackResult = calculateFareFallback(distance, duration, vehicleType, isPeakHour, isRainy)
        console.log('[RideService] Fallback result:', fallbackResult)
        return fallbackResult
      } catch (fallbackError) {
        console.error('[RideService] Fallback pricing also failed:', fallbackError)
        throw fallbackError
      }
    }
  },

  /**
   * Find nearby available drivers
   */
  async findNearbyDrivers(latitude: number, longitude: number, radius: number = 5, vehicleType?: string, limit: number = 10) {
    try {
      const params = new URLSearchParams({
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        radius: radius.toString(),
        limit: limit.toString(),
      })

      if (vehicleType) {
        params.append('vehicleType', vehicleType)
      }

      console.log('[RideService] Finding nearby drivers with:', { latitude, longitude, radius, vehicleType })

      const response = await fetch(`${API_BASE_URL}/rides/find-drivers?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[RideService] Find drivers failed:', result)
        throw new Error(result.message || 'Failed to find drivers')
      }

      console.log('[RideService] Found drivers:', result)
      return result
    } catch (error: any) {
      console.error('[RideService] Find drivers error:', error)
      throw error
    }
  },

  /**
   * Get pricing for vehicle type
   */
  async getPricing(vehicleType: string = 'basic') {
    try {
      const response = await fetch(`${API_BASE_URL}/rides/pricing/${vehicleType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[RideService] Get pricing failed:', result)
        throw new Error(result.message || 'Failed to get pricing')
      }

      console.log('[RideService] Pricing for', vehicleType, ':', result)
      return result
    } catch (error: any) {
      console.error('[RideService] Get pricing error:', error)
      throw error
    }
  },
}
