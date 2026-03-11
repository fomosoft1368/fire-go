/**
 * Places Search Service - Tối ưu hóa Google Maps API
 * 
 * Strategy:
 * 1. Debounce frontend input (500ms)
 * 2. Check cache trước (memory cache 5 phút)
 * 3. Check database
 * 4. Gọi Google Places chỉ nếu không có cache/DB
 */

import { API_BASE_URL } from '../constants'

interface PlaceResult {
  placeId: string
  name: string
  address: string
  lat: number
  lng: number
  description?: string
}

interface PlacesSearchResponse {
  results: PlaceResult[]
  cached?: boolean
  source?: 'cache' | 'database' | 'google' | 'api'
}

// Memory cache - key: keyword, value: { results, timestamp }
const placeCache = new Map<string, { results: PlaceResult[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Search places từ backend endpoint
 * Backend sẽ handle: cache check, DB lookup, Google Places API
 */
export const placesService = {
  /**
   * Search places với debounce tối ưu
   * @param keyword - Từ khóa tìm kiếm
   * @param userId - Customer ID để lưu lịch sử tìm kiếm cá nhân (optional)
   * @returns Array địa điểm + metadata về nguồn
   */
  async searchPlaces(keyword: string, userId?: string): Promise<PlacesSearchResponse> {
    // Validate input
    if (!keyword || keyword.trim().length < 3) {
      return { results: [], source: 'cache' };
    }

    const trimmedKeyword = keyword.trim().toLowerCase();

    // 1️⃣ Check memory cache (frontend) - include userId in cache key
    const cacheKey = userId ? `${userId}:${trimmedKeyword}` : trimmedKeyword;
    const cached = placeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ [PlacesService] Memory cache hit:', cacheKey, `(${cached.results.length} places)`);
      return { results: cached.results, cached: true, source: 'cache' };
    }

    try {
      // 2️⃣ Call backend endpoint with userId
      console.log('📡 [PlacesService] Fetching from backend:', { keyword: trimmedKeyword, userId });
      // Backend sẽ check: Database (per-user) → Google Places API
      const urlParams = new URLSearchParams({
        keyword: trimmedKeyword,
        ...(userId && { userId }), // Add userId if provided
      });
      const url = `${API_BASE_URL}/places/search?${urlParams.toString()}`;
      console.log('🌐 [PlacesService] Calling:', url);
      
      const res = await fetch(url);
      
      console.log(`📥 [PlacesService] Response status: ${res.status}, ok: ${res.ok}`);
      
      if (!res.ok) {
        console.error(`❌ [PlacesService] API error: ${res.status} ${res.statusText}`);
        const errorText = await res.text();
        console.error('[PlacesService] Error body:', errorText);
        // Fallback: return empty results instead of throwing
        console.warn('[PlacesService] Backend unavailable, returning empty results');
        return { results: [], source: 'api' };
      }
      
      const response = await res.json() as PlacesSearchResponse;
      console.log('✅ [PlacesService] Backend response:', { source: response.source, count: response.results?.length || 0 });

      // 3️⃣ Cache result ở frontend - ONLY cache if have results
      // ⚡ Don't cache empty results to avoid caching "no match" responses
      if (response.results && response.results.length > 0) {
        placeCache.set(cacheKey, {
          results: response.results,
          timestamp: Date.now(),
        });
        console.log(
          '📍 [PlacesService] Got results from',
          response.source || 'backend',
          `(${response.results.length} places) - CACHED as ${cacheKey}`
        );
      } else {
        console.log(
          '📍 [PlacesService] No results from',
          response.source || 'backend',
          '- not caching to allow retry'
        );
      }

      return response;
    } catch (error) {
      console.error('[PlacesService] Search error:', error);
      // Fallback gracefully - return empty results instead of crashing
      return { results: [], source: 'api' };
    }
  },

  /**
   * Get detailed place information
   * Chỉ gọi khi user chọn địa điểm cuối cùng
   * @param placeId - Google Place ID
   */
  async getPlaceDetails(placeId: string): Promise<PlaceResult> {
    try {
      const res = await fetch(
        `${API_BASE_URL}/places/details/${encodeURIComponent(placeId)}`
      );
      
      if (!res.ok) {
        console.error(`[PlacesService] Details API error: ${res.status}`);
        // Fallback: return empty object instead of throwing
        return { placeId, name: '', address: '', lat: 0, lng: 0 };
      }
      
      const response = await res.json() as PlaceResult;
      console.log('✅ [PlacesService] Got place details:', response);
      return response;
    } catch (error) {
      console.error('[PlacesService] Details error:', error);
      // Fallback: return empty object instead of crashing
      return { placeId, name: '', address: '', lat: 0, lng: 0 };
    }
  },

  /**
   * Reverse geocode - convert lat/lng to address
   * @param latitude - Vĩ độ
   * @param longitude - Kinh độ
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<Partial<PlaceResult>> {
    try {
      const res = await fetch(
        `${API_BASE_URL}/places/reverse-geocode?lat=${latitude}&lng=${longitude}`
      );
      
      if (!res.ok) {
        console.warn(`[PlacesService] Reverse geocode error: ${res.status}`);
        return { address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` };
      }
      
      const response = await res.json();
      console.log('✅ [PlacesService] Got reverse geocode:', response);
      return response;
    } catch (error) {
      console.error('[PlacesService] Reverse geocode error:', error);
      return { address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` };
    }
  },

  /**
   * Clear cache (dùng cho debug hoặc refresh)
   */
  clearCache() {
    placeCache.clear();
    console.log('🗑️ [PlacesService] Cache cleared');
  },

  /**
   * Get cache stats (cho debug)
   */
  getCacheStats() {
    return {
      size: placeCache.size,
      keys: Array.from(placeCache.keys()),
    };
  },
};
