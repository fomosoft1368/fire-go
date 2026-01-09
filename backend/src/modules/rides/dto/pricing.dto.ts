export class CreatePricingDto {
  vehicleType: string;
  baseFare: number;
  pricePerKm: number;
  pricePerMinute: number;
  peakHourSurge?: number;
  rainyDaySurge?: number;
  minimumFare?: number;
}

export class CalculateFareDto {
  distance: number;
  duration: number;
  vehicleType: string;
  isPeakHour?: boolean;
  isRainy?: boolean;
}

export class FindDriversDto {
  latitude: number;
  longitude: number;
  radius?: number;
  vehicleType?: string;
  limit?: number;
}

export interface FareBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeFare: number;
  totalFare: number;
  details: {
    distance: number;
    duration: number;
    pricePerKm: number;
    pricePerMinute: number;
    peakHourSurge?: number;
    rainyDaySurge?: number;
  };
}
