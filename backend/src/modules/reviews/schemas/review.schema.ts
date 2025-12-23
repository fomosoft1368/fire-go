import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

export enum ReviewType {
  DRIVER = 'driver',
  CUSTOMER = 'customer',
  SERVICE = 'service',
}

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'Ride', required: true })
  rideId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  revieweeId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ReviewType,
    required: true,
  })
  reviewType: ReviewType;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  comment?: string;

  // Category ratings
  @Prop()
  drivingSkills?: number; // For driver reviews only

  @Prop()
  carCondition?: number; // For driver reviews only

  @Prop()
  communication?: number;

  @Prop()
  cleanliness?: number;

  @Prop()
  safetyCompliance?: number;

  @Prop()
  reliability?: number;

  // Tags/Flags
  @Prop([String])
  tags?: string[]; // e.g., ['friendly', 'professional', 'safe']

  @Prop({ default: false })
  isFlagged: boolean;

  @Prop()
  flagReason?: string;

  @Prop({ default: false })
  isAnonymous: boolean;

  @Prop({ default: 0 })
  helpfulCount: number;

  @Prop({ default: 0 })
  unhelpfulCount: number;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

ReviewSchema.index({ rideId: 1 });
ReviewSchema.index({ reviewerId: 1 });
ReviewSchema.index({ revieweeId: 1 });
ReviewSchema.index({ reviewType: 1 });
ReviewSchema.index({ rating: 1 });
ReviewSchema.index({ createdAt: -1 });
