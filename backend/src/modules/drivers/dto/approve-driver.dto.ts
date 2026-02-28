import { IsOptional, IsString } from 'class-validator';

export class ApproveDriverDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectDriverDto {
  @IsOptional()
  @IsString({ each: true })
  rejectedDocuments?: string[];

  @IsOptional()
  reasons?: Record<string, string>;

  @IsOptional()
  @IsString()
  globalReason?: string;
}
