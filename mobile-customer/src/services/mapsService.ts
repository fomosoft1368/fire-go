/**
 * Google Maps API Service
 * Cung cấp các chức năng:
 * - Geocoding: Chuyển địa chỉ thành tọa độ
 * - Distance Matrix: Tính khoảng cách và thời gian di chuyển
 * 
 * NOTE: Nếu chưa có API key, sẽ sử dụng mock data để test
 */

import Constants from 'expo-constants'

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey || process.env.GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY_HERE'
const USE_MOCK_DATA = !GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY_HERE'

// Log để debug
console.log('[MapsService] API Key configured:', GOOGLE_MAPS_API_KEY ? `${GOOGLE_MAPS_API_KEY.substring(0, 10)}...` : 'NOT SET')
console.log('[MapsService] USE_MOCK_DATA:', USE_MOCK_DATA)

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
 * Decode polyline string từ Google Directions API
 * @param encoded - Polyline string từ Google
 * @returns Array các tọa độ
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
 * Tạo mock route coordinates (straight line)
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
   * Tìm kiếm địa chỉ và trả về gợi ý (autocomplete)
   */
  async searchPlaces(input: string, sessionToken?: string, useMockFallback: boolean = false): Promise<PlacePrediction[]> {
    if (!input.trim()) {
      return []
    }

    // Nếu chưa có API key hoặc fallback được yêu cầu, return mock suggestions
    if (USE_MOCK_DATA || useMockFallback) {
      console.warn('[MapsService] Using mock place predictions for:', input)
      
      // Mock suggestions dựa trên input
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
      )}&key=${GOOGLE_MAPS_API_KEY}${sessionToken ? `&sessiontoken=${sessionToken}` : ''}`
       
      console.log('[MapsService] Searching places:', input)
      const response = await fetch(url)
      const data = await response.json()
      console.log('[MapsService] Places API response status:', data.status)
      
      if (data.status === 'REQUEST_DENIED') {
        console.error('[MapsService] ❌ Places API key invalid or not enabled')
        console.error('[MapsService] Error message:', data.error_message)
        console.warn('[MapsService] ⚠️ Falling back to mock predictions')
        console.warn('[MapsService] 💡 Fix: Enable Places API in Google Cloud Console and verify API key')
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
   * Chuyển tọa độ thành địa chỉ (Reverse Geocoding)
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<string> {
    console.log('[MapsService] 🌍 Reverse geocoding:', { latitude, longitude })

    // Nếu chưa có API key, sử dụng mock data
    if (USE_MOCK_DATA) {
      console.warn('[MapsService] ⚠️ Using MOCK data for reverse geocoding')
      await new Promise(resolve => setTimeout(resolve, 300)) // Simulate delay
      return `Hà Nội, Việt Nam (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`

      const response = await fetch(url)
      const data = await response.json()

      if (data.status === 'REQUEST_DENIED') {
        console.error('[MapsService] ❌ API key invalid or APIs not enabled')
        return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
      }

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const formattedAddress = data.results[0].formatted_address
        console.log('[MapsService] ✅ Reverse geocoding success:', formattedAddress)
        return formattedAddress
      }

      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    } catch (error: any) {
      console.error('[MapsService] Reverse geocoding error:', error)
      return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`
    }
  },

  /**
   * Chuyển địa chỉ thành tọa độ (Geocoding)
   */
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    // Nếu chưa có API key, sử dụng mock data
    if (USE_MOCK_DATA) {
      console.warn('[MapsService] ⚠️ Using MOCK data for:', address)
      console.warn('[MapsService] API Key status:', GOOGLE_MAPS_API_KEY ? 'Invalid/Disabled' : 'Not configured')
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulate delay
      return generateMockGeocode(address)
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        address
      )}&key=${GOOGLE_MAPS_API_KEY}`

      console.log('[MapsService] 🌍 Geocoding address with real API:', address)
      const response = await fetch(url)
      const data = await response.json()

      if (data.status === 'REQUEST_DENIED') {
        console.error('[MapsService] ❌ API key invalid or APIs not enabled')
        console.warn('[MapsService] Falling back to mock data')
        return generateMockGeocode(address)
      }

      if (data.status !== 'OK' || !data.results || data.results.length === 0) {
        throw new Error(`Geocoding failed: ${data.status}`)
      }

      const result = data.results[0]
      const location = result.geometry.location

      console.log('[MapsService] ✅ Geocoding success:', { address, location })

      return {
        coordinates: {
          latitude: location.lat,
          longitude: location.lng,
        },
        formattedAddress: result.formatted_address,
      }
    } catch (error: any) {
      console.error('[MapsService] Geocoding error:', error)
      console.warn('[MapsService] Falling back to mock data')
      return generateMockGeocode(address)
    }
  },

  /**
   * Tính khoảng cách và thời gian di chuyển giữa 2 điểm
   */
  async getDistanceMatrix(
    origin: string,
    destination: string
  ): Promise<DistanceMatrixResult> {
    // Nếu chưa có API key, sử dụng mock data
    if (USE_MOCK_DATA) {
      console.warn('[MapsService] Using mock data for distance matrix')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock: khoảng cách ngẫu nhiên 3-15km, thời gian tương ứng
      const distanceKm = 3 + Math.random() * 12
      const distanceMeters = Math.round(distanceKm * 1000)
      const durationSeconds = Math.round(distanceKm * 180) // ~3 phút/km
      
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
      )}&destinations=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`

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
    // Nếu chưa có API key, tạo mock route
    if (USE_MOCK_DATA) {
      console.warn('[MapsService] Using mock route data')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Tạo route thẳng giữa 2 điểm ngẫu nhiên
      const start = generateMockGeocode(origin).coordinates
      const end = generateMockGeocode(destination).coordinates
      return generateMockRoute(start, end)
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(
        origin
      )}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`

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
   * Lấy thông tin đầy đủ: tọa độ + khoảng cách + đường đi cho 2 địa chỉ
   */
  async getRouteInfo(pickupAddress: string, dropoffAddress: string) {
    try {
      if (USE_MOCK_DATA) {
        console.warn('[MapsService] ⚠️ ĐANG SỬ DỤNG DỮ LIỆU GIẢ LẬP (Mock Data)')
        console.warn('[MapsService] Để sử dụng Google Maps thật, vui lòng cấu hình API key trong file .env')
      }

      console.log('[MapsService] 📍 Getting route info:', { pickupAddress, dropoffAddress })

      // Lấy tọa độ và khoảng cách song song
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
        routeCoordinates, // Đường đi
        isMockData: USE_MOCK_DATA, // Đánh dấu là mock data
      }

      console.log('[MapsService] ✅ Route info complete:', {
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
