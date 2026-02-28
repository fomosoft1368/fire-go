import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type HourlyServiceDocument = HourlyService & Document

@Schema({ timestamps: true })
export class HourlyService {
  @Prop({ type: Types.ObjectId, ref: 'Customer', required: true })
  customerId: string

  @Prop({ type: Types.ObjectId, ref: 'Worker', required: false })
  workerId?: string

  @Prop({ required: true })
  hours: number

  @Prop({ required: true })
  selectedDate: number

  @Prop({ required: true })
  selectedTime: string

  @Prop({ required: false })
  month?: number

  @Prop({ required: false })
  year?: number

  @Prop({ required: true })
  address: string

  @Prop({ required: false })
  notes?: string

  @Prop({
    type: [
      {
        id: String,
        name: String,
        price: Number,
        duration: Number,
        selected: Boolean,
      },
    ],
    default: [],
  })
  services: Array<{
    id: string
    name: string
    price: number
    duration: number
    selected: boolean
  }>

  @Prop({ required: true, default: 0 })
  estimatedPrice: number

  @Prop({ required: false })
  actualPrice?: number

  @Prop({ enum: ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled'], default: 'pending' })
  status: string

  @Prop({ required: false })
  rating?: number

  @Prop({ required: false })
  comment?: string

  @Prop({ required: false })
  feedback?: string

  @Prop({ required: false })
  cancelReason?: string

  @Prop({ required: false })
  startTime?: Date

  @Prop({ required: false })
  endTime?: Date

  @Prop({ required: false })
  cancelledTime?: Date

  @Prop({ type: Date, default: () => new Date() })
  createdAt: Date

  @Prop({ type: Date, default: () => new Date() })
  updatedAt: Date
}

export const HourlyServiceSchema = SchemaFactory.createForClass(HourlyService)
HourlyServiceSchema.index({ customerId: 1 })
HourlyServiceSchema.index({ workerId: 1 })
HourlyServiceSchema.index({ status: 1 })
HourlyServiceSchema.index({ createdAt: -1 })
