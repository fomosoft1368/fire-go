import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

export enum GoodsType {
  LIGHT = 'light',
  BULKY = 'bulky',
  FOOD = 'food',
}

export enum VehicleType {
  BIKE = 'bike',
  TRUCK = 'truck',
}

export enum WeightRange {
  LESS_THAN_20 = '<20',
  BETWEEN_20_50 = '20-50',
  MORE_THAN_50 = '>50',
}

export class CreateDeliveryDto {
  @IsString()
  @IsNotEmpty()
  pickupAddress: string;

  @IsArray()
  @IsNumber({}, { each: true })
  pickupCoordinates: [number, number];

  @IsString()
  @IsNotEmpty()
  dropoffAddress: string;

  @IsArray()
  @IsNumber({}, { each: true })
  dropoffCoordinates: [number, number];

  @IsEnum(GoodsType)
  goodsType: GoodsType;

  @IsEnum(WeightRange)
  weight: WeightRange;

  @IsEnum(VehicleType)
  vehicle: VehicleType;

  @IsNumber()
  estimatedPrice: number;

  @IsOptional()
  @IsString()
  distance?: string;

  @IsOptional()
  @IsString()
  senderName?: string;

  @IsOptional()
  @IsString()
  senderPhone?: string;

  @IsOptional()
  @IsString()
  recipientName?: string;

  @IsOptional()
  @IsString()
  recipientPhone?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsNumber()
  distanceKm?: number;

  @IsOptional()
  @IsNumber()
  durationMinutes?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  customerId?: string | Types.ObjectId;
}
