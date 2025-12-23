import { IsNumber, IsOptional, IsString } from 'class-validator';

export class PaymentDto {
  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  rideId?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
