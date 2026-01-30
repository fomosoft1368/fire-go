import { API_BASE_URL } from '../constants'
import AsyncStorage from '@react-native-async-storage/async-storage'

export interface Driver {
  _id: string
  userId?: string
  firstName: string
  lastName: string
  phone: string
  vehiclePlate: string
  vehicleModel?: string
  vehicleColor?: string
  vehicleImage?: string
  avatar?: string
  isAvailable?: boolean
  isApproved?: boolean
  status?: string
  currentLocation?: {
    type: string
    coordinates: [number, number]
  }
  averageRating: number
  totalTrips: number
  createdAt: string
  updatedAt: string
}

export interface DriverStats {
  totalTrips: number
  completedTrips: number
  cancelledTrips: number
  averageRating: number
  totalEarnings: number
}

export const driverService = {
  /**
   * Get driver details by ID
   */
  async getDriver(driverId: string): Promise<Driver> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      console.log('[DriverService] Getting driver:', driverId)

      const response = await fetch(`${API_BASE_URL}/drivers/${driverId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get driver')
      }

      console.log('[DriverService] Driver fetched:', data)
      return data
    } catch (error) {
      console.error('[DriverService] Get driver error:', error)
      throw error
    }
  },

  /**
   * Get driver stats by ID
   */
  async getDriverStats(driverId: string): Promise<DriverStats> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('No authentication token found')
      }

      console.log('[DriverService] Getting driver stats:', driverId)

      const response = await fetch(`${API_BASE_URL}/drivers/${driverId}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to get driver stats')
      }

      console.log('[DriverService] Driver stats fetched:', data)
      return data
    } catch (error) {
      console.error('[DriverService] Get driver stats error:', error)
      throw error
    }
  },
}
