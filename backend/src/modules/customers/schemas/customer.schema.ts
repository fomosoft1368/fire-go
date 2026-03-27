import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CustomerDocument = Customer & Document;

@Schema({ timestamps: true })
export class Customer {
  // Authentication fields (tài khoản độc lập)
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  avatar?: string;

  // Contact information
  @Prop()
  dateOfBirth?: Date;

  @Prop()
  gender?: string;

  @Prop()
  address?: string;

  // Preferences
  @Prop({ default: true })
  shareRidePreference: boolean;

  @Prop({ default: false })
  preferredDriverGender?: string;

  // Saved addresses
  @Prop([
    {
      label: String,
      address: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: [Number],
      },
    },
  ])
  savedAddresses: Array<{
    label: string;
    address: string;
    coordinates: {
      type: string;
      coordinates: [number, number];
    };
  }>;

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
  totalSpent: number;

  @Prop({ default: 0 })
  walletBalance: number; // Số dư ví (VNĐ) - dùng cho đặt cọc và thanh toán

  // Emergency contacts
  @Prop([
    {
      name: String,
      phone: String,
      relationship: String,
    },
  ])
  emergencyContacts: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;

  // Preferences
  @Prop({ default: true })
  allowNotifications: boolean;

  @Prop({ default: true })
  allowSMS: boolean;

  @Prop({ default: true })
  allowEmail: boolean;

  // Safety features
  @Prop({ default: false })
  shareLocationDuringRide: boolean;

  @Prop({ default: false })
  notifyEmergencyContacts: boolean;

  // Status
  @Prop({ default: false })
  isBlacklisted: boolean;

  @Prop()
  blacklistReason?: string;

  @Prop({ default: false })
  isAccountLocked: boolean;

  // Push notifications
  @Prop()
  expoPushToken?: string;
}

export const CustomerSchema = SchemaFactory.createForClass(Customer);

CustomerSchema.index({ email: 1 });
CustomerSchema.index({ phone: 1 });
CustomerSchema.index({ isBlacklisted: 1 });
CustomerSchema.index({ isAccountLocked: 1 });
