import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PricingConfig, PricingConfigDocument } from './pricing-config.schema';
import { CalculatePriceDto, CalculatePriceResponse, PriceBreakdown } from './dto/calculate-price.dto';

@Injectable()
export class PricingService {
  constructor(
    @InjectModel(PricingConfig.name)
    private pricingConfigModel: Model<PricingConfigDocument>,
  ) {}

  /**
   * TÍNH GIÁ GHÉP XE - MỖI NGƯỜI TRẢ THEO QUÃNG ĐƯỜNG CỦA MÌNH
   * Theo tài liệu: Base Price & Ghép Người
   * 
   * NGHIỆP VỤ ĐÚNG:
   * 1. Tính giá RIÊNG cho TỪNG NGƯỜI dựa trên distance của NGƯỜI ĐÓ
   * 2. Áp dụng CÙNG DISCOUNT theo tổng số ghế trong chuyến
   * 3. Người đi xa trả nhiều, người đi gần trả ít
   * 
   * VÍ DỤ: 3 người ghép, discount 15%:
   * - Người 1 (25km cao điểm): 264,000 → giảm 15% = 198,000đ
   * - Người 2 (18km cao điểm): 197,000 → giảm 15% = 147,750đ
   * - Người 3 (12km bình thường): 116,000 → giảm 15% = 87,000đ
   * Tổng: 432,750đ (KHÔNG chia đều!)
   */
  async calculatePrice(dto: CalculatePriceDto): Promise<CalculatePriceResponse> {
    const config = await this.getConfig();
    const totalPassengers = dto.passengers.length;

    // Lấy vehicle type từ passenger đầu tiên (giả sử tất cả cùng loại xe)
    const vehicleType = dto.passengers[0]?.vehicleType || 'sedan';
    const vehicleConfig = config.vehicleTypes.find(v => v.type === vehicleType);
    
    if (!vehicleConfig) {
      throw new Error(`Vehicle type ${vehicleType} not found in config`);
    }

    // ✅ Tìm discount rate theo TỔNG SỐ GHẾ (từ database)
    const discountConfig = config.carpoolDiscounts.find(
      (d) => d.passengers === totalPassengers,
    );
    const discountRate = discountConfig ? discountConfig.discount / 100 : 0;

    console.log('[PricingService] 💰 CARPOOL PRICING:', {
      totalSeats: totalPassengers,
      discountRate: Math.round(discountRate * 100) + '%',
      discountFromDB: discountConfig || 'no discount found',
    });

    const breakdown: PriceBreakdown[] = [];
    let totalPrice = 0;

    // ✅ Tính giá RIÊNG cho TỪNG NGƯỜI
    dto.passengers.forEach((passenger, index) => {
      // BƯỚC 1: Tính raw_price cho NGƯỜI NÀY
      const rawPrice = passenger.distance * vehicleConfig.pricePerKm + vehicleConfig.baseFee;

      // BƯỚC 2: Tính base_price
      // ✅ Dùng peakMultiplier đã lưu (1.0, 1.3, 1.5), KHÔNG check lại time
      const actualMultiplier = passenger.peakMultiplier ?? 1.0;
      const basePrice = rawPrice * actualMultiplier;

      // BƯỚC 3: Tính final_price (áp dụng CÙNG discount cho tất cả)
      let finalPrice = basePrice * (1 - discountRate);

      // BƯỚC 4: Áp dụng minimum fare cho TỪNG NGƯỜI
      if (finalPrice < vehicleConfig.minimumFare) {
        finalPrice = vehicleConfig.minimumFare;
      }

      console.log(`  [Passenger ${index + 1}]:`, {
        distance: passenger.distance + 'km',
        isPeakTime: passenger.isPeakTime,
        peakMultiplier: actualMultiplier,
        rawPrice,
        basePrice,
        discount: Math.round(discountRate * 100) + '%',
        finalPrice: Math.round(finalPrice),
      });

      breakdown.push({
        passengerIndex: index + 1,
        distance: passenger.distance,
        isPeakTime: passenger.isPeakTime || false,
        peakMultiplier: actualMultiplier, // ✅ Lưu vào breakdown
        vehicleType: passenger.vehicleType,
        rawPrice: Math.round(rawPrice),
        basePrice: Math.round(basePrice),
        finalPrice: Math.round(finalPrice), // ✅ GIÁ RIÊNG CHO TỪNG NGƯỜI
        discountApplied: Math.round(discountRate * 100),
      });

      totalPrice += Math.round(finalPrice);
    });

    // Tính phần tài xế nhận
    const driverAmount = Math.round(totalPrice * (config.driverShare / 100));

    console.log('[PricingService] ✅ TOTAL:', {
      totalPrice,
      driverAmount,
      driverShare: config.driverShare + '%',
    });

    return {
      breakdown,
      totalPrice,
      driverShare: config.driverShare,
      driverAmount,
      totalPassengers,
      configUsed: {
        vehicleType: vehicleConfig.type,
        baseFee: vehicleConfig.baseFee,
        pricePerKm: vehicleConfig.pricePerKm,
        minimumFare: vehicleConfig.minimumFare,
        peakMultiplier: config.peakMultiplier,
        driverSharePercent: config.driverShare,
        discountRate: Math.round(discountRate * 100),
      },
    };
  }

  /**
   * Kiểm tra xem thời gian có thuộc giờ cao điểm không
   */
  async isPeakTime(time: Date): Promise<boolean> {
    const config = await this.getConfig();
    const timeString = time.toTimeString().substring(0, 5); // HH:mm

    return config.peakHours.some((peak) => {
      return timeString >= peak.startTime && timeString <= peak.endTime;
    });
  }

  async getConfig(): Promise<PricingConfigDocument> {
    try {
      console.log('🔍 [PricingService] Getting config from database...');
      const config = await this.pricingConfigModel.findOne().exec();
      
      console.log('📊 [PricingService] Config from DB:', {
        found: !!config,
        _id: config?._id,
        vehicleTypesCount: config?.vehicleTypes?.length,
        carpoolDiscountsCount: config?.carpoolDiscounts?.length,
        carpoolDiscounts: config?.carpoolDiscounts?.map(d => ({ 
          passengers: d.passengers, 
          discount: d.discount 
        })),
        peakMultiplier: config?.peakMultiplier,
        driverShare: config?.driverShare,
        topupDiscountCustomer: config?.topupDiscountCustomer,
        topupDiscountDriver: config?.topupDiscountDriver,
      });
      
      if (!config) {
        console.warn('⚠️ [PricingService] No config in DB, creating default...');
        // Create default config if none exists
        return await this.createDefaultConfig();
      }
      
      console.log('✅ [PricingService] Using config from DATABASE');
      return config;
    } catch (error) {
      console.error('❌ [PricingService] Error in getConfig:', error);
      console.error('❌ [PricingService] Error stack:', error.stack);
      // Try to create default config as fallback
      console.warn('⚠️ [PricingService] Attempting to create default config as fallback...');
      return await this.createDefaultConfig();
    }
  }

  async updateConfig(configData: Partial<PricingConfig>): Promise<PricingConfigDocument> {
    const existingConfig = await this.pricingConfigModel.findOne().exec();
    
    if (existingConfig) {
      // Xóa document cũ và tạo mới để tránh các field cũ không mong muốn
      await this.pricingConfigModel.deleteOne({ _id: existingConfig._id }).exec();
    }
    
    // Tạo config mới với data sạch
    const newConfig = new this.pricingConfigModel(configData);
    return newConfig.save();
  }

  async resetToDefaults(): Promise<PricingConfigDocument> {
    // Delete existing config
    await this.pricingConfigModel.deleteMany({}).exec();
    
    // Create default config
    return this.createDefaultConfig();
  }

  private async createDefaultConfig(): Promise<PricingConfigDocument> {
    const defaultConfig = new this.pricingConfigModel({
      vehicleTypes: [
        {
          type: 'bike',
          name: 'Xe máy',
          baseFee: 15000,
          pricePerKm: 1500,
          minimumFare: 20000,
        },
        {
          type: 'sedan',
          name: 'Sedan (4-5 chỗ)',
          baseFee: 20000,
          pricePerKm: 2000,
          minimumFare: 30000,
        },
        {
          type: 'suv',
          name: 'SUV (7 chỗ)',
          baseFee: 25000,
          pricePerKm: 2500,
          minimumFare: 40000,
        },
        {
          type: 'truck',
          name: 'Truck (Bán tải)',
          baseFee: 30000,
          pricePerKm: 3000,
          minimumFare: 50000,
        },
      ],
      peakMultiplier: 1.2,
      driverShare: 85,
      maxDiscountRate: 30,
      carpoolDiscounts: [
        { passengers: 1, discount: 0 },
        { passengers: 2, discount: 15 },
        { passengers: 3, discount: 25 },
        { passengers: 4, discount: 30 },
      ],
      peakHours: [
        {
          id: 'morning',
          name: 'Giờ cao điểm sáng',
          startTime: '07:00',
          endTime: '09:00',
          multiplier: 1.2,
        },
        {
          id: 'evening',
          name: 'Giờ cao điểm chiều',
          startTime: '17:00',
          endTime: '19:00',
          multiplier: 1.2,
        },
      ],
      // ============ GIAO HÀNG - Default Delivery Config ============
      deliveryGoodsTypes: [
        {
          key: 'light',
          label: 'Hàng nhẹ',
          icon: 'cube-outline',
          surcharge: 0,
        },
        {
          key: 'bulky',
          label: 'Cồng kềnh',
          icon: 'archive-outline',
          surcharge: 10000,
        },
        {
          key: 'food',
          label: 'Thực phẩm',
          icon: 'food-apple-outline',
          surcharge: 5000,
        },
      ],
      deliveryWeightRanges: [
        {
          key: '<20',
          label: '< 20kg',
          surcharge: 5000,
        },
        {
          key: '20-50',
          label: '20-50kg',
          surcharge: 15000,
        },
        {
          key: '>50',
          label: '> 50kg',
          surcharge: 30000,
        },
      ],
      deliveryVehicleTypes: [
        {
          key: 'bike',
          label: 'Xe máy',
          description: 'Phù hợp hàng nhỏ',
          icon: 'motorbike',
          vehicleTypeMapping: 'bike',
        },
        {
          key: 'truck',
          label: 'Xe tải nhỏ',
          description: 'Sức tải 500kg',
          icon: 'truck-outline',
          vehicleTypeMapping: 'truck',
        },
      ],
      // ============ END GIAO HÀNG ============

      // ============ LÁI XE HỘ - Default Hire Driver Config ============
      hireDriverPricing: [
        {
          vehicleType: 'bike',
          name: 'Xe máy',
          openingFee: 50000,
          freeKm: 5,
          pricePerExtraKm: 5000,
          description: 'Phí mở cửa 50k bao gồm 5km đầu, vượt 5k/km',
        },
        {
          vehicleType: 'sedan',
          name: 'Sedan (4-5 chỗ)',
          openingFee: 100000,
          freeKm: 10,
          pricePerExtraKm: 10000,
          description: 'Phí mở cửa 100k bao gồm 10km đầu, vượt 10k/km',
        },
        {
          vehicleType: 'suv',
          name: 'SUV (7 chỗ)',
          openingFee: 150000,
          freeKm: 10,
          pricePerExtraKm: 15000,
          description: 'Phí mở cửa 150k bao gồm 10km đầu, vượt 15k/km',
        },
        {
          vehicleType: 'truck',
          name: 'Truck (Bán tải)',
          openingFee: 200000,
          freeKm: 10,
          pricePerExtraKm: 20000,
          description: 'Phí mở cửa 200k bao gồm 10km đầu, vượt 20k/km',
        },
      ],
      // ============ END LÁI XE HỘ ============

      // ============ TOPUP DISCOUNT - Default ============
      topupDiscountCustomer: 0,
      topupDiscountDriver: 0,
      // ============ END TOPUP DISCOUNT ============
    });
    
    return defaultConfig.save();
  }

  // ============ GIAO HÀNG - Delivery Config Methods ============
  async updateDeliveryGoodsTypes(goodsTypes: any[]): Promise<PricingConfig> {
    const config = await this.getConfig();
    config.deliveryGoodsTypes = goodsTypes;
    return config.save();
  }

  async updateDeliveryWeightRanges(weightRanges: any[]): Promise<PricingConfig> {
    const config = await this.getConfig();
    config.deliveryWeightRanges = weightRanges;
    return config.save();
  }

  async updateDeliveryVehicleTypes(vehicleTypes: any[]): Promise<PricingConfig> {
    const config = await this.getConfig();
    config.deliveryVehicleTypes = vehicleTypes;
    return config.save();
  }
  // ============ END GIAO HÀNG ============

  // ============ LÁI XE HỘ - Hire Driver Pricing Methods ============
  async updateHireDriverPricing(hireDriverPricing: any[]): Promise<PricingConfig> {
    const config = await this.getConfig();
    config.hireDriverPricing = hireDriverPricing;
    return config.save();
  }

  /**
   * Calculate hire driver fare
   * Formula: If distance <= freeKm: openingFee
   *          If distance > freeKm: openingFee + (distance - freeKm) * pricePerExtraKm
   */
  async calculateHireDriverFare(vehicleType: string, distance: number): Promise<{ 
    total: number; 
    breakdown: { 
      openingFee: number; 
      freeKm: number; 
      extraKm: number; 
      extraKmFee: number; 
      pricePerExtraKm: number;
    } 
  }> {
    const pricingConfig = await this.getConfig();
    const config = pricingConfig.hireDriverPricing?.find(
      (h) => h.vehicleType === vehicleType
    );

    if (!config) {
      // Fallback to default
      const defaults: any = {
        bike: { openingFee: 50000, freeKm: 5, pricePerExtraKm: 5000 },
        sedan: { openingFee: 100000, freeKm: 10, pricePerExtraKm: 10000 },
        suv: { openingFee: 150000, freeKm: 10, pricePerExtraKm: 15000 },
        truck: { openingFee: 200000, freeKm: 10, pricePerExtraKm: 20000 },
      };
      const fallback = defaults[vehicleType] || defaults.sedan;

      const extraKm = Math.max(0, distance - fallback.freeKm);
      const extraKmFee = extraKm * fallback.pricePerExtraKm;
      const total = fallback.openingFee + extraKmFee;

      return {
        total,
        breakdown: {
          openingFee: fallback.openingFee,
          freeKm: fallback.freeKm,
          extraKm,
          extraKmFee,
          pricePerExtraKm: fallback.pricePerExtraKm,
        },
      };
    }

    const extraKm = Math.max(0, distance - config.freeKm);
    const extraKmFee = extraKm * config.pricePerExtraKm;
    const total = config.openingFee + extraKmFee;

    return {
      total,
      breakdown: {
        openingFee: config.openingFee,
        freeKm: config.freeKm,
        extraKm,
        extraKmFee,
        pricePerExtraKm: config.pricePerExtraKm,
      },
    };
  }
  // ============ END LÁI XE HỘ ============

  // ============ TOPUP DISCOUNT Methods ============
  async updateTopupDiscount(
    topupDiscountCustomer?: number,
    topupDiscountDriver?: number,
  ): Promise<PricingConfig> {
    const config = await this.getConfig();
    
    if (topupDiscountCustomer !== undefined) {
      // Validate 0-100
      config.topupDiscountCustomer = Math.max(0, Math.min(100, topupDiscountCustomer));
    }
    
    if (topupDiscountDriver !== undefined) {
      // Validate 0-100
      config.topupDiscountDriver = Math.max(0, Math.min(100, topupDiscountDriver));
    }
    
    return config.save();
  }

  async getTopupDiscount(userType: 'customer' | 'driver'): Promise<number> {
    try {
      console.log(`[PricingService] Getting topup discount for: ${userType}`);
      const config = await this.getConfig();
      
      console.log('[PricingService] Config loaded:', {
        hasConfig: !!config,
        topupDiscountCustomer: config?.topupDiscountCustomer,
        topupDiscountDriver: config?.topupDiscountDriver,
      });
      
      if (userType === 'customer') {
        const discount = config.topupDiscountCustomer || 0;
        console.log(`[PricingService] ✅ Customer discount: ${discount}%`);
        return discount;
      } else {
        const discount = config.topupDiscountDriver || 0;
        console.log(`[PricingService] ✅ Driver discount: ${discount}%`);
        return discount;
      }
    } catch (error) {
      console.error('[PricingService] ❌ Error getting topup discount:', error);
      console.error('[PricingService] ❌ Error stack:', error.stack);
      // Return 0 on error to prevent crash
      return 0;
    }
  }
  // ============ END TOPUP DISCOUNT ============
}
