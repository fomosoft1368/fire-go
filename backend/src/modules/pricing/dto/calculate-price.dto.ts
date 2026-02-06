export class PassengerPriceDto {
  distance: number; // km
  isPeakTime?: boolean;
  peakMultiplier?: number; // 1.0 (giờ thường), 1.3 (sáng), 1.5 (chiều)
  vehicleType: string; // 'sedan', 'suv', 'truck'
}

export class CalculatePriceDto {
  passengers: PassengerPriceDto[];
}

export class PriceBreakdown {
  passengerIndex: number;
  distance: number;
  isPeakTime: boolean;
  peakMultiplier: number; // 1.0 (giờ thường), 1.3 (sáng), 1.5 (chiều)
  vehicleType: string;
  rawPrice: number;
  basePrice: number;
  finalPrice: number;
  discountApplied: number;
}

export class CalculatePriceResponse {
  breakdown: PriceBreakdown[];
  totalPrice: number;
  driverShare: number;
  driverAmount: number;
  totalPassengers: number;
  configUsed: {
    vehicleType: string;
    baseFee: number;
    pricePerKm: number;
    minimumFare: number;
    peakMultiplier: number;
    driverSharePercent: number;
    discountRate: number;
  };
}
