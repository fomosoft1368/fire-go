import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CallSessionDocument = CallSession & Document;

export enum CallStatus {
  CALLING = 'calling',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  ENDED = 'ended',
  MISSED = 'missed',
}

export enum CallerRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
}

@Schema({ timestamps: true, collection: 'call_sessions' })
export class CallSession {
  @Prop({ type: Types.ObjectId, ref: 'Ride', required: true })
  rideId: Types.ObjectId;

  @Prop({ required: true })
  channelName: string;

  @Prop({ type: Types.ObjectId, required: true })
  callerId: Types.ObjectId;

  @Prop({ type: String, enum: CallerRole, required: true })
  callerRole: CallerRole;

  @Prop({ type: Types.ObjectId, required: true })
  receiverId: Types.ObjectId;

  @Prop({
    type: String,
    enum: CallStatus,
    default: CallStatus.CALLING,
  })
  status: CallStatus;

  @Prop()
  startedAt?: Date;

  @Prop()
  endedAt?: Date;

  /** Duration in seconds – set when status = ended */
  @Prop({ default: 0 })
  durationSeconds: number;

  /** Agora UID for the caller */
  @Prop({ default: 0 })
  callerUid: number;

  /** Agora UID for the receiver */
  @Prop({ default: 0 })
  receiverUid: number;
}

export const CallSessionSchema = SchemaFactory.createForClass(CallSession);

// Indexes
CallSessionSchema.index({ rideId: 1 });
CallSessionSchema.index({ status: 1 });
CallSessionSchema.index({ callerId: 1 });
CallSessionSchema.index({ receiverId: 1 });

// TTL: auto-delete sessions after 7 days
CallSessionSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 7 * 24 * 3600 },
);
