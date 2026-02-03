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
}

export const PricingConfigSchema = SchemaFactory.createForClass(PricingConfig);
