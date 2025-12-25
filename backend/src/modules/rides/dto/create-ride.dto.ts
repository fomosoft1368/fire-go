import { IsString, IsNumber, IsArray, IsOptional, Min, Max, IsEnum, IsBoolean, IsDateString } from 'class-validator';

export enum CarType {
  SEDAN = 'sedan',
  SUV = 'suv',
  TRUCK = 'truck',
}

export enum TransmissionType {
  AUTO = 'auto',
  MANUAL = 'manual',
}

export class CreateRideDto {
  @IsString()
  pickupAddress: string;

  @IsArray()
  @IsNumber({}, { each: true })
  pickupCoordinates: [number, number]; // [longitude, latitude]

  @IsString()
  dropoffAddress: string;

  @IsArray()
  @IsNumber({}, { each: true })
  dropoffCoordinates: [number, number];

  @IsNumber()
  @Min(0)
  distance: number; // in km

  @IsNumber()
  @Min(0)
  duration: number; // in minutes

  @IsNumber()
  @Min(0)
  baseFare: number;

  @IsNumber()
  @Min(0)
  distanceFare: number;

  @IsNumber()
  @Min(0)
  timeFare: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  surgePricing?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  passengers?: number;

  // Fields for "Hire Driver" feature
  @IsOptional()
  @IsEnum(CarType)
  carType?: CarType;

  @IsOptional()
  @IsString()
  licensePlate?: string;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @IsOptional()
  @IsString()
  driverNote?: string;

  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean;

  @IsOptional()
  @IsDateString()
  scheduledTime?: string;
}
