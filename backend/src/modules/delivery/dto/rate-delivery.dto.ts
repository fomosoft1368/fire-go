import { IsNumber, IsOptional, IsString, Min, Max } from 'class-validator';

export class RateDeliveryDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  feedback?: string;
}
