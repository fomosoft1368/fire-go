import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CombinedTripDocument = CombinedTrip & Document;

export enum CombinedTripStatus {
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

@Schema({ timestamps: true })
export class CombinedTrip {
  @Prop({ type: [Types.ObjectId], ref: 'Customer', default: [] })
  customerId: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Driver' })
  driverId?: Types.ObjectId;

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

  // Trip details
  @Prop({ default: 4 })
  totalSeats: number;

  @Prop({ default: 1 })
  passengers: number;

  @Prop()
  notes?: string;

  // Status
  @Prop({
    type: String,
    enum: CombinedTripStatus,
    default: CombinedTripStatus.PENDING,
  })
  status: CombinedTripStatus;

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

  // ===== NEW FIELDS FOR CUSTOMER-INITIATED TRIPS (GRAB-LIKE FLOW) =====
  
  @Prop()
  createdBy?: 'driver' | 'customer'; // Who created this trip
  
  @Prop({ type: [Types.ObjectId], ref: 'Driver', default: [] })
  driverQueue?: Types.ObjectId[]; // Queue of nearby drivers
  
  @Prop({ default: 0 })
  currentDriverIndex?: number; // Current driver index in queue
  
  @Prop({ type: Types.ObjectId, ref: 'Driver' })
  currentDriverId?: Types.ObjectId; // Current driver being notified
  
  @Prop()
  notificationSentAt?: Date; // When notification was sent to current driver
  
  @Prop({ default: 1 })
  availableSeats?: number; // Number of seats customer needs
  
  @Prop()
  expiresAt?: Date; // When this trip expires (15 minutes for customer-created trips)
}

export const CombinedTripSchema = SchemaFactory.createForClass(CombinedTrip);

// Create geospatial index for pickup location
CombinedTripSchema.index({ 'pickupLocation': '2dsphere' });
CombinedTripSchema.index({ 'dropoffLocation': '2dsphere' });
CombinedTripSchema.index({ status: 1 });
CombinedTripSchema.index({ customerId: 1 });
CombinedTripSchema.index({ driverId: 1 });
