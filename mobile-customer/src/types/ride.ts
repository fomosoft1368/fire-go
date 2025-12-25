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
  carType: 'sedan' | 'suv' | 'truck';
  licensePlate: string;
  transmission: 'auto' | 'manual';
  driverNote?: string;
  isScheduled?: boolean;
  scheduledTime?: string;
}
