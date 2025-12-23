import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  RIDE_REQUEST = 'ride_request',
  RIDE_ACCEPTED = 'ride_accepted',
  RIDE_STARTED = 'ride_started',
  RIDE_COMPLETED = 'ride_completed',
  RIDE_CANCELLED = 'ride_cancelled',
  PAYMENT_CONFIRMATION = 'payment_confirmation',
  REVIEW_RECEIVED = 'review_received',
  DRIVER_RATED = 'driver_rated',
  CUSTOMER_RATED = 'customer_rated',
  EARNINGS_RECEIVED = 'earnings_received',
  SYSTEM_MESSAGE = 'system_message',
  PROMOTION = 'promotion',
  SAFETY_ALERT = 'safety_alert',
  DOCUMENT_EXPIRED = 'document_expired',
  WALLET_LOW = 'wallet_low',
}

export enum NotificationChannel {
  IN_APP = 'in_app',
  SMS = 'sms',
  EMAIL = 'email',
  PUSH = 'push',
}

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({
    type: String,
    enum: NotificationType,
    required: true,
  })
  type: NotificationType;

  @Prop({
    type: [String],
    enum: NotificationChannel,
    default: ['in_app'],
  })
  channels: NotificationChannel[];

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  description?: string;

  @Prop()
  rideId?: Types.ObjectId;

  @Prop({ type: Object })
  data?: Record<string, any>;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  actionUrl?: string;

  @Prop()
  imageUrl?: string;

  // Delivery status
  @Prop({ default: false })
  sentToInApp: boolean;

  @Prop({ default: false })
  sentToSMS: boolean;

  @Prop({ default: false })
  sentToEmail: boolean;

  @Prop({ default: false })
  sentToPush: boolean;

  @Prop()
  failureReason?: string;

  // Expiration
  @Prop()
  expiresAt?: Date;

  @Prop({ default: false })
  isExpired: boolean;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ type: 1 });
NotificationSchema.index({ isRead: 1 });
NotificationSchema.index({ createdAt: -1 });
NotificationSchema.index({ rideId: 1 });
