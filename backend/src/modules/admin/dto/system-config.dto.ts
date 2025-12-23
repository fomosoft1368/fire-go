import { IsString, IsOptional } from 'class-validator';

export class SystemConfigDto {
  @IsString()
  key: string;

  value: any;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  type?: string;
}
