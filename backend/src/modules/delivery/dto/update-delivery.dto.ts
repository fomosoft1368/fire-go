import { IsEnum, IsOptional, IsNumber, IsString, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export enum DeliveryStatus {
  PENDING = 'pending',
  FINDING_DRIVER = 'finding_driver',
  DRIVER_ASSIGNED = 'driver_assigned',
  PICKING_UP = 'picking_up',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export class UpdateDeliveryDto {
  @IsOptional()
  @IsEnum(DeliveryStatus)
  status?: DeliveryStatus;

  @IsOptional()
  driverId?: any;

  @IsOptional()
  @IsNumber()
  actualPrice?: number;

  @IsOptional()
  @IsString()
  distance?: string;

  @IsOptional()
  @IsString()
  duration?: string;

  @IsOptional()
  @IsString()
  cancelReason?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  pickupTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  deliveredTime?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  cancelledTime?: Date;
}
