import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

interface EarningsData {
  totalEarnings: number
  totalTrips: number
  ridesCount: number
  ridesEarnings: number
  combinedTripsCount: number
  combinedTripsEarnings: number
  deliveriesCount: number
  deliveriesEarnings: number
  transactions: EarningsTransaction[]
}

interface EarningsTransaction {
  _id: string
  type: 'ride' | 'combined_trip' | 'delivery'
  completedAt: Date
  totalFare: number
  driverEarnings: number
  description: string
  pickupAddress?: string
  dropoffAddress?: string
}

class EarningsService {
  private driverShare?: number // Must be fetched from pricingconfigs table via API

  async getDriverShare(): Promise<number> {
    try {
      const url = `${API_BASE_URL}/pricing/config`
      console.log('[EarningsService] 🔍 Fetching driver share from pricingconfigs:', url)
      const response = await axios.get(url)
      console.log('[EarningsService] ✅ Pricing config response:', response.data)
      
      if (!response.data?.driverShare) {
        console.error('[EarningsService] ⚠️  No driverShare in pricing config! Using fallback 85%')
        this.driverShare = 85
        return 85
      }
      
      const shareValue = response.data.driverShare
      this.driverShare = shareValue
      console.log('[EarningsService] ✅ Driver share from pricingconfigs table:', shareValue + '%')
      return shareValue
    } catch (error: any) {
      console.error('[EarningsService] ❌ Error fetching driver share from pricingconfigs:', error?.response?.status, error?.message)
      console.log('[EarningsService] ⚠️  Using fallback driver share: 85%')
      this.driverShare = 85
      return 85
    }
  }

  async getEarningsByTimeRange(filter: 'day' | 'week' | 'month' | 'year'): Promise<EarningsData> {
    try {
      console.log('[EarningsService] 📊 Fetching earnings for filter:', filter)
      
      // Get driver share percentage
      await this.getDriverShare()
      const driverSharePercent = this.driverShare || 85
      console.log('[EarningsService] Driver share:', driverSharePercent + '%')

      // Get token
      const token = await AsyncStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      // Get driver profile to get driverId
      const profileResponse = await axios.get(`${API_BASE_URL}/drivers/me`, { headers })
      const driverId = profileResponse.data._id

      // Calculate date range
      const { startDate, endDate } = this.getDateRange(filter)
      console.log('[EarningsService] Date range:', startDate.toISOString(), 'to', endDate.toISOString())

      return this.fetchEarningsData(driverId, headers, startDate, endDate, driverSharePercent)
    } catch (error) {
      console.error('[EarningsService] ❌ Error fetching earnings:', error)
      throw error
    }
  }

  async getEarningsByDateRange(startDate: Date, endDate: Date): Promise<EarningsData> {
    try {
      console.log('[EarningsService] 📊 Fetching earnings for date range:', startDate.toISOString(), 'to', endDate.toISOString())
      
      // Get driver share percentage
      await this.getDriverShare()
      const driverSharePercent = this.driverShare || 85
      console.log('[EarningsService] Driver share:', driverSharePercent + '%')

      // Get token
      const token = await AsyncStorage.getItem('token')
      const headers = { Authorization: `Bearer ${token}` }

      // Get driver profile to get driverId
      const profileResponse = await axios.get(`${API_BASE_URL}/drivers/me`, { headers })
      const driverId = profileResponse.data._id

      return this.fetchEarningsData(driverId, headers, startDate, endDate, driverSharePercent)
    } catch (error) {
      console.error('[EarningsService] ❌ Error fetching earnings by date range:', error)
      throw error
    }
  }

  private async fetchEarningsData(
    driverId: string,
    headers: any,
    startDate: Date,
    endDate: Date,
    driverSharePercent: number
  ): Promise<EarningsData> {
    try {
      // Fetch all completed rides, combined trips, and deliveries
      const [rides, combinedTrips, deliveries] = await Promise.all([
        this.getCompletedRides(driverId, headers),
        this.getCompletedCombinedTrips(driverId, headers),
        this.getCompletedDeliveries(driverId, headers),
      ])

      console.log('[EarningsService] Fetched:', {
        rides: rides.length,
        combinedTrips: combinedTrips.length,
        deliveries: deliveries.length,
      })

      // Filter by date range AND exclude cancelled/refunded trips
      const CANCELLED_STATUSES = ['cancelled', 'canceled', 'refunded', 'failed']

      const filteredRides = rides.filter((r) => {
        const completedAt = new Date(r.completedAt)
        if (CANCELLED_STATUSES.includes(r.status)) return false // ✅ Exclude cancelled
        return completedAt >= startDate && completedAt <= endDate
      })

      const filteredCombinedTrips = combinedTrips.filter((t) => {
        const completedAt = new Date(t.completedAt)
        if (CANCELLED_STATUSES.includes(t.status)) return false // ✅ Exclude cancelled
        return completedAt >= startDate && completedAt <= endDate
      })

      const filteredDeliveries = deliveries.filter((d) => {
        const completedAt = new Date(d.completedAt || d.updatedAt)
        if (CANCELLED_STATUSES.includes(d.status)) return false // ✅ Exclude cancelled
        return completedAt >= startDate && completedAt <= endDate
      })

      console.log('[EarningsService] Filtered:', {
        rides: filteredRides.length,
        combinedTrips: filteredCombinedTrips.length,
        deliveries: filteredDeliveries.length,
      })

      // Calculate earnings (driver's share after platform fee)
      const ridesEarnings = Math.round(filteredRides.reduce((sum, r) => sum + (r.totalFare || 0), 0) * (driverSharePercent / 100))
      
      // For combined trips, use totalFare directly (backend updates it realtime)
      const combinedTripsEarnings = Math.round(filteredCombinedTrips.reduce((sum, t) => {
        return sum + (t.totalFare || 0)
      }, 0) * (driverSharePercent / 100))
      
      const deliveriesEarnings = Math.round(filteredDeliveries.reduce((sum, d) => {
        const price = typeof d.estimatedPrice === 'string' ? parseInt(d.estimatedPrice, 10) : (d.estimatedPrice || 0)
        return sum + price
      }, 0) * (driverSharePercent / 100))

      const totalEarnings = ridesEarnings + combinedTripsEarnings + deliveriesEarnings
      const totalTrips = filteredRides.length + filteredCombinedTrips.length + filteredDeliveries.length

      console.log('[EarningsService] Earnings breakdown:', {
        rides: `${filteredRides.length} trips = ${ridesEarnings.toLocaleString('vi-VN')} VND`,
        combined: `${filteredCombinedTrips.length} trips = ${combinedTripsEarnings.toLocaleString('vi-VN')} VND`,
        deliveries: `${filteredDeliveries.length} trips = ${deliveriesEarnings.toLocaleString('vi-VN')} VND`,
        total: `${totalTrips} trips = ${totalEarnings.toLocaleString('vi-VN')} VND`,
        driverShare: `${driverSharePercent}%`,
      })

      // Build transactions list
      const transactions: EarningsTransaction[] = [
        ...filteredRides.map((r) => {
          const driverEarnings = Math.round((r.totalFare || 0) * (driverSharePercent / 100))
          console.log(`[EarningsService] 🚗 Ride: totalFare=${r.totalFare}, driverShare=${driverSharePercent}%, driverEarnings=${driverEarnings}`)
          return {
            _id: r._id,
            type: 'ride' as const,
            completedAt: new Date(r.completedAt),
            totalFare: r.totalFare || 0,
            driverEarnings,
            description: `Lái xe hộ - ${r.pickupAddress?.substring(0, 30)}...`,
            pickupAddress: r.pickupAddress,
            dropoffAddress: r.dropoffAddress,
          }
        }),
        ...filteredCombinedTrips.map((t) => {
          // Use totalFare from trip (backend updates it realtime)
          const totalFare = t.totalFare || 0
          const driverEarnings = Math.round(totalFare * (driverSharePercent / 100))
          const passengerCount = Array.isArray(t.customerId) ? t.customerId.length : 0
          console.log(`[EarningsService] 👥 Combined Trip: totalFare=${totalFare}, passengers=${passengerCount}, driverShare=${driverSharePercent}%, driverEarnings=${driverEarnings}`)
          return {
            _id: t._id,
            type: 'combined_trip' as const,
            completedAt: new Date(t.completedAt),
            totalFare,
            driverEarnings,
            description: `Ghép xe từ ${t.startAddress?.substring(0, 30)}... (${passengerCount} khách)`,
            pickupAddress: t.startAddress,
            dropoffAddress: t.endAddress,
          }
        }),
        ...filteredDeliveries.map((d) => {
          const price = typeof d.estimatedPrice === 'string' ? parseInt(d.estimatedPrice, 10) : (d.estimatedPrice || 0)
          const driverEarnings = Math.round(price * (driverSharePercent / 100))
          console.log(`[EarningsService] 📦 Delivery: estimatedPrice=${price}, driverShare=${driverSharePercent}%, driverEarnings=${driverEarnings}`)
          return {
            _id: d._id,
            type: 'delivery' as const,
            completedAt: new Date(d.completedAt || d.updatedAt),
            totalFare: price,
            driverEarnings,
            description: `Giao hàng từ ${d.pickupAddress?.substring(0, 30)}...`,
            pickupAddress: d.pickupAddress,
            dropoffAddress: d.dropoffAddress,
          }
        }),
      ]

      // Sort by date (newest first)
      transactions.sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime())

      console.log('[EarningsService] ✅ Total earnings:', totalEarnings, 'from', totalTrips, 'trips')

      return {
        totalEarnings,
        totalTrips,
        ridesCount: filteredRides.length,
        ridesEarnings,
        combinedTripsCount: filteredCombinedTrips.length,
        combinedTripsEarnings,
        deliveriesCount: filteredDeliveries.length,
        deliveriesEarnings,
        transactions,
      }
    } catch (error) {
      console.error('[EarningsService] ❌ Error fetching earnings:', error)
      throw error
    }
  }

  private async getCompletedRides(driverId: string, headers: any): Promise<any[]> {
    try {
      const url = `${API_BASE_URL}/rides/driver-list/${driverId}`
      console.log('[EarningsService] 🔍 Fetching rides from:', url)
      const response = await axios.get(url, { headers })
      // ✅ Only completed rides (explicitly exclude cancelled)
      const completed = response.data.filter((r: any) =>
        r.status === 'completed' && r.completedAt && r.status !== 'cancelled'
      )
      console.log('[EarningsService] ✅ Found', completed.length, 'completed rides (excluded cancelled)')
      return completed
    } catch (error: any) {
      console.error('[EarningsService] ❌ Error fetching rides:', error?.response?.status, error?.message)
      return []
    }
  }

  private async getCompletedCombinedTrips(driverId: string, headers: any): Promise<any[]> {
    try {
      const url = `${API_BASE_URL}/combined-trips?driverId=${driverId}`
      console.log('[EarningsService] 🔍 Fetching combined trips from:', url)
      const response = await axios.get(url, { headers })
      const trips = Array.isArray(response.data) ? response.data : []
      // ✅ Only completed trips (explicitly exclude cancelled)
      const completed = trips.filter((t: any) =>
        t.status === 'completed' && t.completedAt && t.status !== 'cancelled'
      )
      console.log('[EarningsService] ✅ Found', completed.length, 'completed combined trips (excluded cancelled)')
      return completed
    } catch (error: any) {
      console.error('[EarningsService] ❌ Error fetching combined trips:', error?.response?.status, error?.message)
      return []
    }
  }

  private async getCompletedDeliveries(driverId: string, headers: any): Promise<any[]> {
    try {
      const url = `${API_BASE_URL}/delivery/driver/${driverId}`
      console.log('[EarningsService] 🔍 Fetching deliveries from:', url)
      const response = await axios.get(url, { headers })
      
      // Handle both array response and empty/non-array response
      const deliveries = Array.isArray(response.data) ? response.data : []
      const delivered = deliveries.filter((d: any) => d.status === 'delivered')
      console.log('[EarningsService] ✅ Found', delivered.length, 'delivered orders')
      return delivered
    } catch (error: any) {
      // 404 might mean no deliveries yet - not an error
      if (error?.response?.status === 404) {
        console.log('[EarningsService] ℹ️  No deliveries found for driver (404)')
        return []
      }
      console.error('[EarningsService] ❌ Error fetching deliveries:', error?.response?.status, error?.message)
      return []
    }
  }

  private getDateRange(filter: 'day' | 'week' | 'month' | 'year'): { startDate: Date; endDate: Date } {
    const now = new Date()
    const endDate = new Date()
    let startDate = new Date()

    if (filter === 'day') {
      // Today only
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (filter === 'week') {
      // Last 7 days
      startDate.setDate(now.getDate() - 6)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else if (filter === 'month') {
      // Last 30 days
      startDate.setDate(now.getDate() - 29)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    } else {
      // Last 12 months
      startDate.setMonth(now.getMonth() - 11)
      startDate.setDate(1)
      startDate.setHours(0, 0, 0, 0)
      endDate.setHours(23, 59, 59, 999)
    }

    return { startDate, endDate }
  }
}

export const earningsService = new EarningsService()
