import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'
import { User } from '../../auth/schemas/user.schema'

export enum RequestStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
}

@Schema({ timestamps: true })
export class RideRequest extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Ride', required: true })
  rideId: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  customerId: Types.ObjectId

  @Prop({ type: String, enum: RequestStatus, default: RequestStatus.PENDING })
  status: RequestStatus

  @Prop({ type: Number, default: 1 })
  seats: number

  @Prop({ type: String })
  notes?: string

  @Prop({ type: Number })
  fare?: number

  @Prop({ type: [Number] }) // [lng, lat]
  pickupCoordinates?: number[]

  @Prop({ type: String })
  pickupAddress?: string

  @Prop({ type: [Number] }) // [lng, lat]
  dropoffCoordinates?: number[]

  @Prop({ type: String })
  dropoffAddress?: string

  @Prop({ type: Date, default: Date.now })
  createdAt: Date

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date
}

export type RideRequestDocument = RideRequest & Document
export const RideRequestSchema = SchemaFactory.createForClass(RideRequest)
