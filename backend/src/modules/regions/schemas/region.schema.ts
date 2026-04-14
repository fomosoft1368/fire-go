import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type RegionDocument = Region & Document;

@Schema({ timestamps: true })
export class Region {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  managerId?: Types.ObjectId;

  @Prop({ default: true })
  isActive: boolean;
}

export const RegionSchema = SchemaFactory.createForClass(Region);
RegionSchema.index({ managerId: 1 });
