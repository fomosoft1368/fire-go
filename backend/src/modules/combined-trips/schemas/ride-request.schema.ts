import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { User } from '../../auth/schemas/user.schema'

export enum RequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  TIMEOUT = 'timeout', // ✅ Add timeout status for driver rotation
  CANCELLED = 'cancelled', // ✅ Add cancelled status
  ARRIVED_AT_PICKUP = 'arrived_at_pickup',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}
@Schema({ 
  timestamps: true,
  collection: 'combinedtriprequests',
})

export class RideRequest extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Ride' })
  rideId?: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'CombinedTrip' })
  combinedTripId?: Types.ObjectId

  @Prop({ type: String, enum: ['ride', 'combined_trip'], default: 'ride' })
  tripType: 'ride' | 'combined_trip'

  @Prop({ type: String, enum: ['driver', 'customer'] })
  createdBy?: 'driver' | 'customer' // Who created the trip: driver (existing trip) or customer (new request)

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'Driver' })
  driverId?: Types.ObjectId

  @Prop({ type: String, enum: RequestStatus , default: RequestStatus.PENDING })
  status: RequestStatus

  @Prop({ type: Number, default: 1 })
  seats: number

  @Prop({ type: String })
  notes?: string

  @Prop({ type: Number })
  fare?: number
  
  @Prop({ type: Boolean, default: false })
  isPeakTime: boolean

  @Prop({ type: Number, default: 1.0 })
  peakMultiplier: number // 1.0 (giờ thường), 1.3 (sáng cao điểm), 1.5 (chiều cao điểm)

  @Prop({ type: [Number] }) // [lng, lat]
  pickupCoordinates?: number[]

  @Prop({ type: String })
  pickupAddress?: string

  @Prop({ type: [Number] }) // [lng, lat]
  dropoffCoordinates?: number[]

  @Prop({ type: String })
  dropoffAddress?: string

  @Prop({ type: Number })
  distance?: number

  @Prop({ type: Date, default: Date.now })
  createdAt: Date

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date

  @Prop({ type: Date })
  expiresAt?: Date // When this request expires (for timeout logic)
}

export type RideRequestDocument = RideRequest & Document
export const RideRequestSchema = SchemaFactory.createForClass(RideRequest)
