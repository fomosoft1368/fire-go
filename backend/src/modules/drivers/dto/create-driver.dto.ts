import {
  IsString,
  IsDate,
  IsOptional,
  IsPhoneNumber,
  IsEmail,
  MinLength,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDriverDto {
  @IsString({ message: 'Số GPLX phải là chuỗi ký tự' })
  vehicleLicense: string;

  @IsString({ message: 'Model xe phải là chuỗi ký tự' })
  vehicleModel: string;

  @IsString({ message: 'Màu xe phải là chuỗi ký tự' })
  vehicleColor: string;

  @IsString({ message: 'Biển số xe phải là chuỗi ký tự' })
  @Matches(/^[A-Za-z0-9\-]+$/, {
    message: 'Biển số xe không hợp lệ',
  })
  vehiclePlate: string;

  @IsString({ message: 'Số bằng lái phải là chuỗi ký tự' })
  licenseNumber: string;

  @Type(() => Date)
  @IsDate({ message: 'Ngày hết hạn bằng lái phải là một ngày hợp lệ' })
  licenseExpiry: Date;

  @IsOptional()
  @IsString()
  idNumber?: string;

  @IsOptional()
  @IsString()
  idType?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  bankAccountHolder?: string;

  @IsOptional()
  @IsString()
  vehicleImage?: string;

  @IsOptional()
  @IsString()
  licenseImage?: string;

  @IsOptional()
  @IsString()
  idImage?: string;
}
