import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReferralTransactionDocument = ReferralTransaction & Document;

@Schema({ timestamps: true })
export class ReferralTransaction {
  @Prop({ type: Types.ObjectId, ref: 'Driver', required: true })
  fromDriverId: Types.ObjectId; // Tài xế đã chạy cuốc (người tuyến dưới)

  @Prop({ type: Types.ObjectId, ref: 'Driver', required: true })
  toDriverId: Types.ObjectId; // Tài xế nhận hoa hồng (người tuyến trên)

  @Prop({ type: Types.ObjectId, ref: 'Ride' }) // Nếu cần thì liên kết, có thể nullable đối với Delivery/CombinedTrip
  rideId: Types.ObjectId;

  @Prop({ required: true })
  amount: number; // Số tiền được nhận

  @Prop({ required: true })
  tier: string; // F1, F2, F3

  @Prop({
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  })
  status: string; // Trạng thái "pending" (chờ 1 ngày) hoặc "completed" (đã cộng vào ví)

  @Prop({ required: true })
  unlockDate: Date; // Thời gian có thể mở khóa số tiền này
}

export const ReferralTransactionSchema =
  SchemaFactory.createForClass(ReferralTransaction);

// Đánh index cho thời gian unlockDate để Cron job lướt nhanh hơn
ReferralTransactionSchema.index({ status: 1, unlockDate: 1 });
ReferralTransactionSchema.index({ toDriverId: 1 });
ReferralTransactionSchema.index({ fromDriverId: 1 });
