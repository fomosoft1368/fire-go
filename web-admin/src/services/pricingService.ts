import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface PeakHour {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  multiplier: number;
}

export interface CarpoolDiscount {
  passengers: number;
  discount: number;
}

export interface DistanceRange {
  id: string;
  minKm: number;
  maxKm: number; // -1 = vô hạn (Infinity)
  pricePerKm: number;
}

export interface VehicleTypePrice {
  type: string;
  name: string;
  baseFee: number;
  pricePerKm: number;
  minimumFare: number;
  distanceRanges?: DistanceRange[]; // ✨ NEW: Giá theo khoảng cách
}

// ============ GIAO HÀNG - Delivery Config Types ============
export interface DeliveryGoodsType {
  key: string;
  label: string;
  icon: string;
  surcharge: number;
}

export interface DeliveryWeightRange {
  key: string;
  label: string;
  surcharge: number;
}

export interface DeliveryVehicleType {
  key: string;
  label: string;
  description: string;
  icon: string;
  vehicleTypeMapping: string;
}

// ============ LÁI XE HỘ - Hire Driver Config Types ============
export interface HireDriverPricing {
  vehicleType: string;
  name: string;
  openingFee: number;
  freeKm: number;
  pricePerExtraKm: number;
  description?: string;
}

// ============ CHUYẾN ĐI LIÊN TỈNH - Inter-Provincial Route Types ============
export interface InterProvincialRoute {
  id: string;
  name: string;
  origin: {
    city: string;
    province: string;
    coordinates: { lat: number; lng: number };
    radius: number;
  };
  destination: {
    city: string;
    province: string;
    coordinates: { lat: number; lng: number };
    radius: number;
  };
  fixedPrice: number;
  vehicleType: string;
  isActive: boolean;
  description?: string;
  estimatedDuration?: number;
}

export interface PricingConfig {
  _id?: string;
  vehicleTypes: VehicleTypePrice[];
  peakMultiplier: number;
  driverShare: number;
  maxDiscountRate: number;
  carpoolDiscounts: CarpoolDiscount[];
  peakHours: PeakHour[];
  // ============ GIAO HÀNG ============
  deliveryGoodsTypes?: DeliveryGoodsType[];
  deliveryWeightRanges?: DeliveryWeightRange[];
  deliveryVehicleTypes?: DeliveryVehicleType[];
  // ============ LÁI XE HỘ ============
  hireDriverPricing?: HireDriverPricing[];
  // ============ CHUYẾN ĐI LIÊN TỈNH ============
  interProvincialRoutes?: InterProvincialRoute[];
  updatedAt?: string;
}

class PricingService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  async getConfig(): Promise<PricingConfig> {
    try {
      const response = await axios.get(
        `${API_URL}/api/pricing/config`,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching pricing config:', error);
      throw error;
    }
  }

  async updateConfig(config: Partial<PricingConfig>): Promise<PricingConfig> {
    try {
      const response = await axios.post(
        `${API_URL}/api/pricing/config`,
        config,
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error updating pricing config:', error);
      throw error;
    }
  }

  async resetToDefaults(): Promise<PricingConfig> {
    try {
      const response = await axios.post(
        `${API_URL}/api/pricing/config/reset`,
        {},
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error resetting pricing config:', error);
      throw error;
    }
  }

  // ============ GIAO HÀNG - Delivery Config Methods ============
  async updateDeliveryGoodsTypes(goodsTypes: DeliveryGoodsType[]): Promise<PricingConfig> {
    try {
      const response = await axios.post(
        `${API_URL}/api/pricing/config/delivery/goods-types`,
        { goodsTypes },
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error updating delivery goods types:', error);
      throw error;
    }
  }

  async updateDeliveryWeightRanges(weightRanges: DeliveryWeightRange[]): Promise<PricingConfig> {
    try {
      const response = await axios.post(
        `${API_URL}/api/pricing/config/delivery/weight-ranges`,
        { weightRanges },
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error updating delivery weight ranges:', error);
      throw error;
    }
  }

  async updateDeliveryVehicleTypes(vehicleTypes: DeliveryVehicleType[]): Promise<PricingConfig> {
    try {
      const response = await axios.post(
        `${API_URL}/api/pricing/config/delivery/vehicle-types`,
        { vehicleTypes },
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error updating delivery vehicle types:', error);
      throw error;
    }
  }

  // ============ LÁI XE HỘ - Hire Driver Methods ============
  async updateHireDriverPricing(hireDriverPricing: HireDriverPricing[]): Promise<PricingConfig> {
    try {
      const response = await axios.post(
        `${API_URL}/api/pricing/config/hire-driver`,
        { hireDriverPricing },
        this.getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Error updating hire driver pricing:', error);
      throw error;
    }
  }

  // ============ DRIVER SEARCH CONFIG - Get search radius ============
  async getDriverSearchConfig(serviceType: string = 'rideshare'): Promise<{ searchRadiusMeters: number }> {
    try {
      const response = await axios.get(`${API_URL}/api/config/driver-search/${serviceType}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching driver search config:', error);
      // Return default if API fails
      return { searchRadiusMeters: 10000 };
    }
  }
}

export const pricingService = new PricingService();
