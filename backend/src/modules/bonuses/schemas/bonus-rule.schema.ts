import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface BonusRuleDocument extends BonusRule, Document {
  createdAt: Date;
  updatedAt: Date;
}

export type BonusPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly';

@Schema({ timestamps: true })
export class BonusRule {
  @Prop({ required: true })
  name: string;

  @Prop()
  description?: string;

  @Prop({
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true,
    index: true,
  })
  period: BonusPeriod;

  @Prop({ required: true, min: 1 })
  requiredTrips: number;

  @Prop({ required: true, min: 1000 })
  bonusAmount: number;

  @Prop({ default: true })
  isActive: boolean;
}

export const BonusRuleSchema = SchemaFactory.createForClass(BonusRule);
