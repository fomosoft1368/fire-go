/**
 * Google Maps API Service
 * Cung cấp các chức năng:
 * - Geocoding: Chuyển địa chỉ thành tọa độ
 * - Distance Matrix: Tính khoảng cách và thời gian di chuyển
 * 
 * NOTE: Nếu chưa có API key, sẽ sử dụng mock data để test
 */

import Constants from 'expo-constants'
import { API_BASE_URL } from '../constants/config'

/**
 * Láº¥y Google Maps API key Ä‘á»™ng tá»« remoteConfig (backend DB)
 * Fallback vá» expo-constants (build-time) náº¿u chÆ°a fetch xong
 */
function getApiKey(): string {
  // Æ¯ u tiÃªn remoteConfig (tá»« DB) â€” cÃ³ sau khi app Ä‘Ã£ khá»Ÿi Ä‘á»™ng
  // Fallback vá» giÃ¡ trá»‹ build-time tá»« app.config.js
  return Constants.expoConfig?.extra?.googleMapsApiKey || ''
}

interface Coordinates {
  latitude: number
  longitude: number
}

interface GeocodeResult {
  coordinates: Coordinates
  formattedAddress: string
}

interface DistanceMatrixResult {
  distance: number // meters
  duration: number // seconds
  distanceText: string
  durationText: string
}

interface PlacePrediction {
  placeId: string
  mainText: string
  secondaryText: string
  fullText: string
}

/**
 * Mock data cho testing khi chưa có Google Maps API key
 */
const generateMockGeocode = (address: string): GeocodeResult => {
  // Tạo tọa độ ngẫu nhiên xung quanh Hà Nội
  const baseLatitude = 21.0285
  const baseLongitude = 105.8542
  const randomOffset = () => (Math.random() - 0.5) * 0.1

  return {
    coordinates: {
      latitude: baseLatitude + randomOffset(),
      longitude: baseLongitude + randomOffset(),
    },
    formattedAddress: address || 'Hà Nội, Việt Nam',
  }
}

/**
 * Decode polyline string tá»« Google Directions API
 * @param encoded - Polyline string tá»« Google
 * @returns Array cÃ¡c tá»a Ä‘á»™
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
 * Táº¡o mock route coordinates (straight line)
 */
const generateMockRoute = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): Array<{ latitude: number; longitude: number }> => {
  const points = 20 // Sá»‘ Ä‘iá»ƒm trung gian
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
   * TÃ¬m kiáº¿m Ä‘á»‹a chá»‰ vÃ  tráº£ vá» gá»£i Ã½ (autocomplete)
   */
  async searchPlaces(input: string, sessionToken?: string, useMockFallback: boolean = false): Promise<PlacePrediction[]> {
    if (!input.trim()) {
      return []
    }

    // Náº¿u chÆ°a cÃ³ API key hoáº·c fallback Ä‘Æ°á»£c yÃªu cáº§u, return mock suggestions
    if (!getApiKey() || useMockFallback) {
      console.warn('[MapsService] Using mock place predictions for:', input)

      // Mock suggestions dá»±a trÃªn input
      const mockSuggestions: PlacePrediction[] = [
        {
          placeId: 'mock_1',
          mainText: `${input} - Hà Nội`,
          secondaryText: 'Thành phố Hà Nội',
          fullText: `${input} - Hà Nội, Thành phố Hà Nội`,
        },
        {
          placeId: 'mock_2',
          mainText: `${input} - Hoàn Kiếm`,
          secondaryText: 'Quận Hoàn Kiếm, Hà Nội',
          fullText: `${input} - Hoàn Kiếm, Quận Hoàn Kiếm, Hà Nội`,
        },
        {
          placeId: 'mock_3',
          mainText: `${input} - Thanh Xuân`,
          secondaryText: 'Quận Thanh Xuân, Hà Nội',
          fullText: `${input} - Thanh Xuân, Quận Thanh Xuân, Hà Nội`,
        },
      ]

      return mockSuggestions
    }

    try {
      // Sử dụng Google Places Autocomplete API
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&key=${getApiKey()}${sessionToken ? `&sessiontoken=${sessionToken}` : ''}`

      console.log('[MapsService] Searching places:', input)
      const response = await fetch(url)
      const data = await response.json()
      console.log('[MapsService] Places API response status:', data.status)

      if (data.status === 'REQUEST_DENIED') {
        console.error('[MapsService] âŒ Places API key invalid or not enabled')
        console.error('[MapsService] Error message:', data.error_message)
        console.warn('[MapsService] âš ï¸ Falling back to mock predictions')
        console.warn('[MapsService] ðŸ’¡ Fix: Enable Places API in Google Cloud Console and verify API key')
        // Fallback to mock data with flag to prevent infinite recursion
        return this.searchPlaces(input, sessionToken, true)
      }

      if (data.status !== 'OK' || !data.predictions) {
        console.warn('[MapsService] No predictions found:', data.status)
        return []
      }

      return data.predictions.map((prediction: any) => ({
        placeId: prediction.place_id,
        mainText: prediction.structured_formatting?.main_text || prediction.description,
        secondaryText: prediction.structured_formatting?.secondary_text || '',
        fullText: prediction.description,
      }))
    } catch (error: any) {
      console.error('[MapsService] Search places error:', error.message)
      // Fallback to mock data on error
      console.warn('[MapsService] Falling back to mock predictions due to network error')
      return this.searchPlaces(input, sessionToken, true)
    }
  },

  /**
   * TÃ¬m kiáº¿m Ä‘á»‹a chá»‰ qua backend places API
   * Æ¯u tiÃªn: Cache â†’ DB (per-user lá»‹ch sá»­) â†’ Google Places API
   * @param keyword - Tá»« khÃ³a tÃ¬m kiáº¿m
   * @param userId - ID khÃ¡ch hÃ ng Ä‘á»ƒ Æ°u tiÃªn lá»‹ch sá»­ cÃ¡ nhÃ¢n
   * @param apiBaseUrl - Base URL cá»§a backend
   */
  async searchPlacesViaBackend(keyword: string, userId?: string, apiBaseUrl?: string): Promise<PlacePrediction[]> {
    if (!keyword.trim() || keyword.trim().length < 3) {
      return []
    }

    try {
      const base = apiBaseUrl || ''
      const params = new URLSearchParams({ keyword: keyword.trim() })
      if (userId) params.append('userId', userId)

      const url = `${base}/places/search?${params.toString()}`
      console.log('[MapsService] ðŸ” Backend places search:', { keyword, userId })

      const response = await fetch(url)
      if (!response.ok) {
        console.warn('[MapsService] Backend places API error:', response.status)
        return []
      }

      const data = await response.json()
      const results: any[] = data.results || []

      console.log(`[MapsService] âœ… Backend places [${data.source}]: ${results.length} results`)

      return results.map((r: any) => ({
        placeId: r.placeId,
        mainText: r.name || r.address,
        secondaryText: r.address || '',
        fullText: r.address || r.name,
      }))
    } catch (error: any) {
      console.error('[MapsService] searchPlacesViaBackend error:', error.message)
      return []
    }
  },


  /**
   * Chuyá»ƒn tá»a Ä‘á»™ thÃ nh Ä‘á»‹a chá»‰ (Reverse Geocoding)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    console.log('[MapsService] Reverse geocoding via backend:', { latitude, longitude })
    try {
      const url =
        `${API_BASE_URL}/places/reverse-geocode?lat=${latitude}&lng=${longitude}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(
        `HTTP ${response.status}`
      )
      const data = await response.json()
      const address = data?.address
      if (address && !String(address).match(/^\d+\.\d+/)) {
        console.log('[MapsService] Reverse geocoding success:', address)
        return address
      }
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    } catch (error: any) {
      console.error('[MapsService] Reverse geocoding error:', error.message)
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    }
  },

  /**
   * Chuyá»ƒn Ä‘á»‹a chá»‰ thÃ nh tá»a Ä‘á»™ (Geocoding)
   */
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    try {
      const url =
        `${API_BASE_URL}/places/geocode?address=${encodeURIComponent(address)}`
      console.log('[MapsService] Geocoding via backend:', address)
      const response = await fetch(url)
      if (!response.ok) throw new Error(
        `HTTP ${response.status}`
      )
      const data = await response.json()
      if (data && data.lat && data.lng) {
        console.log('[MapsService] Geocoding success:', { address, data })
        return {
          coordinates: { latitude: data.lat, longitude: data.lng },
          formattedAddress: data.formattedAddress || address,
        }
      }
      return generateMockGeocode(address)
    } catch (error: any) {
      console.error('[MapsService] Geocoding error:', error.message)
      return generateMockGeocode(address)
    }
  },

  /**
   * TÃ­nh khoáº£ng cÃ¡ch vÃ  thá»i gian di chuyá»ƒn giá»¯a 2 Ä‘iá»ƒm
   */
  async getDistanceMatrix(
    origin: string,
    destination: string
  ): Promise<DistanceMatrixResult> {
    // Náº¿u chÆ°a cÃ³ API key, sá»­ dá»¥ng mock data
    if (!getApiKey()) {
      console.warn('[MapsService] Using mock data for distance matrix')
      await new Promise(resolve => setTimeout(resolve, 500))

      // Mock: khoáº£ng cÃ¡ch ngáº«u nhiÃªn 3-15km, thá»i gian tÆ°Æ¡ng á»©ng
      const distanceKm = 3 + Math.random() * 12
      const distanceMeters = Math.round(distanceKm * 1000)
      const durationSeconds = Math.round(distanceKm * 180) // ~3 phÃºt/km

      return {
        distance: distanceMeters,
        duration: durationSeconds,
        distanceText: `${distanceKm.toFixed(1)} km`,
        durationText: `${Math.round(durationSeconds / 60)} phút`,
      }
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(
        origin
      )}&destinations=${encodeURIComponent(destination)}&key=${getApiKey()}`

      console.log('[MapsService] Getting distance matrix:', { origin, destination })
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === 'REQUEST_DENIED') {
        console.error('[MapsService] API key invalid')
        console.warn('[MapsService] Falling back to mock distance data')

        const distanceKm = 3 + Math.random() * 12
        const distanceMeters = Math.round(distanceKm * 1000)
        const durationSeconds = Math.round(distanceKm * 180)

        return {
          distance: distanceMeters,
          duration: durationSeconds,
          distanceText: `${distanceKm.toFixed(1)} km`,
          durationText: `${Math.round(durationSeconds / 60)} phút`,
        }
      }

      if (data.status !== 'OK') {
        console.warn(`[MapsService] Distance Matrix API returned status: ${data.status}`)
        console.warn('[MapsService] Falling back to mock distance data')

        const distanceKm = 3 + Math.random() * 12
        const distanceMeters = Math.round(distanceKm * 1000)
        const durationSeconds = Math.round(distanceKm * 180)

        return {
          distance: distanceMeters,
          duration: durationSeconds,
          distanceText: `${distanceKm.toFixed(1)} km`,
          durationText: `${Math.round(durationSeconds / 60)} phút`,
        }
      }

      if (
        !data.rows ||
        data.rows.length === 0 ||
        !data.rows[0].elements ||
        data.rows[0].elements.length === 0
      ) {
        console.warn('[MapsService] No rows or elements in Distance Matrix response')
        console.warn('[MapsService] Falling back to mock distance data')

        const distanceKm = 3 + Math.random() * 12
        const distanceMeters = Math.round(distanceKm * 1000)
        const durationSeconds = Math.round(distanceKm * 180)

        return {
          distance: distanceMeters,
          duration: durationSeconds,
          distanceText: `${distanceKm.toFixed(1)} km`,
          durationText: `${Math.round(durationSeconds / 60)} phút`,
        }
      }

      const element = data.rows[0].elements[0]

      if (element.status !== 'OK') {
        console.warn(`[MapsService] Element status is not OK: ${element.status}`)
        console.warn('[MapsService] Falling back to mock distance data')

        const distanceKm = 3 + Math.random() * 12
        const distanceMeters = Math.round(distanceKm * 1000)
        const durationSeconds = Math.round(distanceKm * 180)

        return {
          distance: distanceMeters,
          duration: durationSeconds,
          distanceText: `${distanceKm.toFixed(1)} km`,
          durationText: `${Math.round(durationSeconds / 60)} phút`,
        }
      }

      return {
        distance: element.distance.value, // meters
        duration: element.duration.value, // seconds
        distanceText: element.distance.text,
        durationText: element.duration.text,
      }
    } catch (error: any) {
      console.error('[MapsService] Distance Matrix error:', error)
      console.warn('[MapsService] Falling back to mock distance data')

      const distanceKm = 3 + Math.random() * 12
      const distanceMeters = Math.round(distanceKm * 1000)
      const durationSeconds = Math.round(distanceKm * 180)

      return {
        distance: distanceMeters,
        duration: durationSeconds,
        distanceText: `${distanceKm.toFixed(1)} km`,
        durationText: `${Math.round(durationSeconds / 60)} phút`,
      }
    }
  },

  /**
   * Lấy thông tin đường đi (polyline) từ Google Directions API
   */
  async getDirections(
    origin: string,
    destination: string
  ): Promise<Array<{ latitude: number; longitude: number }>> {
    // Náº¿u chÆ°a cÃ³ API key, táº¡o mock route
    if (!getApiKey()) {
      console.warn('[MapsService] Using mock route data')
      await new Promise(resolve => setTimeout(resolve, 300))

      // Táº¡o route tháº³ng giá»¯a 2 Ä‘iá»ƒm ngáº«u nhiÃªn
      const start = generateMockGeocode(origin).coordinates
      const end = generateMockGeocode(destination).coordinates
      return generateMockRoute(start, end)
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(destination)}&key=${getApiKey()}`

      console.log('[MapsService] Getting directions:', { origin, destination })
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === 'REQUEST_DENIED') {
        console.error('[MapsService] Directions API key invalid')
        console.warn('[MapsService] Falling back to mock route')

        const start = generateMockGeocode(origin).coordinates
        const end = generateMockGeocode(destination).coordinates
        return generateMockRoute(start, end)
      }

      if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
        throw new Error(`Directions failed: ${data.status}`)
      }

      const route = data.routes[0]
      const polyline = route.overview_polyline.points

      return decodePolyline(polyline)
    } catch (error: any) {
      console.error('[MapsService] Directions error:', error)
      console.warn('[MapsService] Falling back to mock route')

      const start = generateMockGeocode(origin).coordinates
      const end = generateMockGeocode(destination).coordinates
      return generateMockRoute(start, end)
    }
  },

  /**
   * Láº¥y thÃ´ng tin Ä‘áº§y Ä‘á»§: tá»a Ä‘á»™ + khoáº£ng cÃ¡ch + Ä‘Æ°á»ng Ä‘i cho 2 Ä‘á»‹a chá»‰
   */
  async getRouteInfo(pickupAddress: string, dropoffAddress: string) {
    try {
      if (!getApiKey()) {
        console.warn('[MapsService] Đang sử dụng dữ liệu giả lập(Mock Data)')
        console.warn('[MapsService] Để sử dụng Google Maps thật vui lòng cấu hình API key trong file .env')
      }

      console.log('[MapsService]  Getting route info:', { pickupAddress, dropoffAddress })

      // Láº¥y tá»a Ä‘á»™ vÃ  khoáº£ng cÃ¡ch song song
      const [pickupGeocode, dropoffGeocode, distanceMatrix, routeCoordinates] = await Promise.all([
        this.geocodeAddress(pickupAddress),
        this.geocodeAddress(dropoffAddress),
        this.getDistanceMatrix(pickupAddress, dropoffAddress),
        this.getDirections(pickupAddress, dropoffAddress),
      ])

      const result = {
        pickup: pickupGeocode,
        dropoff: dropoffGeocode,
        distance: distanceMatrix.distance / 1000, // convert to km
        duration: Math.round(distanceMatrix.duration / 60), // convert to minutes
        distanceText: distanceMatrix.distanceText,
        durationText: distanceMatrix.durationText,
        routeCoordinates, // ÄÆ°á»ng Ä‘i
        isMockData: !getApiKey(), // ÄÃ¡nh dáº¥u lÃ  mock data
      }

      console.log('[MapsService] âœ… Route info complete:', {
        pickup: result.pickup.formattedAddress,
        dropoff: result.dropoff.formattedAddress,
        distance: result.distance,
        duration: result.duration,
        routePointsCount: routeCoordinates?.length || 0,
      })

      return result
    } catch (error: any) {
      console.error('[MapsService] Get route info error:', error)
      throw error
    }
  },
}

