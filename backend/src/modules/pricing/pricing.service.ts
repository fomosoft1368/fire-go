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

      // BƯỚC 2: Tính base_price (áp dụng peak nếu NGƯỜI NÀY trong giờ cao điểm)
      const basePrice = passenger.isPeakTime
        ? rawPrice * config.peakMultiplier
        : rawPrice;

      // BƯỚC 3: Tính final_price (áp dụng CÙNG discount cho tất cả)
      let finalPrice = basePrice * (1 - discountRate);

      // BƯỚC 4: Áp dụng minimum fare cho TỪNG NGƯỜI
      if (finalPrice < vehicleConfig.minimumFare) {
        finalPrice = vehicleConfig.minimumFare;
      }

      console.log(`  [Passenger ${index + 1}]:`, {
        distance: passenger.distance + 'km',
        isPeakTime: passenger.isPeakTime,
        rawPrice,
        basePrice,
        discount: Math.round(discountRate * 100) + '%',
        finalPrice: Math.round(finalPrice),
      });

      breakdown.push({
        passengerIndex: index + 1,
        distance: passenger.distance,
        isPeakTime: passenger.isPeakTime || false,
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
    });
    
    if (!config) {
      console.warn('⚠️ [PricingService] No config in DB, creating default...');
      // Create default config if none exists
      return this.createDefaultConfig();
    }
    
    console.log('✅ [PricingService] Using config from DATABASE');
    return config;
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
          type: 'sedan',
          name: 'Sedan (4-5 chỗ)',
          baseFee: 20000,
          pricePerKm: 8000,
          minimumFare: 30000,
        },
        {
          type: 'suv',
          name: 'SUV (7 chỗ)',
          baseFee: 25000,
          pricePerKm: 10000,
          minimumFare: 40000,
        },
        {
          type: 'truck',
          name: 'Truck (Bán tải)',
          baseFee: 30000,
          pricePerKm: 12000,
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
    });
    
    return defaultConfig.save();
  }
}
