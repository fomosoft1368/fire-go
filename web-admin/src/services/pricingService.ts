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

export interface VehicleTypePrice {
  type: string;
  name: string;
  baseFee: number;
  pricePerKm: number;
  minimumFare: number;
}

export interface PricingConfig {
  _id?: string;
  vehicleTypes: VehicleTypePrice[];
  peakMultiplier: number;
  driverShare: number;
  maxDiscountRate: number;
  carpoolDiscounts: CarpoolDiscount[];
  peakHours: PeakHour[];
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
}

export const pricingService = new PricingService();
