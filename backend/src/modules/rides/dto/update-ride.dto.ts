import { PartialType } from '@nestjs/mapped-types';
import { CreateRideDto } from './create-ride.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RideStatus } from '../schemas/ride.schema';

export class UpdateRideDto extends PartialType(CreateRideDto) {
  @IsOptional()
  @IsEnum(RideStatus)
  status?: RideStatus;

  @IsOptional()
  @IsString()
  cancellationReason?: string;
}
