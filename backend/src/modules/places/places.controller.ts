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
    console.log('🔥 [PlacesController] Search request received:', keyword);
    
    if (!keyword || keyword.trim().length < 3) {
      console.log('⏭️ [PlacesController] Keyword too short:', keyword?.length);
      return { results: [], source: 'validation' };
    }

    console.log('✅ [PlacesController] Calling service for:', keyword);
    const result = await this.placesService.searchPlaces(keyword, 0, 0);
    console.log('📤 [PlacesController] Service returned:', { source: result.source, count: result.results.length });
    return result;
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
