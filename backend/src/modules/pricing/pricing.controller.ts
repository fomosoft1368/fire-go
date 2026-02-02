import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingConfig } from './pricing-config.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalculatePriceDto, CalculatePriceResponse } from './dto/calculate-price.dto';

@Controller('api/pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('config')
  // Public endpoint - mobile app cần lấy pricing config mà không cần login
  async getConfig(): Promise<PricingConfig> {
    return this.pricingService.getConfig();
  }

  @Post('config')
  @UseGuards(JwtAuthGuard)
  async updateConfig(@Body() configData: Partial<PricingConfig>): Promise<PricingConfig> {
    return this.pricingService.updateConfig(configData);
  }

  @Post('config/reset')
  @UseGuards(JwtAuthGuard)
  async resetToDefaults(): Promise<PricingConfig> {
    return this.pricingService.resetToDefaults();
  }

  @Post('calculate')
  async calculatePrice(@Body() dto: CalculatePriceDto): Promise<CalculatePriceResponse> {
    return this.pricingService.calculatePrice(dto);
  }

  @Post('check-peak-time')
  async checkPeakTime(@Body() body: { time: string }): Promise<{ isPeakTime: boolean }> {
    const time = new Date(body.time);
    const isPeakTime = await this.pricingService.isPeakTime(time);
    return { isPeakTime };
  }
}
