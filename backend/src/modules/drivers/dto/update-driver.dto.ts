import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverDto } from './create-driver.dto';
import { IsEnum, IsNumber, IsOptional, IsBoolean, IsArray } from 'class-validator';
import { DriverStatus, DriverType } from '../schemas/driver.schema';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @IsOptional()
  @IsArray()
  @IsEnum(DriverType, { each: true })
  driverTypes?: DriverType[];

  @IsOptional()
  @IsNumber()
  averageRating?: number;

  @IsOptional()
  @IsBoolean()
  isSuspended?: boolean;
}
