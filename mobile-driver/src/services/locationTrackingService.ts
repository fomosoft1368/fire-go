import * as Location from 'expo-location'
import { driverService } from './driverService'

class LocationTrackingService {
  private locationSubscription: Location.LocationSubscription | null = null
  private driverId: string | null = null
  private isTracking: boolean = false
  private updateInterval: NodeJS.Timeout | null = null
  private lastLocation: { lng: number; lat: number } | null = null

  async startTracking(driverId: string) {
    if (this.isTracking && this.driverId === driverId) {
      console.log('[LocationTracking] Already tracking for driver:', driverId)
      return
    }

    console.log('[LocationTracking] 🎯 Starting location tracking for driver:', driverId)
    this.driverId = driverId

    try {
      // First, check if permission is already granted
      const currentPermission = await Location.getForegroundPermissionsAsync()
      console.log('[LocationTracking] Current foreground permission status:', currentPermission.status)

      // Request permissions if not already granted
      let status = currentPermission.status
      if (status !== 'granted') {
        console.log('[LocationTracking] 📍 Requesting foreground location permission...')
        const { status: newStatus } = await Location.requestForegroundPermissionsAsync()
        status = newStatus
        console.log('[LocationTracking] Permission request result:', status)
      }

      if (status !== 'granted') {
        console.warn('[LocationTracking] ⚠️ Permission not granted, but continuing with geolocation...')
        // Don't return - try anyway
      } else {
        console.log('[LocationTracking] ✅ Foreground permission granted')
      }

      // Request background permissions for continuous tracking (optional)
      try {
        console.log('[LocationTracking] 📍 Requesting background location permission...')
        const bgStatus = await Location.requestBackgroundPermissionsAsync()
        console.log('[LocationTracking] Background permission:', bgStatus.status)
      } catch (bgError: any) {
        console.warn('[LocationTracking] ⚠️ Background permission failed (non-critical):', bgError.message)
        // Background permission is optional for delivery tracking
      }

      // Start watching location with high accuracy
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000, // Update every 3 seconds
          distanceInterval: 5, // Or when moved 5 meters (more sensitive)
        },
        (location) => {
          const { latitude, longitude } = location.coords
          this.lastLocation = { lng: longitude, lat: latitude }
          console.log('[LocationTracking] 📍 New location:', {
            lat: latitude,
            lng: longitude,
            driverId: this.driverId,
            timestamp: new Date().toISOString(),
          })

          // Immediately send to server on each location update
          this.sendLocationToServer()
        }
      )

      this.isTracking = true

      // Also start periodic updates as backup
      this.startServerUpdates()
    } catch (error) {
      console.error('[LocationTracking] ❌ Error starting location tracking:', error)
      console.error('[LocationTracking] Error name:', (error as any)?.name)
      console.error('[LocationTracking] Error message:', (error as any)?.message)
      console.error('[LocationTracking] Error code:', (error as any)?.code)
      console.error('[LocationTracking] Error stack:', (error as any)?.stack?.substring(0, 500))
    }
  }

  private async sendLocationToServer() {
    if (!this.lastLocation || !this.driverId) return

    try {
      const { lng, lat } = this.lastLocation
      
      await driverService.updateLocation(this.driverId, {
        coordinates: [lng, lat],
      })

      console.log('[LocationTracking] ✅ Location sent to server:', {
        driverId: this.driverId,
        lng,
        lat,
      })
    } catch (error: any) {
      console.warn('[LocationTracking] ⚠️ Failed to send location:', error.message)
    }
  }

  private startServerUpdates() {
    // Clear existing interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
    }

    // Backup periodic updates every 5 seconds (in case location updates are slow)
    this.updateInterval = setInterval(async () => {
      if (this.lastLocation && this.driverId) {
        await this.sendLocationToServer()
      }
    }, 5000) // Every 5 seconds as backup
  }

  async stopTracking() {
    console.log('[LocationTracking] 🛑 Stopping location tracking')
    
    if (this.locationSubscription) {
      this.locationSubscription.remove()
      this.locationSubscription = null
    }

    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    this.isTracking = false
    this.driverId = null
    this.lastLocation = null
  }

  getLastLocation() {
    return this.lastLocation
  }

  isCurrentlyTracking() {
    return this.isTracking
  }
}

export const locationTrackingService = new LocationTrackingService()
