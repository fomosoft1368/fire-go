import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PermissionDocument = Permission & Document;

@Schema({ timestamps: true })
export class Permission {
  @Prop({ required: true, unique: true })
  id: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop()
  requiredRole?: string; // 'admin', 'moderator', 'support', 'staff'
}

export const PermissionSchema = SchemaFactory.createForClass(Permission);
