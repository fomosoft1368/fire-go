import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminLogDocument = AdminLog & Document;

export enum AdminAction {
  USER_SUSPEND = 'user_suspend',
  USER_BAN = 'user_ban',
  USER_VERIFY = 'user_verify',
  DRIVER_VERIFY = 'driver_verify',
  DRIVER_SUSPEND = 'driver_suspend',
  REVIEW_FLAG = 'review_flag',
  REVIEW_DELETE = 'review_delete',
  DOCUMENT_REJECT = 'document_reject',
  WALLET_ADJUST = 'wallet_adjust',
  PROMOTION_CREATE = 'promotion_create',
  SYSTEM_CONFIG = 'system_config',
}

@Schema({ timestamps: true })
export class AdminLog {
  @Prop({ required: true })
  adminId: string;

  @Prop({
    type: String,
    enum: AdminAction,
    required: true,
  })
  action: AdminAction;

  @Prop()
  targetUserId?: string;

  @Prop()
  description: string;

  @Prop()
  oldValue?: string;

  @Prop()
  newValue?: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ default: true })
  isSuccess: boolean;

  @Prop()
  errorMessage?: string;
}

export const AdminLogSchema = SchemaFactory.createForClass(AdminLog);

AdminLogSchema.index({ adminId: 1 });
AdminLogSchema.index({ action: 1 });
AdminLogSchema.index({ targetUserId: 1 });
AdminLogSchema.index({ createdAt: -1 });
