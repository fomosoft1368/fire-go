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
  @IsOptional()
  @IsString({ message: 'Tên phải là chuỗi ký tự' })
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'Họ phải là chuỗi ký tự' })
  lastName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString({ message: 'Số điện thoại phải là chuỗi ký tự' })
  phone?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Ngày sinh phải là một ngày hợp lệ' })
  dateOfBirth?: Date;

  @IsOptional()
  @IsString({ message: 'Địa chỉ phải là chuỗi ký tự' })
  address?: string;

  @IsOptional()
  @IsString({ message: 'Số GPLX phải là chuỗi ký tự' })
  vehicleLicense?: string;

  @IsOptional()
  @IsString({ message: 'Model xe phải là chuỗi ký tự' })
  vehicleModel: string;

  @IsOptional()
  @IsString({ message: 'Màu xe phải là chuỗi ký tự' })
  vehicleColor: string;

  @IsString({ message: 'Biển số xe phải là chuỗi ký tự' })
  @Matches(/^[A-Za-z0-9\-]+$/, {
    message: 'Biển số xe không hợp lệ',
  })
  vehiclePlate: string;

  @IsOptional()
  @IsString({ message: 'Số bằng lái phải là chuỗi ký tự' })
  licenseNumber?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate({ message: 'Ngày hết hạn bằng lái phải là một ngày hợp lệ' })
  licenseExpiry?: Date;

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

  @IsOptional()
  @IsString()
  portraitImage?: string;

  @IsOptional()
  @IsString()
  insuranceCertificate?: string;
}

