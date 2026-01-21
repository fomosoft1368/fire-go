import { Controller, Get, Query, Param } from '@nestjs/common';
import { PlacesService, PlaceResult } from './places.service';

@Controller('api/places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Get('search')
  async search(@Query('keyword') keyword: string): Promise<{
    results: PlaceResult[];
    source: 'cache' | 'database' | 'google' | 'validation';
  }> {
    if (!keyword || keyword.trim().length < 3) {
      return { results: [], source: 'validation' };
    }

    return this.placesService.searchPlaces(keyword, 0, 0); // userLat, userLng not used in current implementation
  }

  @Get('details/:placeId')
  async getDetails(@Param('placeId') placeId: string): Promise<PlaceResult> {
    console.log('🔍 [PlacesController] Getting details for:', placeId);
    return this.placesService.getPlaceDetails(placeId);
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
