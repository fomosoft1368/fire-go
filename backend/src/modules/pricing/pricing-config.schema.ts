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

@Schema()
export class VehicleTypePrice {
  @Prop({ required: true })
  type: string; // 'sedan', 'suv', 'truck'

  @Prop({ required: true })
  name: string; // 'Sedan (4-5 chỗ)', 'SUV (7 chỗ)', 'Truck (Bán tải)'

  @Prop({ required: true })
  baseFee: number;

  @Prop({ required: true })
  pricePerKm: number;

  @Prop({ required: true })
  minimumFare: number;
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
}

export const PricingConfigSchema = SchemaFactory.createForClass(PricingConfig);
