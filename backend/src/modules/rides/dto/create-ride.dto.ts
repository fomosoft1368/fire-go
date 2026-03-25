import { IsString, IsNumber, IsArray, IsOptional, Min, Max, IsEnum, IsBoolean, IsDateString } from 'class-validator';

export enum CarType {
  SEDAN = 'sedan',
  SUV = 'suv',
  TRUCK = 'truck',
  BIKE = 'bike',
}

export enum TransmissionType {
  AUTO = 'auto',
  MANUAL = 'manual',
}

export enum RideType {
  SHARE = 'share', // GhÃ©p xe
  HIRE = 'hire',   // LÃ¡i xe há»™
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

  // Ride type - share hoáº·c hire
  @IsOptional()
  @IsEnum(RideType)
  rideType?: RideType;

  // Fields for "Hire Driver" feature - chá»‰ báº¯t buá»™c khi rideType = 'hire'
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

  @IsOptional()
  @IsBoolean()
  autoAssign?: boolean; // Tá»± Ä‘á»™ng chá»‰ Ä‘á»‹nh tÃ i xáº¿


  @IsOptional()
  @IsNumber()
  @Min(0)
  depositAmount?: number; // Ti\u1ec1n c\u1ecdc (VN\u0110) - d\u00f9ng cho l\u00e1i xe h\u1ed9 qu\u00e3ng \u0111\u01b0\u1eddng xa

  @IsOptional()
  @IsBoolean()
  isScheduled?: boolean; // \u0110\u1eb7t l\u1ecbch tr\u01b0\u1edbc

  @IsOptional()
  @IsDateString()
  scheduledTime?: string; // Th\u1eddi gian \u0111\u1eb7t l\u1ecbch tr\u01b0\u1edbc
}

