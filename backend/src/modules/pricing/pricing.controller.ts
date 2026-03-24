import { Controller, Get, Post, Body, UseGuards, Param } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingConfig } from './pricing-config.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CalculatePriceDto, CalculatePriceResponse } from './dto/calculate-price.dto';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Get('config')
  // Public endpoint - mobile app cần lấy pricing config mà không cần login
  async getConfig(): Promise<PricingConfig> {
    return this.pricingService.getConfig();
  }

  // ============ TOPUP DISCOUNT APIs ============
  @Post('config/topup-discount')
  @UseGuards(JwtAuthGuard)
  async updateTopupDiscount(@Body() body: { topupDiscountCustomer?: number; topupDiscountDriver?: number }): Promise<PricingConfig> {
    return this.pricingService.updateTopupDiscount(
      body.topupDiscountCustomer,
      body.topupDiscountDriver,
    );
  }

  @Get('topup-discount/:userType')
  async getTopupDiscount(@Param('userType') userType: 'customer' | 'driver'): Promise<{ discount: number }> {
    const discount = await this.pricingService.getTopupDiscount(userType);
    return { discount };
  }
  // ============ END TOPUP DISCOUNT ============

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

  // ============ GIAO HÀNG - Delivery Config APIs ============
  @Post('config/delivery/goods-types')
  @UseGuards(JwtAuthGuard)
  async updateDeliveryGoodsTypes(@Body() body: { goodsTypes: any[] }): Promise<PricingConfig> {
    return this.pricingService.updateDeliveryGoodsTypes(body.goodsTypes);
  }

  @Post('config/delivery/weight-ranges')
  @UseGuards(JwtAuthGuard)
  async updateDeliveryWeightRanges(@Body() body: { weightRanges: any[] }): Promise<PricingConfig> {
    return this.pricingService.updateDeliveryWeightRanges(body.weightRanges);
  }

  @Post('config/delivery/vehicle-types')
  @UseGuards(JwtAuthGuard)
  async updateDeliveryVehicleTypes(@Body() body: { vehicleTypes: any[] }): Promise<PricingConfig> {
    return this.pricingService.updateDeliveryVehicleTypes(body.vehicleTypes);
  }
  // ============ END GIAO HÀNG ============

  // ============ LÁI XE HỘ - Hire Driver Config APIs ============
  @Post('config/hire-driver')
  @UseGuards(JwtAuthGuard)
  async updateHireDriverPricing(@Body() body: { hireDriverPricing: any[] }): Promise<PricingConfig> {
    return this.pricingService.updateHireDriverPricing(body.hireDriverPricing);
  }
  // ============ END LÁI XE HỘ ============

  // ============ CHUYẾN ĐI LIÊN TỈNH - Inter-Provincial Route APIs ============
  /**
   * Tìm các chuyến đi liên tỉnh phù hợp với điểm đón và điểm đến
   * Public endpoint - không cần auth
   */
  @Post('interprovincial/find')
  async findInterProvincialRoutes(
    @Body() body: {
      pickupLat: number;
      pickupLng: number;
      dropoffLat: number;
      dropoffLng: number;
      vehicleType: string;
    },
  ): Promise<{ routes: any[] }> {
    const routes = await this.pricingService.findMatchingInterProvincialRoutes(
      body.pickupLat,
      body.pickupLng,
      body.dropoffLat,
      body.dropoffLng,
      body.vehicleType,
    );
    return { routes };
  }

  /**
   * Tính giá cho chuyến đi liên tỉnh
   * Public endpoint - không cần auth
   */
  @Post('interprovincial/calculate')
  async calculateInterProvincialPrice(
    @Body() body: {
      routeId: string;
      totalPassengers: number;
    },
  ): Promise<any> {
    return this.pricingService.calculateInterProvincialPrice(
      body.routeId,
      body.totalPassengers,
    );
  }
  // ============ END CHUYẾN ĐI LIÊN TỈNH ============
}
