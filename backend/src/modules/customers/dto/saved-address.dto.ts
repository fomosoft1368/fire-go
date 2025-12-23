import { IsString, IsArray, IsNumber } from 'class-validator';

export class SavedAddressDto {
  @IsString()
  label: string;

  @IsString()
  address: string;

  @IsArray()
  @IsNumber({}, { each: true })
  coordinates: [number, number]; // [longitude, latitude]
}
