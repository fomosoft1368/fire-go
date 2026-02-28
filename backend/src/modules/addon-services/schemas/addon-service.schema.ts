import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type AddonServiceDocument = AddonService & Document

@Schema({ timestamps: true })
export class AddonService {
  @Prop({ required: true, unique: true })
  name: string

  @Prop({ required: true })
  icon: string

  @Prop({ required: true })
  description: string

  @Prop({ required: true })
  price: number

  @Prop({ required: true })
  duration: number

  @Prop({ enum: ['active', 'inactive'], default: 'active' })
  status: string

  @Prop({ type: Date, default: () => new Date() })
  createdAt: Date

  @Prop({ type: Date, default: () => new Date() })
  updatedAt: Date
}

export const AddonServiceSchema = SchemaFactory.createForClass(AddonService)
AddonServiceSchema.index({ status: 1 })
AddonServiceSchema.index({ createdAt: -1 })
