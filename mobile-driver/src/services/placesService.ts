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
   * @returns Array địa điểm + metadata về nguồn
   */
  async searchPlaces(keyword: string): Promise<PlacesSearchResponse> {
    // Validate input
    if (!keyword || keyword.trim().length < 3) {
      return { results: [], source: 'cache' };
    }

    const trimmedKeyword = keyword.trim().toLowerCase();

    // 1️⃣ Check memory cache (frontend)
    const cached = placeCache.get(trimmedKeyword);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ [PlacesService] Memory cache hit:', trimmedKeyword, `(${cached.results.length} places)`);
      return { results: cached.results, cached: true, source: 'cache' };
    }

    try {
      // 2️⃣ Call backend endpoint
      console.log('📡 [PlacesService] Fetching from backend:', trimmedKeyword);
      // Backend sẽ check: Redis cache → Database → Google Places API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const res = await fetch(
        `${API_BASE_URL}/places/search?keyword=${encodeURIComponent(trimmedKeyword)}`,
        { signal: controller.signal }
      );
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.error(`[PlacesService] API error: ${res.status}`);
        console.warn('[PlacesService] Backend unavailable, returning empty results');
        return { results: [], source: 'api' };
      }
      
      const response = await res.json() as PlacesSearchResponse;

      // 3️⃣ Cache result ở frontend
      placeCache.set(trimmedKeyword, {
        results: response.results,
        timestamp: Date.now(),
      });

      console.log(
        '✅ [PlacesService] Got results from',
        response.source || 'backend',
        `(${response.results.length} places)`
      );

      return response;
    } catch (error: any) {
      console.error('[PlacesService] Search error:', error?.message || error);
      // Fallback gracefully - return empty results instead of crashing
      if (error?.name === 'AbortError') {
        console.warn('[PlacesService] Request timeout, backend might be unavailable');
      }
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
