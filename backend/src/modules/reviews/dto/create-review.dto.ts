import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from 'class-validator';

export class CreateReviewDto {
  @IsString()
  rideId: string;

  @IsString()
  revieweeId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  drivingSkills?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  carCondition?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  communication?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  cleanliness?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  safetyCompliance?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  reliability?: number;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;
}
