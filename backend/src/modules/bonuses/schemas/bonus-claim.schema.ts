import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export interface BonusClaimDocument extends BonusClaim, Document {
  createdAt: Date;
  updatedAt: Date;
}

export type BonusClaimStatus = 'pending' | 'approved' | 'rejected';

@Schema({ timestamps: true })
export class BonusClaim {
  @Prop({ type: Types.ObjectId, ref: 'Driver', required: true, index: true })
  driverId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'BonusRule', required: true })
  bonusRuleId: Types.ObjectId;

  /** The period covered by this claim */
  @Prop({ required: true })
  periodStart: Date;

  @Prop({ required: true })
  periodEnd: Date;

  /** Trips completed in the period at time of claim */
  @Prop({ required: true, min: 0 })
  tripCount: number;

  @Prop({ required: true, min: 0 })
  bonusAmount: number;

  @Prop({
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
    index: true,
  })
  status: BonusClaimStatus;

  @Prop()
  rejectionReason?: string;

  @Prop()
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId })
  approvedBy?: Types.ObjectId;
}

export const BonusClaimSchema = SchemaFactory.createForClass(BonusClaim);

BonusClaimSchema.index({ driverId: 1, bonusRuleId: 1, status: 1 });
BonusClaimSchema.index({ status: 1, createdAt: -1 });
