import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ConfigService } from './config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceType } from './schemas/driver-search-config.schema';

@Controller('config/driver-search')
export class ConfigController {
  constructor(private readonly configService: ConfigService) {}

  /**
   * GET /config/driver-search
   * Get all driver search configurations
   */
  @Get()
  async getAllConfigs() {
    return this.configService.getAllConfigs();
  }

  /**
   * GET /config/driver-search/:serviceType
   * Get config for specific service type
   */
  @Get(':serviceType')
  async getConfigByServiceType(@Param('serviceType') serviceType: ServiceType) {
    return this.configService.getConfigByServiceType(serviceType);
  }

  /**
   * PATCH /config/driver-search/:serviceType
   * Update config for specific service type
   * Admin only
   */
  @Patch(':serviceType')
  @UseGuards(JwtAuthGuard)
  async updateConfig(
    @Param('serviceType') serviceType: ServiceType,
    @Body()
    updateData: {
      searchRadiusMeters?: number;
      maxDriversToNotify?: number;
      requestTimeoutMs?: number;
      isActive?: boolean;
      description?: string;
    },
  ) {
    return this.configService.updateConfig(serviceType, updateData);
  }
}
