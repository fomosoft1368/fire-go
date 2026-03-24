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
      // ✨ SỬ DỤNG PROGRESSIVE PRICING (Tính cộng dồn theo từng khoảng)
      const distancePrice = this.calculateProgressiveDistancePrice(passenger.distance, vehicleConfig);
      const rawPrice = distancePrice + vehicleConfig.baseFee;

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
        distancePrice: distancePrice + 'đ', // ✨ Log progressive price
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
   * ✨ TÍNH GIÁ CỘNG DỒN THEO KHOẢNG CÁCH (Progressive Pricing)
   * 
   * Ví dụ: Đi 54km với config:
   * - 0-10km: 12,000đ/km
   * - 10-50km: 6,000đ/km  
   * - 50-100km: 5,000đ/km
   * 
   * Tính toán:
   * - 10km đầu: 10 × 12,000 = 120,000đ
   * - 40km tiếp: 40 × 6,000 = 240,000đ
   * - 4km cuối: 4 × 5,000 = 20,000đ
   * → Tổng: 380,000đ
   */
  private calculateProgressiveDistancePrice(distance: number, vehicleConfig: any): number {
    console.log('\n📏 [Progressive Distance Pricing - Backend]');
    console.log('  Distance:', distance, 'km');
    console.log('  Vehicle:', vehicleConfig.type, '-', vehicleConfig.name);
    
    // Kiểm tra có distanceRanges không
    if (!vehicleConfig.distanceRanges || vehicleConfig.distanceRanges.length === 0) {
      console.log('  ⚠️ No distance ranges configured');
      const totalPrice = distance * vehicleConfig.pricePerKm;
      console.log('  → Using default price:', vehicleConfig.pricePerKm, 'đ/km');
      console.log('  → Total:', totalPrice, 'đ');
      return totalPrice;
    }

    // Sắp xếp ranges theo minKm tăng dần
    const sortedRanges = [...vehicleConfig.distanceRanges].sort((a, b) => a.minKm - b.minKm);
    
    console.log('  Available ranges:');
    sortedRanges.forEach((range, idx) => {
      const maxDisplay = range.maxKm === -1 ? '∞' : range.maxKm;
      console.log(`    ${idx + 1}. ${range.minKm}-${maxDisplay}km: ${range.pricePerKm}đ/km`);
    });

    let totalPrice = 0;
    let coveredDistance = 0; // Km đã tính
    
    console.log('\n  Progressive calculation:');

    for (const range of sortedRanges) {
      // Nếu đã đủ km rồi thì stop
      if (coveredDistance >= distance) break;
      
      const rangeStart = range.minKm;
      const rangeEnd = range.maxKm === -1 ? Infinity : range.maxKm;
      
      // Skip range nếu chưa đến
      if (distance <= rangeStart) continue;
      
      // Tính km trong range này
      const startKmInRange = Math.max(rangeStart, coveredDistance);
      const endKmInRange = Math.min(rangeEnd, distance);
      const distanceInRange = endKmInRange - startKmInRange;
      
      if (distanceInRange <= 0) continue;
      
      const priceForRange = distanceInRange * range.pricePerKm;
      totalPrice += priceForRange;
      coveredDistance += distanceInRange;
      
      const maxDisplay = range.maxKm === -1 ? '∞' : range.maxKm;
      console.log(`    • ${rangeStart}-${maxDisplay}km: ${distanceInRange.toFixed(1)}km × ${range.pricePerKm}đ = ${priceForRange}đ`);
    }
    
    console.log(`  ✅ Total distance price: ${totalPrice}đ (covered ${coveredDistance}km)`);
    return totalPrice;
  }

  /**
   * ✨ LẤY GIÁ MỖI KM DỰA TRÊN KHOẢNG CÁCH (DEPRECATED - giữ lại cho backward compatibility)
   * Nếu có distanceRanges, tìm range phù hợp
   * Nếu không có, dùng pricePerKm mặc định
   */
  private getPricePerKmForDistance(distance: number, vehicleConfig: any): number {
    // Kiểm tra có distanceRanges không
    if (!vehicleConfig.distanceRanges || vehicleConfig.distanceRanges.length === 0) {
      // Không có ranges, dùng giá cố định
      return vehicleConfig.pricePerKm;
    }

    // Tìm range phù hợp với distance
    const matchingRange = vehicleConfig.distanceRanges.find((range: any) => {
      const minKm = range.minKm || 0;
      const maxKm = range.maxKm === -1 ? Infinity : range.maxKm; // -1 = vô hạn
      return distance >= minKm && distance <= maxKm;
    });

    if (matchingRange) {
      console.log(`  [Distance Range] ${distance}km → ${matchingRange.minKm}-${matchingRange.maxKm === -1 ? '∞' : matchingRange.maxKm}km: ${matchingRange.pricePerKm}đ/km`);
      return matchingRange.pricePerKm;
    }

    // Không tìm thấy range phù hợp, dùng giá mặc định
    console.warn(`  [Distance Range] No matching range for ${distance}km, using default: ${vehicleConfig.pricePerKm}đ/km`);
    return vehicleConfig.pricePerKm;
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
    let config = await this.pricingConfigModel.findOne().exec();
    
    if (!config) {
      // Create new config if none exists
      config = new this.pricingConfigModel(configData);
      return config.save();
    }
    
    // ✅ Update only provided fields, preserve others (e.g., topupDiscount, vehicleTypes)
    Object.keys(configData).forEach(key => {
      if (configData[key] !== undefined) {
        config[key] = configData[key];
      }
    });
    
    return config.save();
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
          distanceRanges: [], // Empty by default, admin can add via UI
        },
        {
          type: 'sedan',
          name: 'Sedan (4-5 chỗ)',
          baseFee: 20000,
          pricePerKm: 2000,
          minimumFare: 30000,
          distanceRanges: [],
        },
        {
          type: 'suv',
          name: 'SUV (7 chỗ)',
          baseFee: 25000,
          pricePerKm: 2500,
          minimumFare: 40000,
          distanceRanges: [],
        },
        {
          type: 'truck',
          name: 'Truck (Bán tải)',
          baseFee: 30000,
          pricePerKm: 3000,
          minimumFare: 50000,
          distanceRanges: [],
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

  // ============ CHUYẾN ĐI LIÊN TỈNH - Inter-Provincial Route Methods ============
  /**
   * Tính khoảng cách giữa 2 điểm theo công thức Haversine (km)
   */
  private calculateHaversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371; // Bán kính trái đất (km)
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Kiểm tra xem điểm có nằm trong bán kính của location không
   */
  private isPointInRadius(
    pointLat: number,
    pointLng: number,
    centerLat: number,
    centerLng: number,
    radiusKm: number,
  ): boolean {
    const distance = this.calculateHaversineDistance(
      pointLat,
      pointLng,
      centerLat,
      centerLng,
    );
    return distance <= radiusKm;
  }

  /**
   * Tìm các chuyến đi liên tỉnh phù hợp với điểm đón và điểm đến
   */
  async findMatchingInterProvincialRoutes(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    vehicleType: string,
  ): Promise<any[]> {
    const config = await this.getConfig();
    const routes = config.interProvincialRoutes || [];

    console.log('\n🚍 [Inter-Provincial] Finding matching routes:', {
      pickup: { lat: pickupLat, lng: pickupLng },
      dropoff: { lat: dropoffLat, lng: dropoffLng },
      vehicleType,
      totalRoutes: routes.length,
    });

    // Lọc routes phù hợp
    const matchingRoutes = routes.filter((route: any) => {
      // Kiểm tra route có active không
      if (!route.isActive) {
        console.log(`  ⏭️  Skip route ${route.name}: Inactive`);
        return false;
      }

      // Kiểm tra vehicle type
      if (route.vehicleType !== vehicleType) {
        console.log(`  ⏭️  Skip route ${route.name}: Wrong vehicle type (need ${vehicleType}, got ${route.vehicleType})`);
        return false;
      }

      // Kiểm tra pickup có trong vùng origin không
      const pickupInOrigin = this.isPointInRadius(
        pickupLat,
        pickupLng,
        route.origin.coordinates.lat,
        route.origin.coordinates.lng,
        route.origin.radius,
      );

      if (!pickupInOrigin) {
        const distanceToOrigin = this.calculateHaversineDistance(
          pickupLat,
          pickupLng,
          route.origin.coordinates.lat,
          route.origin.coordinates.lng,
        );
        console.log(`  ⏭️  Skip route ${route.name}: Pickup too far from origin (${distanceToOrigin.toFixed(1)}km > ${route.origin.radius}km)`);
        return false;
      }

      // Kiểm tra dropoff có trong vùng destination không
      const dropoffInDestination = this.isPointInRadius(
        dropoffLat,
        dropoffLng,
        route.destination.coordinates.lat,
        route.destination.coordinates.lng,
        route.destination.radius,
      );

      if (!dropoffInDestination) {
        const distanceToDestination = this.calculateHaversineDistance(
          dropoffLat,
          dropoffLng,
          route.destination.coordinates.lat,
          route.destination.coordinates.lng,
        );
        console.log(`  ⏭️  Skip route ${route.name}: Dropoff too far from destination (${distanceToDestination.toFixed(1)}km > ${route.destination.radius}km)`);
        return false;
      }

      console.log(`  ✅ Match found: ${route.name} (${route.fixedPrice.toLocaleString()}đ)`);
      return true;
    });

    console.log(`\n🎯 [Inter-Provincial] Found ${matchingRoutes.length} matching routes\n`);
    return matchingRoutes;
  }

  /**
   * Tính giá cho chuyến đi liên tỉnh
   * CHỈ áp dụng giảm giá ghép xe, KHÔNG áp dụng peak multiplier
   */
  async calculateInterProvincialPrice(
    routeId: string,
    totalPassengers: number,
  ): Promise<{
    routeInfo: any;
    fixedPrice: number;
    discountRate: number;
    finalPrice: number;
    pricePerPerson: number;
  }> {
    const config = await this.getConfig();
    const route = config.interProvincialRoutes?.find((r: any) => r.id === routeId);

    if (!route) {
      throw new Error(`Inter-provincial route ${routeId} not found`);
    }

    console.log('\n💰 ============ TÍNH GIÁ LIÊN TỈNH ============');
    console.log('  Route:', route.name);
    console.log('  Giá cố định:', route.fixedPrice.toLocaleString(), 'đ');
    console.log('  Số người ghép:', totalPassengers);
    console.log('========================================\n');

    // Tìm discount rate theo số người
    const discountConfig = config.carpoolDiscounts.find(
      (d) => d.passengers === totalPassengers,
    );
    const discountRate = discountConfig ? discountConfig.discount / 100 : 0;

    console.log('📊 [BƯỚC 1] Giá cố định (fixed price):');
    console.log('  Công thức: Giá route cố định (KHÔNG tính theo km)');
    console.log('  → Fixed price:', route.fixedPrice.toLocaleString(), 'đ');

    console.log('\n📊 [BƯỚC 2] Giảm giá ghép xe:');
    console.log('  Số người:', totalPassengers);
    console.log('  Giảm giá:', Math.round(discountRate * 100) + '%');
    console.log('  Công thức:', route.fixedPrice.toLocaleString(), '× (1 -', discountRate + ')');

    // Tính giá sau giảm
    const finalPrice = Math.round(route.fixedPrice * (1 - discountRate));
    console.log('  → Giá sau giảm:', finalPrice.toLocaleString(), 'đ');

    // Tính giá trung bình mỗi người (để hiển thị)
    const pricePerPerson = Math.round(finalPrice / totalPassengers);

    console.log('\n🎯 ============ KẾT QUẢ CUỐI CÙNG ============');
    console.log('  💵 TỔNG GIÁ:', finalPrice.toLocaleString(), 'đ');
    console.log('  💵 TRUNG BÌNH MỖI NGƯỜI:', pricePerPerson.toLocaleString(), 'đ');
    console.log('\n  Chi tiết:');
    console.log('    • Giá cố định:', route.fixedPrice.toLocaleString(), 'đ');
    if (discountRate > 0) {
      console.log('    • Giảm giá ghép xe:', '-' + Math.round(discountRate * 100) + '%');
    }
    console.log('    • Giá cuối:', finalPrice.toLocaleString(), 'đ');
    console.log('    • ⚠️  KHÔNG áp dụng giờ cao điểm');
    console.log('    • ⚠️  KHÔNG tính theo km');
    console.log('============================================\n');

    return {
      routeInfo: {
        id: route.id,
        name: route.name,
        origin: route.origin,
        destination: route.destination,
        vehicleType: route.vehicleType,
        estimatedDuration: route.estimatedDuration,
      },
      fixedPrice: route.fixedPrice,
      discountRate: Math.round(discountRate * 100),
      finalPrice,
      pricePerPerson,
    };
  }
  // ============ END CHUYẾN ĐI LIÊN TỈNH ============

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

  async getMinTopupAmount(userType: 'customer' | 'driver'): Promise<number> {
    try {
      const config = await this.getConfig();
      if (userType === 'customer') {
        return config.minTopupAmountCustomer || 10000;
      } else {
        return config.minTopupAmountDriver || 10000;
      }
    } catch (error) {
      console.error('[PricingService] Error getting min topup amount:', error);
      return 10000; // Default fallback
    }
  }

  async getMaxTopupAmount(): Promise<number> {
    try {
      const config = await this.getConfig();
      return config.maxTopupAmount || 100000000;
    } catch (error) {
      console.error('[PricingService] Error getting max topup amount:', error);
      return 100000000; // Default fallback
    }
  }

  async getMinWithdrawAmount(userType: 'driver' | 'customer'): Promise<number> {
    try {
      const config = await this.getConfig();
      if (userType === 'customer') {
        return config.minWithdrawAmountCustomer || 50000;
      } else {
        return config.minWithdrawAmountDriver || 50000;
      }
    } catch (error) {
      console.error('[PricingService] Error getting min withdraw amount:', error);
      return 50000; // Default fallback
    }
  }

  async getMinWalletBalanceToGoOnline(): Promise<number> {
    try {
      const config = await this.getConfig();
      return config.minWalletBalanceToGoOnline || 100000;
    } catch (error) {
      console.error('[PricingService] Error getting min wallet balance:', error);
      return 100000; // Default fallback
    }
  }
  // ============ END TOPUP DISCOUNT ============
}
