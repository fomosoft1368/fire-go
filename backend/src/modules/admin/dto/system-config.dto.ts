import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class SystemConfigDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsNotEmpty()
  value: any;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
