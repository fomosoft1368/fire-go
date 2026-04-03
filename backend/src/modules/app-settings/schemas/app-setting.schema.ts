import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AppSettingDocument = AppSetting & Document;

export enum SettingGroup {
  PAYMENT_SEPAY = 'payment_sepay',
  PAYMENT_VNPAY = 'payment_vnpay',
  MAPS = 'maps',
  EMAIL = 'email',
  SYSTEM = 'system',
}

@Schema({ timestamps: true })
export class AppSetting {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true })
  value: string;

  @Prop({ required: true })
  label: string;

  @Prop()
  description?: string;

  @Prop({ type: String, enum: SettingGroup, required: true })
  group: SettingGroup;

  /** Giá trị có bị ẩn trong UI không (API keys, secrets) */
  @Prop({ default: false })
  isSecret: boolean;

  /** Chỉ đọc — không cho phép sửa qua UI (e.g. MONGODB_URI) */
  @Prop({ default: false })
  readOnly: boolean;
}

export const AppSettingSchema = SchemaFactory.createForClass(AppSetting);
AppSettingSchema.index({ key: 1 });
AppSettingSchema.index({ group: 1 });
