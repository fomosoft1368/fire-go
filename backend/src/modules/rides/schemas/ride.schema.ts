import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RideDocument = Ride & Document;

export enum RideStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  CASH = 'cash',
  WALLET = 'wallet',
  CARD = 'card',
}

export enum CarType {
  SEDAN = 'sedan',
  SUV = 'suv',
  TRUCK = 'truck',
}

export enum TransmissionType {
  AUTO = 'auto',
  MANUAL = 'manual',
}

export enum RideType {
  SHARE = 'share', // Ghép xe - tìm khách hàng khác cùng tuyến
  HIRE = 'hire',   // Lái xe hộ - thuê tài xế riêng
}

@Schema({ timestamps: true })
export class Ride {
  @Prop({ type: [Types.ObjectId], ref: 'Customer', default: [] })
  customerId: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Driver' })
  driverId?: Types.ObjectId;

  @Prop({
    type: String,
    enum: RideType,
    default: RideType.SHARE,
  })
  rideType: RideType;

  @Prop({
    type: String,
    enum: RideStatus,
    default: RideStatus.PENDING,
  })
  status: RideStatus;

  // Pickup location
  @Prop({ required: true })
  pickupAddress: string;

  @Prop({
    type: Object,
    default: { type: 'Point', coordinates: [] }
  })
  pickupLocation: {
    type: string;
    coordinates: [number, number]; // [longitude, latitude]
  };

  // Pickup location hierarchy for multi-level filtering
  @Prop()
  pickupProvince?: string; // Tỉnh/Thành phố

  @Prop()
  pickupDistrict?: string; // Huyện/Quận

  @Prop()
  pickupWard?: string; // Xã/Phường

  // Dropoff location
  @Prop({ required: true })
  dropoffAddress: string;

  @Prop({
    type: Object,
    default: { type: 'Point', coordinates: [] }
  })
  dropoffLocation: {
    type: string;
    coordinates: [number, number];
  };

  // Dropoff location hierarchy for multi-level filtering
  @Prop()
  dropoffProvince?: string; // Tỉnh/Thành phố

  @Prop()
  dropoffDistrict?: string; // Huyện/Quận

  @Prop()
  dropoffWard?: string; // Xã/Phường

  // Distance and duration
  @Prop({ required: true })
  distance: number; // in km

  @Prop({ required: true })
  duration: number; // in minutes

  // Pricing
  @Prop({ required: true })
  baseFare: number;

  @Prop({ default: 0 })
  distanceFare: number;

  @Prop({ default: 0 })
  timeFare: number;

  @Prop({ default: 0 })
  surgePricing: number;

  @Prop({ default: 0 })
  totalFare: number;

  // Payment
  @Prop({
    type: String,
    enum: PaymentMethod,
    default: PaymentMethod.WALLET,
  })
  paymentMethod: PaymentMethod;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop()
  paidAt?: Date;

  // Ride details
  @Prop({ default: 4 })
  totalSeats: number;

  @Prop({ default: 1 })
  passengers: number;

  @Prop()
  notes?: string;

  // Hire Driver specific fields
  @Prop({ type: String, enum: CarType })
  carType?: CarType;

  @Prop()
  licensePlate?: string;

  @Prop({ type: String, enum: TransmissionType })
  transmission?: TransmissionType;

  @Prop()
  driverNote?: string;

  @Prop({ default: false })
  isScheduled: boolean;

  @Prop()
  scheduledTime?: Date;

  // Ratings
  @Prop({ min: 1, max: 5 })
  driverRating?: number;

  @Prop()
  driverReview?: string;

  @Prop({ min: 1, max: 5 })
  customerRating?: number;

  @Prop()
  customerReview?: string;

  // Timestamps
  @Prop({ default: Date.now })
  requestedAt: Date;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  startedAt?: Date;

  @Prop()
  completedAt?: Date;

  @Prop()
  cancelledAt?: Date;

  @Prop()
  cancellationReason?: string;

  @Prop()
  cancellationBy?: 'driver' | 'customer';
}

export const RideSchema = SchemaFactory.createForClass(Ride);

// Create geospatial index for pickup location
RideSchema.index({ 'pickupLocation': '2dsphere' });
RideSchema.index({ 'dropoffLocation': '2dsphere' });
RideSchema.index({ status: 1 });
RideSchema.index({ customerId: 1 });
RideSchema.index({ driverId: 1 });
