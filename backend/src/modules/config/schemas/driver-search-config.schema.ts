import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ServiceType {
  HIRE = 'hire', // Lái xe hộ
  RIDESHARE = 'rideshare', // Ghép xe
  DELIVERY = 'delivery', // Giao hàng
}

@Schema({ timestamps: true })
export class DriverSearchConfig extends Document {
  @Prop({ type: String, enum: ServiceType, required: true, unique: true })
  serviceType: ServiceType;

  @Prop({ type: Number, required: true, default: 10000 })
  searchRadiusMeters: number; // Bán kính tìm kiếm (meters)

  @Prop({ type: Number, default: 10 })
  maxDriversToNotify: number; // Số tài xế tối đa được thông báo

  @Prop({ type: Number, default: 30000 })
  requestTimeoutMs: number; // Thời gian timeout cho request (milliseconds)

  @Prop({ type: Boolean, default: true })
  isActive: boolean; // Bật/tắt dịch vụ

  @Prop({ type: String })
  description?: string; // Mô tả cấu hình

  createdAt?: Date;
  updatedAt?: Date;
}

export type DriverSearchConfigDocument = DriverSearchConfig & Document;
export const DriverSearchConfigSchema =
  SchemaFactory.createForClass(DriverSearchConfig);

// Create index for fast lookup
DriverSearchConfigSchema.index({ serviceType: 1 });
