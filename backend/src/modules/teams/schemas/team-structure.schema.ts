import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TeamStructureDocument = TeamStructure & Document;

@Schema({ timestamps: true })
export class TeamStructure {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId; // The marketing staff (F1, F2, F3)

  @Prop({ type: Types.ObjectId, ref: 'User' })
  parentId?: Types.ObjectId; // Who referred them (F1 or F2)

  @Prop({ required: true })
  level: number; // 1 for F1, 2 for F2, 3 for F3

  @Prop({ required: true })
  path: string; // Materialized path for quick querying, e.g., ",F1_ID,F2_ID,"
}

export const TeamStructureSchema = SchemaFactory.createForClass(TeamStructure);
TeamStructureSchema.index({ parentId: 1 });
TeamStructureSchema.index({ path: 1 });
TeamStructureSchema.index({ level: 1 });
