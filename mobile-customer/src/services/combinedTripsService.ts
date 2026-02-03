import { API_BASE_URL } from '../constants'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * CombinedTrips Service - Xe Ghép (Share Rides)
 * Handles all API calls for combined/shared rides
 * Backend: CombinedTripsModule
 */
export const combinedTripsService = {
  /**
   * Find combined trips (share rides) by location
   */
  async findCombinedTrips(
    longitude: number,
    latitude: number,
    pickupAddress: string,
    maxDistance: number = 10000
  ) {
    try {
      const params = new URLSearchParams({
        lng: longitude.toString(),
        lat: latitude.toString(),
        pickupAddress: pickupAddress,
        maxDistance: maxDistance.toString(),
      })

      const url = `${API_BASE_URL}/combined-trips/find-share-rides?${params}`
      console.log('[CombinedTripsService] Finding combined trips:', {
        lng: longitude,
        lat: latitude,
        pickupAddress,
        maxDistance,
      })

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[CombinedTripsService] Find combined trips failed:', {
          status: response.status,
          message: result.message,
        })
        throw new Error(result.message || `Failed to find combined trips (${response.status})`)
      }

      const tripsArray = Array.isArray(result) ? result : (result.data || [])
      console.log('✅ [CombinedTripsService] Found combined trips:', tripsArray.length, 'trips')
      return tripsArray
    } catch (error: any) {
      console.error('[CombinedTripsService] Find combined trips error:', error.message)
      throw error
    }
  },

  /**
   * Get combined trip detail
   */
  async getCombinedTripDetail(combinedTripId: string) {
    try {
      console.log('[CombinedTripsService] Getting combined trip detail:', combinedTripId)

      const response = await fetch(`${API_BASE_URL}/combined-trips/${combinedTripId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[CombinedTripsService] Get combined trip failed:', result)
        throw new Error(result.message || 'Failed to get combined trip')
      }

      console.log('[CombinedTripsService] Combined trip detail:', result._id)
      return result
    } catch (error: any) {
      console.error('[CombinedTripsService] Get combined trip error:', error)
      throw error
    }
  },

  /**
   * Create combined trip request
   */
  async createCombinedTripRequest(
    combinedTripId: string,
    customerId: string,
    pickupAddress: string,
    dropoffAddress: string,
    pickupCoordinates: [number, number],
    dropoffCoordinates: [number, number],
    distance: number,
    fare: number,
    seats: number = 1
  ) {
    try {
      console.log('[CombinedTripsService] Creating combined trip request:', {
        combinedTripId,
        customerId,
        pickupAddress,
      })

      const token = await AsyncStorage.getItem('authToken')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/combined-trips/${combinedTripId}/requests`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerId,
          seats,
          fare,
          pickupAddress,
          dropoffAddress,
          pickupCoordinates,
          dropoffCoordinates,
          distance,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[CombinedTripsService] Create combined trip request failed:', result)
        throw new Error(result.message || 'Failed to create request')
      }

      console.log('[CombinedTripsService] Combined trip request created:', result._id)
      return result
    } catch (error: any) {
      console.error('[CombinedTripsService] Create combined trip request error:', error)
      throw error
    }
  },

  /**
   * Get combined trip request status
   */
  async getCombinedTripRequestStatus(combinedTripId: string, requestId: string) {
    try {
      console.log('[CombinedTripsService] Getting combined trip request status:', {
        combinedTripId,
        requestId,
      })

      const response = await fetch(
        `${API_BASE_URL}/combined-trips/${combinedTripId}/requests/${requestId}/status`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || 'Failed to get request status')
      }

      return result
    } catch (error: any) {
      console.error('[CombinedTripsService] Get combined trip request status error:', error)
      throw error
    }
  },

  /**
   * Get all ride requests for a combined trip
   */
  async getCombinedTripRequests(combinedTripId: string) {
    try {
      console.log('[CombinedTripsService] Getting combined trip requests:', combinedTripId)

      const token = await AsyncStorage.getItem('authToken')  // ✅ Changed from 'token' to 'authToken'
      if (!token) {
        console.warn('[CombinedTripsService] ⚠️ No authToken found - request may fail')
      } else {
        console.log('[CombinedTripsService] ✅ authToken found, length:', token.length)
      }

      const response = await fetch(`${API_BASE_URL}/combined-trips/${combinedTripId}/requests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[CombinedTripsService] Get combined trip requests failed:', result)
        throw new Error(result.message || 'Failed to get combined trip requests')
      }

      const requestsArray = Array.isArray(result) ? result : (result?.data || [])
      console.log('[CombinedTripsService] ✅ Found combined trip requests:', requestsArray.length)
      return requestsArray
    } catch (error: any) {
      console.error('[CombinedTripsService] ❌ Get combined trip requests error:', error)
      throw error
    }
  },

  /**
   * Get driver's real-time location for a trip
   */
  async getDriverLocation(combinedTripId: string) {
    try {
      console.log('[CombinedTripsService] Getting driver location for trip:', combinedTripId)

      const response = await fetch(`${API_BASE_URL}/combined-trips/${combinedTripId}/driver-location`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[CombinedTripsService] Get driver location failed:', result)
        throw new Error(result.message || 'Failed to get driver location')
      }

      console.log('[CombinedTripsService] Driver location updated:', result.currentLocation)
      return result
    } catch (error: any) {
      console.error('[CombinedTripsService] Get driver location error:', error)
      throw error
    }
  },

  /**
   * Get customer's combined trip history (shared rides)
   */
  async getCustomerTrips(customerId: string) {
    try {
      console.log('[CombinedTripsService] Getting customer combined trips:', customerId)

      const token = await AsyncStorage.getItem('authToken')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE_URL}/combined-trips/customer/${customerId}`, {
        method: 'GET',
        headers,
      })

      const result = await response.json()

      if (!response.ok) {
        console.error('[CombinedTripsService] Get customer trips failed:', result)
        throw new Error(result?.message || 'Failed to get customer trips')
      }

      const tripsArray = Array.isArray(result) ? result : (result?.data || [])
      console.log('[CombinedTripsService] Found customer combined trips:', tripsArray?.length || 0)
      return tripsArray || []
    } catch (error: any) {
      console.error('[CombinedTripsService] Get customer trips error:', error)
      throw error
    }
  },

  /**
   * Cancel a ride request (only allowed when status = 'accepted')
   * - Frees up seats on the combined trip
   * - Recalculates fares for remaining passengers
   */
  async cancelRideRequest(combinedTripId: string, requestId: string) {
    try {
      console.log('[CombinedTripsService] Cancelling ride request:', {
        combinedTripId,
        requestId,
      })

      const token = await AsyncStorage.getItem('authToken')
      const headers: any = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers.Authorization = `Bearer ${token}`
      }

      const response = await fetch(
        `${API_BASE_URL}/combined-trips/${combinedTripId}/requests/${requestId}/cancel`,
        {
          method: 'PATCH',
          headers,
        }
      )

      const result = await response.json()

      if (!response.ok) {
        console.error('[CombinedTripsService] Cancel ride request failed:', result)
        throw new Error(result?.message || 'Failed to cancel ride request')
      }

      console.log('[CombinedTripsService] ✅ Ride request cancelled successfully')
      return result
    } catch (error: any) {
      console.error('[CombinedTripsService] ❌ Cancel ride request error:', error)
      throw error
    }
  },
}
