import { IsString, IsNumber, IsArray, IsOptional, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

export class ServiceItemDto {
  @IsString()
  id: string

  @IsString()
  name: string

  @IsNumber()
  price: number

  @IsNumber()
  duration: number

  selected: boolean
}

export class CreateHourlyServiceDto {
  @IsString()
  customerId: string

  @IsNumber()
  hours: number

  @IsNumber()
  selectedDate: number

  @IsString()
  selectedTime: string

  @IsString()
  address: string

  @IsOptional()
  @IsString()
  notes?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ServiceItemDto)
  services: ServiceItemDto[]

  @IsNumber()
  estimatedPrice: number
}

export class UpdateHourlyServiceDto {
  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @IsString()
  workerId?: string

  @IsOptional()
  @IsNumber()
  actualPrice?: number

  @IsOptional()
  @IsString()
  cancelReason?: string
}

export class RateHourlyServiceDto {
  @IsNumber()
  rating: number

  @IsOptional()
  @IsString()
  comment?: string

  @IsOptional()
  @IsString()
  feedback?: string
}

export class GetPricingDto {
  @IsNumber()
  hours: number

  @IsOptional()
  @IsArray()
  addOns?: string[]
}
