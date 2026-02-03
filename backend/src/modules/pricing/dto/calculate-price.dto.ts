export class PassengerPriceDto {
  distance: number; // km
  isPeakTime?: boolean;
  vehicleType: string; // 'sedan', 'suv', 'truck'
}

export class CalculatePriceDto {
  passengers: PassengerPriceDto[];
}

export class PriceBreakdown {
  passengerIndex: number;
  distance: number;
  isPeakTime: boolean;
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
