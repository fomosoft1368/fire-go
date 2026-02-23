import { IsEnum, IsNotEmpty, IsArray, IsString } from 'class-validator';

export enum TripPhaseEnum {
  PRE_TRIP = 'pre-trip',
  POST_TRIP = 'post-trip',
}

export enum VehiclePositionEnum {
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left',
  RIGHT = 'right',
  INTERIOR = 'interior',
}

export class UploadVehicleConditionDto {
  @IsEnum(TripPhaseEnum)
  @IsNotEmpty()
  phase: TripPhaseEnum;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  images: string[]; // Array of base64 strings
}

export class VehicleConditionResponseDto {
  preTrip: {
    completed: boolean;
    images: {
      front?: string;
      back?: string;
      left?: string;
      right?: string;
      interior?: string;
    };
    capturedAt: Date | null;
  };
  postTrip: {
    completed: boolean;
    images: {
      front?: string;
      back?: string;
      left?: string;
      right?: string;
      interior?: string;
    };
    capturedAt: Date | null;
  };
}
