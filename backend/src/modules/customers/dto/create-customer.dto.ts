import { IsOptional, IsString, IsBoolean, IsDate, IsArray } from 'class-validator';

export class CreateCustomerDto {
  @IsOptional()
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
