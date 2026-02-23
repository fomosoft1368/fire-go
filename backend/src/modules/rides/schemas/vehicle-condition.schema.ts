import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export class VehicleImages {
  @Prop({ type: String, default: null })
  front?: string;

  @Prop({ type: String, default: null })
  back?: string;

  @Prop({ type: String, default: null })
  left?: string;

  @Prop({ type: String, default: null })
  right?: string;

  @Prop({ type: String, default: null })
  interior?: string;
}

export const VehicleImagesSchema = SchemaFactory.createForClass(VehicleImages);

export class TripPhase {
  @Prop({ type: Boolean, default: false })
  completed: boolean;

  @Prop({ type: VehicleImagesSchema, default: {} })
  images: VehicleImages;

  @Prop({ type: Date, default: null })
  capturedAt: Date;
}

export const TripPhaseSchema = SchemaFactory.createForClass(TripPhase);

@Schema({ _id: false })
export class VehicleCondition {
  @Prop({ type: TripPhaseSchema, default: () => ({ completed: false, images: {}, capturedAt: null }) })
  preTrip: TripPhase;

  @Prop({ type: TripPhaseSchema, default: () => ({ completed: false, images: {}, capturedAt: null }) })
  postTrip: TripPhase;
}

export const VehicleConditionSchema = SchemaFactory.createForClass(VehicleCondition);
