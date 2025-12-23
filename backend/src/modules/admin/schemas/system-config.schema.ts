import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type SystemConfigDocument = SystemConfig & Document;

@Schema({ timestamps: true })
export class SystemConfig {
  @Prop({ required: true, unique: true })
  key: string;

  @Prop({ required: true, type: MongooseSchema.Types.Mixed })
  value: any;

  @Prop()
  description?: string;

  @Prop({ default: 'string' })
  type: string; // string, number, boolean, json

  @Prop()
  lastModifiedBy?: string;

  @Prop()
  lastModifiedAt?: Date;
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);

SystemConfigSchema.index({ key: 1 });
