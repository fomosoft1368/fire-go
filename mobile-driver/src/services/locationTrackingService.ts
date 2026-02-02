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
      // Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.warn('[LocationTracking] ⚠️ Location permission not granted')
        return
      }

      // Request background permissions for continuous tracking
      const bgStatus = await Location.requestBackgroundPermissionsAsync()
      console.log('[LocationTracking] Background permission:', bgStatus.status)

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
