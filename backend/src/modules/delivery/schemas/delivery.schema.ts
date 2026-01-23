import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export enum DeliveryStatus {
  PENDING = 'pending',
  FINDING_DRIVER = 'finding_driver',
  DRIVER_ASSIGNED = 'driver_assigned',
  PICKING_UP = 'picking_up',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum GoodsType {
  LIGHT = 'light',
  BULKY = 'bulky',
  FOOD = 'food',
}

export enum VehicleType {
  BIKE = 'bike',
  TRUCK = 'truck',
}

export enum WeightRange {
  LESS_THAN_20 = '<20',
  BETWEEN_20_50 = '20-50',
  MORE_THAN_50 = '>50',
}

@Schema({ timestamps: true })
export class Delivery extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Driver', default: null })
  driverId: Types.ObjectId;

  @Prop({ required: true })
  pickupAddress: string;

  @Prop({ type: [Number], required: true, index: '2dsphere' })
  pickupCoordinates: [number, number];

  @Prop({ required: true })
  dropoffAddress: string;

  @Prop({ type: [Number], required: true, index: '2dsphere' })
  dropoffCoordinates: [number, number];

  @Prop({ enum: GoodsType, required: true })
  goodsType: GoodsType;

  @Prop({ enum: WeightRange, required: true })
  weight: WeightRange;

  @Prop({ enum: VehicleType, required: true })
  vehicle: VehicleType;

  @Prop({ required: true })
  estimatedPrice: number;

  @Prop({ default: null })
  actualPrice: number;

  @Prop({ default: null })
  distance: string;

  @Prop({ default: null })
  duration: string;

  @Prop({ enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status: DeliveryStatus;

  @Prop({ default: null })
  notes: string;

  @Prop({ default: null })
  rating: number;

  @Prop({ default: null })
  comment: string;

  @Prop({ default: null })
  feedback: string;

  @Prop({ default: null })
  cancelReason: string;

  @Prop({ default: null })
  pickupTime: Date;

  @Prop({ default: null })
  deliveredTime: Date;

  @Prop({ default: null })
  cancelledTime: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const DeliverySchema = SchemaFactory.createForClass(Delivery);

// Create indexes
DeliverySchema.index({ customerId: 1, createdAt: -1 });
DeliverySchema.index({ driverId: 1, createdAt: -1 });
DeliverySchema.index({ status: 1 });
DeliverySchema.index({ pickupCoordinates: '2dsphere' });
DeliverySchema.index({ dropoffCoordinates: '2dsphere' });
