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

export enum RideType {
  SHARE = 'share', // Ghép xe
  HIRE = 'hire',   // Lái xe hộ
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

  // Location hierarchy for filtering (optional - extracted from address if not provided)
  @IsOptional()
  @IsString()
  pickupProvince?: string;

  @IsOptional()
  @IsString()
  pickupDistrict?: string;

  @IsOptional()
  @IsString()
  pickupWard?: string;

  @IsOptional()
  @IsString()
  dropoffProvince?: string;

  @IsOptional()
  @IsString()
  dropoffDistrict?: string;

  @IsOptional()
  @IsString()
  dropoffWard?: string;

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

  // Ride type - share hoặc hire
  @IsOptional()
  @IsEnum(RideType)
  rideType?: RideType;

  // Fields for "Hire Driver" feature - chỉ bắt buộc khi rideType = 'hire'
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
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  startDateTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  remainingSeats?: number;
}