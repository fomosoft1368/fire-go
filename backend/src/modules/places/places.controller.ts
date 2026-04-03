import { Controller, Get, Query, Param } from '@nestjs/common';
import { PlacesService, PlaceResult } from './places.service';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  async search(
    @Query('keyword') keyword: string,
    @Query('userId') userId?: string,
  ): Promise<{
    results: PlaceResult[];
    source: 'cache' | 'database' | 'google' | 'validation';
  }> {
    console.log('🔥 [PlacesController] Search request received:', { keyword, userId });

    if (!keyword || keyword.trim().length < 3) {
      console.log('⏭️ [PlacesController] Keyword too short:', keyword?.length);
      return { results: [], source: 'validation' };
    }

    console.log('✅ [PlacesController] Calling service for:', keyword, 'userId:', userId);
    const result = await this.placesService.searchPlaces(keyword, 0, 0, userId);
    console.log('📤 [PlacesController] Service returned:', { source: result.source, count: result.results.length });
    return result;
  }

  @Get('details/:placeId')
  async getDetails(@Param('placeId') placeId: string): Promise<PlaceResult> {
    console.log('🔍 [PlacesController] Getting details for:', placeId);
    return this.placesService.getPlaceDetails(placeId);
  }

  /**
   * GET /api/places/reverse-geocode?lat=...&lng=...
   * Toạ độ → địa chỉ — proxy qua backend (key lấy từ DB)
   */
  @Get('reverse-geocode')
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
  ): Promise<{ address: string }> {
    return this.placesService.reverseGeocode(parseFloat(lat), parseFloat(lng));
  }

  /**
   * GET /api/places/geocode?address=...
   * Địa chỉ → toạ độ — proxy qua backend (key lấy từ DB)
   */
  @Get('geocode')
  async geocode(
    @Query('address') address: string,
  ): Promise<{ lat: number; lng: number; formattedAddress: string } | null> {
    return this.placesService.geocodeAddress(address);
  }

  @Get('cache-stats')
  cacheStats() {
    return this.placesService.getCacheStats();
  }

  @Get('cache-clear')
  clearCache() {
    this.placesService.clearCache();
    return { message: 'Cache cleared' };
  }
}
