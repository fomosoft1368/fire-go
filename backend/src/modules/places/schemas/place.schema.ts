import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PlaceDocument = Place & Document;

@Schema({ timestamps: true })
export class Place {
  @Prop({ required: false, index: true })
  userId?: string; // Customer ID or Driver ID - tracks who searched

  @Prop({ required: true, index: true })
  placeId: string; // Google Place ID (removed unique - can be saved per user)

  @Prop({ required: true, index: true })
  keyword: string; // Search keyword

  @Prop({ required: true })
  name: string;

  @Prop()
  address: string;

  @Prop({ required: true })
  lat: number;

  @Prop({ required: true })
  lng: number;

  @Prop()
  description?: string;

  @Prop({ default: 0 })
  searchCount: number; // Track how often this place is searched

  @Prop({ default: Date.now, index: true })
  lastSearchedAt: Date;
}

export const PlaceSchema = SchemaFactory.createForClass(Place);

// Index for faster per-user search
PlaceSchema.index({ userId: 1, keyword: 1, lastSearchedAt: -1 });
PlaceSchema.index({ userId: 1, placeId: 1 }); // Avoid duplicate places per user
PlaceSchema.index({ keyword: 1, createdAt: -1 }); // Fallback for old data without userId
