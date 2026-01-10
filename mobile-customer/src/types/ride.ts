export interface CreateRideDto {
  pickupAddress: string;
  pickupCoordinates: [number, number];
  dropoffAddress: string;
  dropoffCoordinates: [number, number];
  distance: number;
  duration: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgePricing?: number;
  rideType?: 'share' | 'hire'; // 'share' for shared rides, 'hire' for hired driver
  vehicleType?: string; // Vehicle type like 'basic', 'comfort', 'premium' or 'sedan', 'suv', 'truck'
  carType?: 'sedan' | 'suv' | 'truck';
  licensePlate?: string;
  transmission?: 'auto' | 'manual';
  driverNote?: string;
  isScheduled?: boolean;
  scheduledTime?: string;
}
