import { Controller, Get, Query } from '@nestjs/common';
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

    return this.placesService.searchPlaces(keyword);
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
