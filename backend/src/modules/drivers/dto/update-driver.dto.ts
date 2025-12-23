import { PartialType } from '@nestjs/mapped-types';
import { CreateDriverDto } from './create-driver.dto';
import { IsEnum, IsNumber, IsOptional } from 'class-validator';
import { DriverStatus } from '../schemas/driver.schema';

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @IsOptional()
  @IsEnum(DriverStatus)
  status?: DriverStatus;

  @IsOptional()
  @IsNumber()
  averageRating?: number;
}
