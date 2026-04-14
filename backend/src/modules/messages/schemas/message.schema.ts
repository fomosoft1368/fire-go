import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  LOCATION = 'location',
}

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'Ride', required: false })
  rideId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Delivery', required: false })
  deliveryId?: Types.ObjectId;
  @Prop({ type: Types.ObjectId, ref: 'CombinedTrip', required: false })
  combinedTripId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: String, required: true })
  senderType: 'customer' | 'driver';

  @Prop({ type: String, required: true })
  text: string;

  @Prop({
    type: String,
    enum: MessageType,
    default: MessageType.TEXT,
  })
  type: MessageType;

  @Prop({ type: Boolean, default: false })
  isRead: boolean;

  @Prop({ type: Date })
  readAt?: Date;

  @Prop({ type: String })
  imageUrl?: string;

  @Prop({ type: Date, default: () => new Date() })
  createdAt: Date;

  @Prop({ type: Date, default: () => new Date() })
  updatedAt: Date;

  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      // [longitude, latitude]
    },
  })
  location?: {
    type: string;
    coordinates: [number, number];
  };
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Tạo index cho better query performance
MessageSchema.index({ rideId: 1, createdAt: -1 });
MessageSchema.index({ deliveryId: 1, createdAt: -1 });
MessageSchema.index({ combinedTripId: 1, createdAt: 1 });
MessageSchema.index({ deliveryId: 1, senderId: 1 });
