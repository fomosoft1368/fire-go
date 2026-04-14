import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';

export class CreateAddonServiceDto {
  @IsString()
  name: string;

  @IsString()
  icon: string;

  @IsString()
  description: string;

  @IsNumber()
  price: number;

  @IsNumber()
  duration: number;

  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;
}

export class UpdateAddonServiceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  price?: number;

  @IsNumber()
  @IsOptional()
  duration?: number;

  @IsEnum(['active', 'inactive'])
  @IsOptional()
  status?: string;
}
