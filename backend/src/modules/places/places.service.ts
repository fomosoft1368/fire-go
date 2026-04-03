import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Place, PlaceDocument } from './schemas/place.schema';
import { AppSettingsService } from '../app-settings/app-settings.service';

// Memory cache - {keyword: [{results}]}
const placeCache = new Map<string, { results: any[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  description?: string;
}

interface GoogleAutocompleteResponse {
  status: string;
  predictions: Array<{
    place_id: string;
    main_text: string;
    description: string;
  }>;
}

interface GoogleDetailsResponse {
  status: string;
  result?: {
    geometry?: {
      location: {
        lat: number;
        lng: number;
      };
    };
  };
}

@Injectable()
export class PlacesService {
  constructor(
    @InjectModel(Place.name) private placeModel: Model<PlaceDocument>,
    private readonly appSettingsService: AppSettingsService,
  ) {}

  /** Lấy key từ file .env */
  private get googleMapsApiKey() {
    return process.env.GOOGLE_MAPS_API_KEY || '';
  }

  /**
   * Search places with optimization:
   * 1. Check memory cache (instant)
   * 2. Check database (per-user history)
   * 3. Call Google Places API (last resort)
   * @param keyword - Search keyword
   * @param userLat - User latitude (optional)
   * @param userLng - User longitude (optional)
   * @param userId - Customer ID or Driver ID for personalized search history
   */
  async searchPlaces(keyword: string, userLat: number, userLng: number, userId?: string): Promise<{
    results: PlaceResult[];
    source: 'cache' | 'database' | 'google';
  }> {
    const normalizedKeyword = keyword.trim().toLowerCase();

    console.log('🔍 [PlacesService] Searching:', { keyword: normalizedKeyword, userId });

    // 1️⃣ Check memory cache (include userId in cache key)
    const cacheKey = userId ? `${userId}:${normalizedKeyword}` : normalizedKeyword;
    const cached = placeCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ Memory cache hit:', cacheKey);
      return { results: cached.results, source: 'cache' };
    }

    // 2️⃣ Check database (filter by userId if provided)
    const dbQuery = userId
      ? { userId, keyword: new RegExp(normalizedKeyword, 'i') }
      : { keyword: new RegExp(normalizedKeyword, 'i') };
    
    const dbResults = await this.placeModel.find(
      dbQuery,
      { _id: 0, placeId: 1, name: 1, address: 1, lat: 1, lng: 1 },
      { limit: 10, sort: { searchCount: -1, lastSearchedAt: -1 } }
    );

    if (dbResults.length > 0) {
      const results = dbResults.map((doc) => ({
        placeId: doc.placeId,
        name: doc.name,
        address: doc.address,
        lat: doc.lat,
        lng: doc.lng,
      }));

      // Cache result (with userId in key)
      placeCache.set(cacheKey, {
        results,
        timestamp: Date.now(),
      });

      console.log('✅ Database hit:', cacheKey, `(${results.length} results)`);

      // Update lastSearchedAt and searchCount
      this.placeModel.updateMany(
        dbQuery,
        {
          $set: { lastSearchedAt: new Date() },
          $inc: { searchCount: 1 },
        }
      ).exec().catch(err => console.error('Update error:', err));

      return { results, source: 'database' };
    }

    // 3️⃣ Call Google Places Autocomplete API
    console.log('🔍 Calling Google Places API for:', normalizedKeyword, 'userId:', userId);
    const googleResults = await this.callGooglePlacesAPI(normalizedKeyword, userLat, userLng);

    if (googleResults.length > 0) {
      // Save to database for future use (with userId)
      await this.savePlacesToDatabase(normalizedKeyword, googleResults, userId);

      // Cache result (with userId in key)
      placeCache.set(cacheKey, {
        results: googleResults,
        timestamp: Date.now(),
      });

      console.log(`✅ GOOGLE hit: ${cacheKey} (${googleResults.length} results)`);
      return { results: googleResults, source: 'google' };
    }
    console.log('data google : ', googleResults);

    return { results: [], source: 'google' };
  }

  /**
   * Call Google Places Autocomplete API
   * ⚡ Optimization: Skip Place Details here, get coordinates only when user selects
   * This reduces API calls from 11 to 1 per search
   */
  private async callGooglePlacesAPI(keyword: string, lat?: number, lng?: number): Promise<PlaceResult[]> {
    // Check if API key is configured
    if (!this.googleMapsApiKey) {
      console.error('❌ GOOGLE_MAPS_API_KEY is not configured in .env!');
      return [];
    }

    try {
      // Clean keyword: remove commas and extra spaces for better search
      // "Tan Giang, Quynh Bang" -> "Tan Giang Quynh Bang"
      const cleanKeyword = keyword.replace(/[,。，]/g, ' ').replace(/\s+/g, ' ').trim();
      
      console.log('🧹 [PlacesService] Cleaned keyword:', {
        original: keyword,
        cleaned: cleanKeyword,
      });

      // Build location params if provided
      let locationParams = '';
      let locationLog = 'default';
      if (lat && lng && lat !== 0 && lng !== 0) {
        locationParams = `&location=${lat},${lng}&radius=5000`;
        locationLog = `${lat},${lng}`;
      } else {
        // Default to Vietnam center if no location provided
        locationParams = `&components=country:vn`;
      }

      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        cleanKeyword
      )}${locationParams}&key=${this.googleMapsApiKey}&language=vi`.replace(/\s+/g, '');

      console.log('📡 Calling Places Autocomplete API:', {
        keyword: cleanKeyword,
        location: locationLog,
        url: url.replace(this.googleMapsApiKey, '***KEY***'),
      });

      const response = await fetch(url);
      const data = (await response.json()) as GoogleAutocompleteResponse;

      console.log('📥 [PlacesService] Google API response status:', data.status);
      if (data.predictions) {
        console.log('   Predictions count:', data.predictions.length);
      }
      if (data['error_message']) {
        console.log('   Error message:', data['error_message']);
      }

      if (data.status !== 'OK') {
        console.error('❌ Google Places API error:', {
          status: data.status,
          error_message: data['error_message'] || 'No error message',
        });
        return [];
      }

      // Convert predictions to place results
      const predictions = data.predictions || [];
      const results: PlaceResult[] = [];

      // ⚡ Skip Place Details API call here - return with placeholder coordinates
      // Will fetch real coordinates only when user SELECTS the place
      for (const prediction of predictions.slice(0, 10)) {
        results.push({
          placeId: prediction.place_id,
          name: prediction.main_text,
          address: prediction.description,
          lat: 0, // Placeholder - fetch on demand
          lng: 0, // Placeholder - fetch on demand
        });
      }

      return results;
    } catch (error) {
      console.error('Google Places API error:', error);
      return [];
    }
  }

  /**
   * Get place details (coordinates) - PUBLIC for controller endpoint
   * Called only when user selects a place (lazy loading)
   */
  async getPlaceDetails(
    placeId: string
  ): Promise<PlaceResult> {
    try {
      // Check database first
      const dbPlace = await this.placeModel.findOne(
        { placeId },
        { _id: 0, placeId: 1, name: 1, address: 1, lat: 1, lng: 1 }
      );

      if (dbPlace && dbPlace.lat && dbPlace.lng) {
        console.log('✅ Place details from DB:', placeId);
        return {
          placeId: dbPlace.placeId,
          name: dbPlace.name,
          address: dbPlace.address,
          lat: dbPlace.lat,
          lng: dbPlace.lng,
        };
      }

      // Fetch from Google
      console.log('📡 Fetching place details from Google API for:', placeId);
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${this.googleMapsApiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('❌ Google API error:', response.status);
        return {
          placeId,
          name: '',
          address: '',
          lat: 0,
          lng: 0,
        };
      }

      const data = (await response.json()) as GoogleDetailsResponse;

      if (data.status === 'OK' && data.result?.geometry?.location) {
        const result = {
          placeId,
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        };
        console.log('✅ Place details from Google API:', placeId);

        // Save to DB for future use
        await this.placeModel.updateOne(
          { placeId },
          {
            placeId,
            lat: result.lat,
            lng: result.lng,
            lastSearchedAt: new Date(),
          },
          { upsert: true }
        );

        return {
          ...result,
          name: '',
          address: '',
        };
      }

      console.warn('⚠️ Invalid Google API response for placeId:', placeId);
      return {
        placeId,
        name: '',
        address: '',
        lat: 0,
        lng: 0,
      };
    } catch (error) {
      console.error('❌ Place details error:', error);
      return {
        placeId,
        name: '',
        address: '',
        lat: 0,
        lng: 0,
      };
    }
  }

  /**
   * Save places to database for caching (per user)
   * @param keyword - Search keyword
   * @param results - Place results from Google
   * @param userId - Customer ID or Driver ID (optional)
   */
  private async savePlacesToDatabase(
    keyword: string,
    results: PlaceResult[],
    userId?: string
  ): Promise<void> {
    try {
      const documents = results.map((result) => ({
        userId: userId || null, // Save userId if provided
        placeId: result.placeId,
        keyword: keyword.toLowerCase(),
        name: result.name,
        address: result.address,
        lat: result.lat,
        lng: result.lng,
        description: result.description,
        lastSearchedAt: new Date(),
        searchCount: 1,
      }));

      // Upsert to avoid duplicates per user
      for (const doc of documents) {
        const query = userId
          ? { userId, placeId: doc.placeId, keyword: doc.keyword }
          : { placeId: doc.placeId, keyword: doc.keyword };

        // Separate searchCount from $set to avoid MongoDB conflict with $inc
        const { searchCount: _sc, ...docWithoutCount } = doc;

        await this.placeModel.updateOne(
          query,
          {
            $set: docWithoutCount,
            $inc: { searchCount: 1 },
          },
          { upsert: true }
        );
      }

      console.log(`💾 Saved ${documents.length} places to database${userId ? ` for user ${userId}` : ''}`);
    } catch (error) {
      console.error('Error saving places:', error);
    }
  }

  /**
   * Reverse Geocoding: toạ độ → địa chỉ
   * Proxy qua backend để mobile app không cần giữ API key
   */
  async reverseGeocode(lat: number, lng: number): Promise<{ address: string }> {
    if (!this.googleMapsApiKey) {
      return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    }
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.googleMapsApiKey}`;
      const response = await fetch(url);
      const data = await response.json() as any;
      if (data.status === 'OK' && data.results?.length > 0) {
        return { address: data.results[0].formatted_address };
      }
      return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    } catch {
      return { address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
    }
  }

  /**
   * Geocoding: địa chỉ → toạ độ
   * Proxy qua backend để mobile app không cần giữ API key
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
    if (!this.googleMapsApiKey) return null;
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${this.googleMapsApiKey}`;
      const response = await fetch(url);
      const data = await response.json() as any;
      if (data.status === 'OK' && data.results?.length > 0) {
        const loc = data.results[0].geometry.location;
        return { lat: loc.lat, lng: loc.lng, formattedAddress: data.results[0].formatted_address };
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Clear memory cache (for debug/refresh)
   */
  clearCache() {
    placeCache.clear();
    console.log('🗑️ Places cache cleared');
  }

  /**
   * Get cache stats
   */
  getCacheStats() {
    return {
      size: placeCache.size,
      keys: Array.from(placeCache.keys()),
    };
  }
}
