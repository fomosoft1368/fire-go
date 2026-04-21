/**
 * Google Maps API Service cho Mobile Driver
 * Dựa trên mapsService của mobile-customer
 */

import Constants from 'expo-constants'

/**
 * Lấy Google Maps API key từ cấu hình môi trường (.env)
 * Thông qua Constants.expoConfig.extra hoac process.env
 */
function getApiKey(): string {
  return process.env.GOOGLE_MAPS_API_KEY || Constants.expoConfig?.extra?.googleMapsApiKey || ''
}

interface Coordinates {
  latitude: number
  longitude: number
}

/**
 * Decode polyline string từ Google Directions API
 */
const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
  const points: Array<{ latitude: number; longitude: number }> = []
  let index = 0
  const len = encoded.length
  let lat = 0
  let lng = 0

  while (index < len) {
    let b
    let shift = 0
    let result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lat += dlat

    shift = 0
    result = 0

    do {
      b = encoded.charCodeAt(index++) - 63
      result |= (b & 0x1f) << shift
      shift += 5
    } while (b >= 0x20)

    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
    lng += dlng

    points.push({
      latitude: lat / 1e5,
      longitude: lng / 1e5,
    })
  }

  return points
}

/**
 * Tạo mock route coordinates (straight line) - fallback khi API fail
 */
const generateMockRoute = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): Array<{ latitude: number; longitude: number }> => {
  const points = 20 // Số điểm trung gian
  const route: Array<{ latitude: number; longitude: number }> = []

  for (let i = 0; i <= points; i++) {
    const ratio = i / points
    route.push({
      latitude: start.latitude + (end.latitude - start.latitude) * ratio,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio,
    })
  }

  return route
}

export const mapsService = {
  /**
   * Lấy thông tin đường đi (polyline) và distance/duration từ Google Directions API
   */
  async getRouteInfo(pickupAddress: string, dropoffAddress: string) {
    try {
      console.log('[MapsService] 🗺️ Getting route from:', pickupAddress, 'to:', dropoffAddress)

      // Xoá khoảng trắng trùng lặp hoặc khoảng trắng sau dấu phẩy để Google API không bị hiểu nhầm toạ độ
      const cleanOrigin = pickupAddress.replace(/,\s+/g, ',').trim()
      const cleanDest = dropoffAddress.replace(/,\s+/g, ',').trim()

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        cleanOrigin
      )}&destination=${encodeURIComponent(cleanDest)}&key=${getApiKey()}&mode=driving`

      const response = await fetch(url)
      const data = await response.json()

      console.log('[MapsService] API status:', data.status)

      if (data.status === 'REQUEST_DENIED') {
        console.warn('[MapsService] ⚠️ API key invalid, using mock data')

        // Parse coordinates từ address string
        const pickupParts = pickupAddress.split(',')
        const dropoffParts = dropoffAddress.split(',')

        const start = {
          latitude: parseFloat(pickupParts[0]),
          longitude: parseFloat(pickupParts[1]),
        }
        const end = {
          latitude: parseFloat(dropoffParts[0]),
          longitude: parseFloat(dropoffParts[1]),
        }

        return {
          pickup: {
            formattedAddress: pickupAddress,
            coordinates: start,
          },
          dropoff: {
            formattedAddress: dropoffAddress,
            coordinates: end,
          },
          routeCoordinates: generateMockRoute(start, end),
          distance: 5000, // meters
          duration: 600, // seconds
          isMockData: true,
        }
      }

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        console.warn('[MapsService] ⚠️ No route found:', data.status)
        throw new Error('Không tìm thấy đường đi')
      }

      const route = data.routes[0]
      const leg = route.legs[0]

      // Decode polyline
      const polyline = route.overview_polyline.points
      const routeCoordinates = decodePolyline(polyline)

      console.log('[MapsService] ✅ Route decoded:', routeCoordinates.length, 'points')
      console.log('[MapsService] Distance:', leg.distance.value, 'meters')
      console.log('[MapsService] Duration:', leg.duration.value, 'seconds')

      return {
        pickup: {
          formattedAddress: leg.start_address,
          coordinates: {
            latitude: leg.start_location.lat,
            longitude: leg.start_location.lng,
          },
        },
        dropoff: {
          formattedAddress: leg.end_address,
          coordinates: {
            latitude: leg.end_location.lat,
            longitude: leg.end_location.lng,
          },
        },
        routeCoordinates,
        distance: leg.distance.value, // meters
        duration: leg.duration.value, // seconds
        isMockData: false,
      }
    } catch (error: any) {
      console.error('[MapsService] ❌ Error:', error.message)

      // Fallback: tạo mock route
      try {
        const pickupParts = pickupAddress.split(',')
        const dropoffParts = dropoffAddress.split(',')

        const start = {
          latitude: parseFloat(pickupParts[0]),
          longitude: parseFloat(pickupParts[1]),
        }
        const end = {
          latitude: parseFloat(dropoffParts[0]),
          longitude: parseFloat(dropoffParts[1]),
        }

        return {
          pickup: {
            formattedAddress: pickupAddress,
            coordinates: start,
          },
          dropoff: {
            formattedAddress: dropoffAddress,
            coordinates: end,
          },
          routeCoordinates: generateMockRoute(start, end),
          distance: 5000,
          duration: 600,
          isMockData: true,
        }
      } catch (parseError) {
        console.error('[MapsService] ❌ Parse error:', parseError)
        return {
          pickup: {
            formattedAddress: pickupAddress,
            coordinates: { latitude: 21.0285, longitude: 105.8542 },
          },
          dropoff: {
            formattedAddress: dropoffAddress,
            coordinates: { latitude: 21.0385, longitude: 105.8642 },
          },
          routeCoordinates: [],
          distance: 0,
          duration: 0,
          isMockData: true,
        }
      }
    }
  },
}
