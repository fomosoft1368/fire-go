import { IsNumber, IsString, Min, MaxLength } from 'class-validator';

export class GenerateQRCodeDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @MaxLength(25)
  description: string;
}
