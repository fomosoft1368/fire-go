import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type DriverDocument = Driver & Document;

export enum DocumentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum DriverStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  ON_TRIP = 'on_trip',
  BREAK = 'break',
}

@Schema({ timestamps: true })
export class Driver {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: DriverStatus,
    default: DriverStatus.OFFLINE,
  })
  status: DriverStatus;

  // Vehicle information
  @Prop({ required: true })
  vehicleLicense: string;

  @Prop({ required: true })
  vehicleModel: string;

  @Prop({ required: true })
  vehicleColor: string;

  @Prop({ required: true })
  vehiclePlate: string;

  @Prop()
  vehicleImage?: string;

  // Driver license
  @Prop({ required: true })
  licenseNumber: string;

  @Prop({ required: true })
  licenseExpiry: Date;

  @Prop()
  licenseImage?: string;

  @Prop({
    type: String,
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  licenseStatus: DocumentStatus;

  // ID verification
  @Prop()
  idNumber?: string;

  @Prop()
  idType?: string;

  @Prop()
  idImage?: string;

  @Prop({
    type: String,
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  idStatus: DocumentStatus;

  // Background check
  @Prop({ default: false })
  backgroundCheckPassed: boolean;

  @Prop()
  backgroundCheckDate?: Date;

  // Insurance
  @Prop()
  insuranceProvider?: string;

  @Prop()
  insuranceExpiry?: Date;

  @Prop()
  insuranceCertificate?: string;

  // Banking information
  @Prop()
  bankName?: string;

  @Prop()
  bankAccount?: string;

  @Prop()
  bankAccountHolder?: string;

  // Ratings and statistics
  @Prop({ default: 0 })
  totalRides: number;

  @Prop({ default: 0 })
  completedRides: number;

  @Prop({ default: 0 })
  cancelledRides: number;

  @Prop({ default: 5 })
  averageRating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ default: 0 })
  totalEarnings: number;

  // Current location (geospatial)
  @Prop({
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number],
  })
  currentLocation?: {
    type: string;
    coordinates: [number, number];
  };

  @Prop()
  lastLocationUpdate?: Date;

  // Status flags
  @Prop({ default: true })
  isAcceptingRides: boolean;

  @Prop({ default: false })
  isSuspended: boolean;

  @Prop()
  suspensionReason?: string;

  @Prop()
  suspendedUntil?: Date;

  // Documents approval
  @Prop()
  approvedAt?: Date;

  @Prop()
  approvedBy?: string;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);

DriverSchema.index({ 'currentLocation': '2dsphere' });
DriverSchema.index({ userId: 1 });
DriverSchema.index({ status: 1 });
DriverSchema.index({ licenseExpiry: 1 });
DriverSchema.index({ isSuspended: 1 });
