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
  rideType?: 'share' | 'hire';
  vehicleType?: string;
  carType?: 'sedan' | 'suv' | 'truck';
  licensePlate?: string;
  transmission?: 'auto' | 'manual';
  driverNote?: string;
  isScheduled?: boolean;
  scheduledTime?: string;
  autoAssign?: boolean;
  depositAmount?: number; // Tiền cọc (VNĐ) - dùng cho lái xe hộ quãng đường xa
}

export interface Driver {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  averageRating: number;
  totalReviews: number;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePlate: string;
  currentLocation?: {
    type: string;
    coordinates: [number, number];
  };
}

export interface NearbyRide {
  _id: string;
  driverId: Driver;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoordinates: [number, number];
  dropoffCoordinates: [number, number];
  distance: number;
  totalFare: number;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed';
  totalSeats: number;
  customerId: any[];
  createdAt: string;
}

export interface RideRequest {
  _id?: string;
  rideId: string;
  customerId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  seats: number;
  fare: number;
  pickupAddress: string;
  dropoffAddress: string;
  pickupCoordinates: [number, number];
  dropoffCoordinates: [number, number];
  distance: number;
  createdAt?: string;
}
