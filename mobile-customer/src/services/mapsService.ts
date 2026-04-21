/**
 * Google Maps API Service
 * Cung cáº¥p cÃ¡c chá»©c nÄƒng:
 * - Geocoding: Chuyá»ƒn Ä‘á»‹a chá»‰ thÃ nh tá»a Ä‘á»™
 * - Distance Matrix: TÃ­nh khoáº£ng cÃ¡ch vÃ  thá»i gian di chuyá»ƒn
 * 
 * NOTE: Náº¿u chÆ°a cÃ³ API key, sáº½ sá»­ dá»¥ng mock data Ä‘á»ƒ test
 */

import Constants from 'expo-constants'
import { API_BASE_URL } from '../constants/config'
import { loggerService } from './loggerService'

function getApiKey(): string {
  // Ưu tiên lấy từ biến môi trường (EXPO_PUBLIC_GOOGLE_MAPS_API_KEY)
  return process.env.GOOGLE_MAPS_API_KEY || Constants.expoConfig?.extra?.googleMapsApiKey || 'AIzaSyCR0-z2gtK6ax9qhn3Mhz87oclK84QXrIo'
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
 * Mock data cho testing khi chÆ°a cÃ³ Google Maps API key
 */
const generateMockGeocode = (address: string): GeocodeResult => {
  // Táº¡o tá»a Ä‘á»™ ngáº«u nhiÃªn xung quanh HÃ  Ná»™i
  const baseLatitude = 21.0285
  const baseLongitude = 105.8542
  const randomOffset = () => (Math.random() - 0.5) * 0.1

  return {
    coordinates: {
      latitude: baseLatitude + randomOffset(),
      longitude: baseLongitude + randomOffset(),
    },
    formattedAddress: address || 'HÃ  Ná»™i, Viá»‡t Nam',
  }
}

/**
 * Decode polyline string tÃ¡Â»Â« Google Directions API
 * @param encoded - Polyline string tÃ¡Â»Â« Google
 * @returns Array cÃƒÂ¡c tÃ¡Â»Âa Ã„â€˜Ã¡Â»â„¢
 */
const decodePolyline = (encoded: string): Array<{ latitude: number; longitude: number }> => {
  try {
    const points: Array<{ latitude: number; longitude: number }> = []
    let index = 0
    const len = encoded.length
    let lat = 0
    let lng = 0

    while (index < len) {
      let b
      let shift = 0
      let result = 0

      // Fixed string charCode index out of bounds checking
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (index < len && b >= 0x20)

      const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
      lat += dlat

      shift = 0
      result = 0

      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (index < len && b >= 0x20)

      const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1
      lng += dlng

      points.push({
        latitude: lat / 1e5,
        longitude: lng / 1e5,
      })
    }

    return points
  } catch (error) {
    loggerService.logFrontendError('mapsService.decodePolyline', error, { encoded });
    return [];
  }
}

/**
 * TÃ¡ÂºÂ¡o mock route coordinates (straight line)
 */
const generateMockRoute = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
): Array<{ latitude: number; longitude: number }> => {
  const points = 20 // SÃ¡Â»â€˜ Ã„â€˜iÃ¡Â»Æ’m trung gian
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
   * TÃƒÂ¬m kiÃ¡ÂºÂ¿m Ã„â€˜Ã¡Â»â€¹a chÃ¡Â»â€° vÃƒÂ  trÃ¡ÂºÂ£ vÃ¡Â»Â gÃ¡Â»Â£i ÃƒÂ½ (autocomplete)
   */
  async searchPlaces(input: string, sessionToken?: string, useMockFallback: boolean = false): Promise<PlacePrediction[]> {
    if (!input.trim()) {
      return []
    }

    // NÃ¡ÂºÂ¿u chÃ†Â°a cÃƒÂ³ API key hoÃ¡ÂºÂ·c fallback Ã„â€˜Ã†Â°Ã¡Â»Â£c yÃƒÂªu cÃ¡ÂºÂ§u, return mock suggestions
    if (!getApiKey() || useMockFallback) {
      console.warn('[MapsService] Using mock place predictions for:', input)

      // Mock suggestions dÃ¡Â»Â±a trÃƒÂªn input
      const mockSuggestions: PlacePrediction[] = [
        {
          placeId: 'mock_1',
          mainText: `${input} - HÃ  Ná»™i`,
          secondaryText: 'ThÃ nh phá»‘ HÃ  Ná»™i',
          fullText: `${input} - HÃ  Ná»™i, ThÃ nh phá»‘ HÃ  Ná»™i`,
        },
        {
          placeId: 'mock_2',
          mainText: `${input} - HoÃ n Kiáº¿m`,
          secondaryText: 'Quáº­n HoÃ n Kiáº¿m, HÃ  Ná»™i',
          fullText: `${input} - HoÃ n Kiáº¿m, Quáº­n HoÃ n Kiáº¿m, HÃ  Ná»™i`,
        },
        {
          placeId: 'mock_3',
          mainText: `${input} - Thanh XuÃ¢n`,
          secondaryText: 'Quáº­n Thanh XuÃ¢n, HÃ  Ná»™i',
          fullText: `${input} - Thanh XuÃ¢n, Quáº­n Thanh XuÃ¢n, HÃ  Ná»™i`,
        },
      ]

      return mockSuggestions
    }

    try {
      // Sá»­ dá»¥ng Google Places Autocomplete API
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        input
      )}&key=${getApiKey()}${sessionToken ? `&sessiontoken=${sessionToken}` : ''}`

      console.log('[MapsService] Searching places:', input)
      const response = await fetch(url)
      const data = await response.json()
      console.log('[MapsService] Places API response status:', data.status)

      if (data.status === 'REQUEST_DENIED') {
        console.error('[MapsService] Ã¢ÂÅ’ Places API key invalid or not enabled')
        console.error('[MapsService] Error message:', data.error_message)
        console.warn('[MapsService] Ã¢Å¡Â Ã¯Â¸Â Falling back to mock predictions')
        console.warn('[MapsService] Ã°Å¸â€™Â¡ Fix: Enable Places API in Google Cloud Console and verify API key')
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
   * TÃƒÂ¬m kiÃ¡ÂºÂ¿m Ã„â€˜Ã¡Â»â€¹a chÃ¡Â»â€° qua backend places API
   * Ã†Â¯u tiÃƒÂªn: Cache Ã¢â€ â€™ DB (per-user lÃ¡Â»â€¹ch sÃ¡Â»Â­) Ã¢â€ â€™ Google Places API
   * @param keyword - TÃ¡Â»Â« khÃƒÂ³a tÃƒÂ¬m kiÃ¡ÂºÂ¿m
   * @param userId - ID khÃƒÂ¡ch hÃƒÂ ng Ã„â€˜Ã¡Â»Æ’ Ã†Â°u tiÃƒÂªn lÃ¡Â»â€¹ch sÃ¡Â»Â­ cÃƒÂ¡ nhÃƒÂ¢n
   * @param apiBaseUrl - Base URL cÃ¡Â»Â§a backend
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
      console.log('[MapsService] Ã°Å¸â€Â Backend places search:', { keyword, userId })

      const response = await fetch(url)
      if (!response.ok) {
        console.warn('[MapsService] Backend places API error:', response.status)
        return []
      }

      const data = await response.json()
      const results: any[] = data.results || []

      console.log(`[MapsService] Ã¢Å“â€¦ Backend places [${data.source}]: ${results.length} results`)

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
   * ChuyÃ¡Â»Æ’n tÃ¡Â»Âa Ã„â€˜Ã¡Â»â„¢ thÃƒÂ nh Ã„â€˜Ã¡Â»â€¹a chÃ¡Â»â€° (Reverse Geocoding)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    console.log('[MapsService] Reverse geocoding via backend:', { latitude, longitude })
    try {
      const url =
        `${API_BASE_URL}/places/reverse-geocode?lat=${latitude}&lng=${longitude}`
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const text = await response.text()
      const data = text ? JSON.parse(text) : null
      
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
   * ChuyÃ¡Â»Æ’n Ã„â€˜Ã¡Â»â€¹a chÃ¡Â»â€° thÃƒÂ nh tÃ¡Â»Âa Ã„â€˜Ã¡Â»â„¢ (Geocoding)
   */
  async geocodeAddress(address: string, userId?: string): Promise<GeocodeResult> {
    try {
      const url =
        `${API_BASE_URL}/places/geocode?address=${encodeURIComponent(address)}`
      console.log('[MapsService] Geocoding via backend:', address)
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      
      const text = await response.text()
      const data = text ? JSON.parse(text) : null

      if (data && data.lat && data.lng) {
        console.log('[MapsService] Geocoding success:', { address, data })
        return {
          coordinates: { latitude: data.lat, longitude: data.lng },
          formattedAddress: data.formattedAddress || address,
        }
      }
      return mapsService.fallbackToDatabaseSearch(address, userId)
    } catch (error: any) {
      console.error('[MapsService] Geocoding error:', error.message)
      return mapsService.fallbackToDatabaseSearch(address, userId)
    }
  },

  /**
   * Fallback: Tìm địa chỉ trong DB nếu API chính không trả về kết quả
   */
  async fallbackToDatabaseSearch(address: string, userId?: string): Promise<GeocodeResult> {
    try {
      const params = new URLSearchParams({ keyword: address.trim() })
      if (userId) params.append('userId', userId)

      const url = `${API_BASE_URL}/places/search?${params.toString()}`
      console.log('[MapsService] Fallback DB geocode for:', address)
      
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        const results = data.results || []
        if (results.length > 0) {
          const first = results[0]
          
          // Ưu tiên 1: Đã có toạ độ thực trong DB
          if (first.lat && first.lng) {
            console.log('[MapsService] Found DB fallback (Cached Coordinates):', first.address || address)
            return {
              coordinates: { latitude: first.lat, longitude: first.lng },
              formattedAddress: first.address || address,
            }
          }
          // Ưu tiên 2: DB chỉ có placeId lưu tạm (Lazy loading), tiến hành gọi để lấy Toạ Độ từ Google
          else if (first.placeId) {
            console.log('[MapsService] Fetching real coordinates for cached placeId:', first.placeId)
            const detailRes = await fetch(`${API_BASE_URL}/places/details/${first.placeId}`)
            if (detailRes.ok) {
              const detailData = await detailRes.json()
              if (detailData && detailData.lat && detailData.lng) {
                console.log('[MapsService] Fetched details coordinates success')
                return {
                  coordinates: { latitude: detailData.lat, longitude: detailData.lng },
                  formattedAddress: detailData.address || first.address || address,
                }
              }
            }
          }
        }
      }
      throw new Error("Not found in DB")
    } catch (err: any) {
      console.error('[MapsService] DB geocode fallback error:', err.message)
      throw new Error(`Không tìm thấy toạ độ cho: ${address}`)
    }
  },

  /**
   * TÃƒÂ­nh khoÃ¡ÂºÂ£ng cÃƒÂ¡ch vÃƒÂ  thÃ¡Â»Âi gian di chuyÃ¡Â»Æ’n giÃ¡Â»Â¯a 2 Ã„â€˜iÃ¡Â»Æ’m
   */
  async getDistanceMatrix(
    origin: string,
    destination: string
  ): Promise<DistanceMatrixResult> {
    // NÃ¡ÂºÂ¿u chÃ†Â°a cÃƒÂ³ API key, sÃ¡Â»Â­ dÃ¡Â»Â¥ng mock data
    if (!getApiKey()) {
      console.warn('[MapsService] Using mock data for distance matrix')
      await new Promise(resolve => setTimeout(resolve, 500))

      // Mock: khoÃ¡ÂºÂ£ng cÃƒÂ¡ch ngÃ¡ÂºÂ«u nhiÃƒÂªn 3-15km, thÃ¡Â»Âi gian tÃ†Â°Ã†Â¡ng Ã¡Â»Â©ng
      const distanceKm = 3 + Math.random() * 12
      const distanceMeters = Math.round(distanceKm * 1000)
      const durationSeconds = Math.round(distanceKm * 180) // ~3 phÃƒÂºt/km

      return {
        distance: distanceMeters,
        duration: durationSeconds,
        distanceText: `${distanceKm.toFixed(1)} km`,
        durationText: `${Math.round(durationSeconds / 60)} phÃºt`,
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
          durationText: `${Math.round(durationSeconds / 60)} phÃºt`,
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
          durationText: `${Math.round(durationSeconds / 60)} phÃºt`,
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
          durationText: `${Math.round(durationSeconds / 60)} phÃºt`,
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
          durationText: `${Math.round(durationSeconds / 60)} phÃºt`,
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
        durationText: `${Math.round(durationSeconds / 60)} phÃºt`,
      }
    }
  },

  /**
   * Láº¥y thÃ´ng tin Ä‘Æ°á»ng Ä‘i (polyline) tá»« Google Directions API
   */
  async getDirections(
    origin: string,
    destination: string
  ): Promise<Array<{ latitude: number; longitude: number }>> {
    // NÃ¡ÂºÂ¿u chÃ†Â°a cÃƒÂ³ API key, tÃ¡ÂºÂ¡o mock route
    if (!getApiKey()) {
      console.warn('[MapsService] Using mock route data')
      await new Promise(resolve => setTimeout(resolve, 300))

      // TÃ¡ÂºÂ¡o route thÃ¡ÂºÂ³ng giÃ¡Â»Â¯a 2 Ã„â€˜iÃ¡Â»Æ’m ngÃ¡ÂºÂ«u nhiÃƒÂªn
      const start = generateMockGeocode(origin).coordinates
      const end = generateMockGeocode(destination).coordinates
      return generateMockRoute(start, end)
    }

    try {
      // Xoá khoảng trắng trùng lặp hoặc khoảng trắng sau dấu phẩy (Google API khắt khe với tọa độ có khoảng trắng)
      const cleanOrigin = origin.replace(/,\s+/g, ',').trim()
      const cleanDest = destination.replace(/,\s+/g, ',').trim()

      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        cleanOrigin
      )}&destination=${encodeURIComponent(cleanDest)}&key=${getApiKey()}`

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
   * LÃ¡ÂºÂ¥y thÃƒÂ´ng tin Ã„â€˜Ã¡ÂºÂ§y Ã„â€˜Ã¡Â»Â§: tÃ¡Â»Âa Ã„â€˜Ã¡Â»â„¢ + khoÃ¡ÂºÂ£ng cÃƒÂ¡ch + Ã„â€˜Ã†Â°Ã¡Â»Âng Ã„â€˜i cho 2 Ã„â€˜Ã¡Â»â€¹a chÃ¡Â»â€°
   */
  async getRouteInfo(pickupAddress: string, dropoffAddress: string, userId?: string) {
    try {
      if (!getApiKey()) {
        console.warn('[MapsService] Äang sá»­ dá»¥ng dá»¯ liá»‡u giáº£ láº­p(Mock Data)')
        console.warn('[MapsService] Äá»ƒ sá»­ dá»¥ng Google Maps tháº­t vui lÃ²ng cáº¥u hÃ¬nh API key trong file .env')
      }

      console.log('[MapsService]  Getting route info:', { pickupAddress, dropoffAddress })

      // LÃ¡ÂºÂ¥y tÃ¡Â»Âa Ã„â€˜Ã¡Â»â„¢ vÃƒÂ  khoÃ¡ÂºÂ£ng cÃƒÂ¡ch song song
      const [pickupGeocode, dropoffGeocode] = await Promise.all([
        this.geocodeAddress(pickupAddress, userId),
        this.geocodeAddress(dropoffAddress, userId)
      ])
      const o = pickupGeocode?.coordinates?.latitude && pickupGeocode?.coordinates?.longitude
        ? `${pickupGeocode.coordinates.latitude},${pickupGeocode.coordinates.longitude}` : pickupAddress;
      const d = dropoffGeocode?.coordinates?.latitude && dropoffGeocode?.coordinates?.longitude
        ? `${dropoffGeocode.coordinates.latitude},${dropoffGeocode.coordinates.longitude}` : dropoffAddress;
      const [distanceMatrix, routeCoordinates] = await Promise.all([
        this.getDistanceMatrix(o, d),
        this.getDirections(o, d)
      ])

      const result = {
        pickup: pickupGeocode,
        dropoff: dropoffGeocode,
        distance: distanceMatrix.distance / 1000, // convert to km
        duration: Math.round(distanceMatrix.duration / 60), // convert to minutes
        distanceText: distanceMatrix.distanceText,
        durationText: distanceMatrix.durationText,
        routeCoordinates, // Ã„ÂÃ†Â°Ã¡Â»Âng Ã„â€˜i
        isMockData: !getApiKey(), // Ã„ÂÃƒÂ¡nh dÃ¡ÂºÂ¥u lÃƒÂ  mock data
      }

      console.log('[MapsService] Ã¢Å“â€¦ Route info complete:', {
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


