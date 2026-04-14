import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DeliveryAssignmentRequestDocument = DeliveryAssignmentRequest &
  Document;

@Schema({ timestamps: true })
export class DeliveryAssignmentRequest {
  @Prop({
    type: MongooseSchema.Types.ObjectId,
    ref: 'Delivery',
    required: true,
  })
  deliveryId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  driverId: MongooseSchema.Types.ObjectId;

  @Prop({
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'timeout', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Prop({ type: Number })
  score: number; // Điểm scoring của tài xế này

  @Prop({ type: Date })
  expiresAt: Date; // Thời gian hết hạn request (15s)

  @Prop({ type: Date })
  respondedAt: Date; // Thời gian tài xế phản hồi

  @Prop({ type: String })
  rejectionReason: string; // Lý do từ chối (nếu có)

  @Prop({ type: Number, default: 1 })
  attemptNumber: number; // Lần thử thứ mấy (1 = driver đầu tiên, 2 = driver thứ 2,...)
}

export const DeliveryAssignmentRequestSchema = SchemaFactory.createForClass(
  DeliveryAssignmentRequest,
);

// Index để query nhanh
DeliveryAssignmentRequestSchema.index({ deliveryId: 1, status: 1 });
DeliveryAssignmentRequestSchema.index({ driverId: 1, status: 1, expiresAt: 1 });
DeliveryAssignmentRequestSchema.index({ expiresAt: 1 }); // TTL index
