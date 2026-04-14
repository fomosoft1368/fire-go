import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type LogDocument = Log & Document;

@Schema({ timestamps: true })
export class Log {
  @Prop({ required: true })
  appName: string; // 'mobile-driver', 'mobile-customer', 'web-admin'

  @Prop({ required: true })
  functionName: string; // Tên hàm (vd: 'decodePolyline')

  @Prop({ required: true })
  errorMessage: string; // Thông báo lỗi

  @Prop({ type: String })
  errorStack: string; // Toàn bộ Stack Trace của lỗi

  @Prop({ type: Object })
  extraData: any; // Các params hoặc state kèm theo khi xảy ra lỗi
}

export const LogSchema = SchemaFactory.createForClass(Log);
