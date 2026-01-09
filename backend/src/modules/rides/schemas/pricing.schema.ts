import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PricingDocument = HydratedDocument<Pricing>;

@Schema({ timestamps: true })
export class Pricing {
  @Prop({ required: true, enum: ['basic', 'comfort', 'premium'] })
  vehicleType: string;

  @Prop({ required: true, min: 0 })
  baseFare: number; // Giá mở cửa (VND)

  @Prop({ required: true, min: 0 })
  pricePerKm: number; // Đơn giá/km (VND)

  @Prop({ required: true, min: 0 })
  pricePerMinute: number; // Đơn giá/phút (VND)

  @Prop({ default: 0, min: 0 })
  peakHourSurge: number; // Phụ phí giờ cao điểm (%)

  @Prop({ default: 0, min: 0 })
  rainyDaySurge: number; // Phụ phí mưa (%)

  @Prop({ default: 0, min: 0 })
  minimumFare: number; // Giá tối thiểu (VND)

  @Prop({ required: true, default: true })
  isActive: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PricingSchema = SchemaFactory.createForClass(Pricing);
