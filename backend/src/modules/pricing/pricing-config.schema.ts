import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PricingConfigDocument = PricingConfig & Document;

@Schema()
export class PeakHour {
  @Prop({ required: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ required: true })
  multiplier: number;
}

@Schema()
export class CarpoolDiscount {
  @Prop({ required: true })
  passengers: number;

  @Prop({ required: true })
  discount: number;
}

// ============ DISTANCE RANGE - Giá theo khoảng cách ============
@Schema()
export class DistanceRange {
  @Prop({ required: true })
  id: string; // Unique ID for frontend

  @Prop({ required: true })
  minKm: number; // Khoảng cách tối thiểu (km), ví dụ: 0

  @Prop({ required: true })
  maxKm: number; // Khoảng cách tối đa (km), ví dụ: 10, hoặc Infinity

  @Prop({ required: true })
  pricePerKm: number; // Giá mỗi km trong khoảng này (VNĐ)
}
// ============ END DISTANCE RANGE ============

@Schema()
export class VehicleTypePrice {
  @Prop({ required: true })
  type: string; // 'sedan', 'suv', 'truck'

  @Prop({ required: true })
  name: string; // 'Sedan (4-5 chỗ)', 'SUV (7 chỗ)', 'Truck (Bán tải)'

  @Prop({ required: true })
  baseFee: number;

  @Prop({ required: true })
  pricePerKm: number; // Giá mặc định (fallback nếu không có distanceRanges)

  @Prop({ required: true })
  minimumFare: number;

  @Prop({ type: [DistanceRange], default: [] })
  distanceRanges: DistanceRange[]; // ✨ NEW: Giá theo khoảng cách
}

// ============ GIAO HÀNG - Delivery Pricing Config ============
@Schema()
export class DeliveryGoodsType {
  @Prop({ required: true })
  key: string; // 'light', 'bulky', 'food'

  @Prop({ required: true })
  label: string; // 'Hàng nhẹ', 'Cồng kềnh', 'Thực phẩm'

  @Prop({ required: true })
  icon: string; // 'cube-outline', 'archive-outline', 'food-apple-outline'

  @Prop({ required: true, default: 0 })
  surcharge: number; // Phụ phí (VNĐ)
}

@Schema()
export class DeliveryWeightRange {
  @Prop({ required: true })
  key: string; // '<20', '20-50', '>50'

  @Prop({ required: true })
  label: string; // '< 20kg', '20-50kg', '> 50kg'

  @Prop({ required: true, default: 0 })
  surcharge: number; // Phụ phí (VNĐ)
}

@Schema()
export class DeliveryVehicleType {
  @Prop({ required: true })
  key: string; // 'bike', 'truck'

  @Prop({ required: true })
  label: string; // 'Xe máy', 'Xe tải nhỏ'

  @Prop({ required: true })
  description: string; // 'Phù hợp hàng nhỏ', 'Sức tải 500kg'

  @Prop({ required: true })
  icon: string; // 'motorbike', 'truck-outline'

  @Prop({ required: true })
  vehicleTypeMapping: string; // 'sedan' | 'truck' - Maps to pricing vehicle type
}
// ============ END GIAO HÀNG ============

// ============ LÁI XE HỘ - Hire Driver Pricing Config ============
@Schema()
export class HireDriverPricing {
  @Prop({ required: true })
  vehicleType: string; // 'bike', 'sedan', 'suv', 'truck'

  @Prop({ required: true })
  name: string; // 'Xe máy', 'Sedan', 'SUV', 'Truck'

  @Prop({ required: true })
  openingFee: number; // Phí mở cửa (VNĐ)

  @Prop({ required: true })
  freeKm: number; // Số km miễn phí trong phí mở cửa

  @Prop({ required: true })
  pricePerExtraKm: number; // Giá mỗi km vượt (VNĐ/km)

  @Prop()
  description?: string; // Mô tả (optional)

  @Prop({ default: 50 })
  depositMinKm: number; // Quãng đường tối thiểu để yêu cầu đặt cọc (km), mặc định 50km

  @Prop({ default: 30 })
  depositPercent: number; // Tỷ lệ tiền cọc (%), mặc định 30%
}
// ============ END LÁI XE HỘ ============

// ============ CHUYẾN ĐI LIÊN TỈNH - Inter-Provincial Route ============
@Schema()
export class InterProvincialRoute {
  @Prop({ required: true })
  id: string; // Unique ID for frontend

  @Prop({ required: true })
  name: string; // 'Hà Tĩnh - Vinh', 'Hà Nội - Hải Phòng'

  @Prop({ required: true, type: Object })
  origin: {
    city: string; // 'TP. Hà Tĩnh'
    province: string; // 'Hà Tĩnh'
    coordinates: { lat: number; lng: number }; // Tọa độ trung tâm
    radius: number; // Bán kính (km) để check điểm nằm trong vùng
  };

  @Prop({ required: true, type: Object })
  destination: {
    city: string; // 'TP. Vinh'
    province: string; // 'Nghệ An'
    coordinates: { lat: number; lng: number };
    radius: number; // Bán kính (km)
  };

  @Prop({ required: true })
  fixedPrice: number; // Giá cố định (VNĐ) - không tính theo km

  @Prop({ required: true })
  vehicleType: string; // 'sedan', 'suv', 'truck' - Loại xe áp dụng

  @Prop({ default: true })
  isActive: boolean; // Bật/tắt route

  @Prop()
  description?: string; // Mô tả (optional)

  @Prop()
  estimatedDuration?: number; // Thời gian di chuyển dự kiến (phút)
}
// ============ END CHUYẾN ĐI LIÊN TỈNH ============

@Schema({ timestamps: true })
export class PricingConfig {
  @Prop({ type: [VehicleTypePrice], default: [] })
  vehicleTypes: VehicleTypePrice[];

  @Prop({ required: true, default: 1.2 })
  peakMultiplier: number;

  @Prop({ required: true, default: 85 })
  driverShare: number;

  @Prop({ default: 30 })
  maxDiscountRate: number;

  @Prop({ type: [CarpoolDiscount], default: [] })
  carpoolDiscounts: CarpoolDiscount[];

  @Prop({ type: [PeakHour], default: [] })
  peakHours: PeakHour[];

  // ============ GIAO HÀNG - Delivery Config ============
  @Prop({ type: [DeliveryGoodsType], default: [] })
  deliveryGoodsTypes: DeliveryGoodsType[];

  @Prop({ type: [DeliveryWeightRange], default: [] })
  deliveryWeightRanges: DeliveryWeightRange[];

  @Prop({ type: [DeliveryVehicleType], default: [] })
  deliveryVehicleTypes: DeliveryVehicleType[];
  // ============ END GIAO HÀNG ============

  // ============ LÁI XE HỘ - Hire Driver Config ============
  @Prop({ type: [HireDriverPricing], default: [] })
  hireDriverPricing: HireDriverPricing[];
  // ============ END LÁI XE HỘ ============

  // ============ CHUYẾN ĐI LIÊN TỈNH - Inter-Provincial Routes ============
  @Prop({ type: [InterProvincialRoute], default: [] })
  interProvincialRoutes: InterProvincialRoute[];
  // ============ END CHUYẾN ĐI LIÊN TỈNH ============

  // ============ TOPUP DISCOUNT - Nạp tiền chiết khấu ============
  @Prop({ required: false, default: 0 })
  topupDiscountCustomer: number; // Phần trăm chiết khấu nạp tiền khách hàng (0-100)

  @Prop({ required: false, default: 0 })
  topupDiscountDriver: number; // Phần trăm chiết khấu nạp tiền tài xế (0-100)
  // ============ END TOPUP DISCOUNT ============

  // ============ WALLET & TOPUP LIMITS - Giới hạn ví & nạp tiền ============
  @Prop({ default: 10000 })
  minTopupAmountDriver: number; // Số tiền nạp tối thiểu cho tài xế (VNĐ)

  @Prop({ default: 10000 })
  minTopupAmountCustomer: number; // Số tiền nạp tối thiểu cho khách hàng (VNĐ)

  @Prop({ default: 50000 })
  minWithdrawAmountDriver: number; // Số tiền rút tối thiểu cho tài xế (VNĐ)

  @Prop({ default: 50000 })
  minWithdrawAmountCustomer: number; // Số tiền rút tối thiểu cho khách hàng (VNĐ)

  @Prop({ default: 100000 })
  minWalletBalanceToGoOnline: number; // Số dư ví tối thiểu để bật online nhận chuyến (VNĐ)

  @Prop({ default: 100000000 })
  maxTopupAmount: number; // Số tiền nạp tối đa mỗi lần (VNĐ)
  // ============ END WALLET & TOPUP LIMITS ============
}

export const PricingConfigSchema = SchemaFactory.createForClass(PricingConfig);
