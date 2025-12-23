import { IsNumber, IsArray, IsOptional } from 'class-validator';

export class UpdateLocationDto {
  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: [number, number]; // [longitude, latitude]

  @IsOptional()
  @IsNumber()
  accuracy?: number;
}
