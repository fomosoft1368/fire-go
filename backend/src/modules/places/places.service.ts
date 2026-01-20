import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Place, PlaceDocument } from './schemas/place.schema';

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
  private googleMapsApiKey: string;

  constructor(
    @InjectModel(Place.name) private placeModel: Model<PlaceDocument>,
    private configService: ConfigService,
  ) {
    this.googleMapsApiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') || '';
  }

  /**
   * Search places with optimization:
   * 1. Check memory cache (instant)
   * 2. Check database
   * 3. Call Google Places API (last resort)
   */
  async searchPlaces(keyword: string, userLat: number, userLng: number): Promise<{
    results: PlaceResult[];
    source: 'cache' | 'database' | 'google';
  }> {
    const normalizedKeyword = keyword.trim().toLowerCase();

    console.log('🔍 [PlacesService] Searching:', normalizedKeyword);

    // 1️⃣ Check memory cache
    const cached = placeCache.get(normalizedKeyword);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('✅ Memory cache hit:', normalizedKeyword);
      return { results: cached.results, source: 'cache' };
    }

    // 2️⃣ Check database
    const dbResults = await this.placeModel.find(
      { keyword: new RegExp(normalizedKeyword, 'i') },
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

      // Cache result
      placeCache.set(normalizedKeyword, {
        results,
        timestamp: Date.now(),
      });

      console.log('✅ Database hit:', normalizedKeyword, `(${results.length} results)`);

      // Update lastSearchedAt
      this.placeModel.updateMany(
        { keyword: new RegExp(normalizedKeyword, 'i') },
        {
          lastSearchedAt: new Date(),
          $inc: { searchCount: 1 }
        }
      ).exec().catch(err => console.error('Update error:', err));

      return { results, source: 'database' };
    }

    // 3️⃣ Call Google Places Autocomplete API
    console.log('🔍 Calling Google Places API for:', normalizedKeyword);
    const googleResults = await this.callGooglePlacesAPI(normalizedKeyword, 0, 0);

    if (googleResults.length > 0) {
      // Save to database for future use
      await this.savePlacesToDatabase(normalizedKeyword, googleResults);

      // Cache result
      placeCache.set(normalizedKeyword, {
        results: googleResults,
        timestamp: Date.now(),
      });

      console.log(`✅ GOOGLE hit: ${normalizedKeyword} (${googleResults.length} results)`);
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
      let locationParams = '';
      if (lat && lng) {
        locationParams = `&location=${lat},${lng}&radius=5000`;
      }
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
        keyword
      )}&location=${lat},${lng}
      &radius=5000&key=${this.googleMapsApiKey}&components=country:vn&language=vi`.replace(/\s+/g, '');

      console.log('📡 Calling Places Autocomplete API:', {
        keyword,
        location: `${lat},${lng}`,
        radius: '5km',
        url: url.replace(this.googleMapsApiKey, '***KEY***'),
      });

      const response = await fetch(url);
      const data = (await response.json()) as GoogleAutocompleteResponse;

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
   * Save places to database for caching
   */
  private async savePlacesToDatabase(
    keyword: string,
    results: PlaceResult[]
  ): Promise<void> {
    try {
      const documents = results.map((result) => ({
        placeId: result.placeId,
        keyword: keyword.toLowerCase(),
        name: result.name,
        address: result.address,
        lat: result.lat,
        lng: result.lng,
        description: result.description,
        lastSearchedAt: new Date(),
      }));

      // Upsert to avoid duplicates
      for (const doc of documents) {
        await this.placeModel.updateOne(
          { placeId: doc.placeId },
          doc,
          { upsert: true }
        );
      }

      console.log('💾 Saved', documents.length, 'places to database');
    } catch (error) {
      console.error('Error saving places:', error);
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
