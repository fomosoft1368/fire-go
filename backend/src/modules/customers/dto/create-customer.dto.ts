import {
  IsOptional,
  IsString,
  IsBoolean,
  IsDate,
  IsArray,
  IsEmail,
  IsNotEmpty,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCustomerDto {
  // Authentication fields (required)
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @IsNotEmpty()
  @IsString()
  lastName: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  confirmPassword?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  // Contact information (optional)
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  dateOfBirth?: Date;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  shareRidePreference?: boolean;

  @IsOptional()
  @IsString()
  preferredDriverGender?: string;

  @IsOptional()
  @IsArray()
  emergencyContacts?: Array<{
    name: string;
    phone: string;
    relationship: string;
  }>;
}
