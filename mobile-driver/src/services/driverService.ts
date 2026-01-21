import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

interface DriverInfo {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'on_trip' | 'break';
  isOnline: boolean;
  averageRating: number;
  totalReviews: number;
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  totalEarnings: number;
  isAcceptingRides: boolean;
  isSuspended: boolean;
  vehicleInfo: {
    plate: string;
    model: string;
    color: string;
  };
}

interface LocationData {
  coordinates: [number, number]; // [longitude, latitude]
  accuracy?: number;
}

interface EarningsData {
  driverId: string;
  date: string;
  totalEarnings: number;
  totalTrips: number;
  breakdown: {
    cash: number;
    online: number;
    tips: number;
  };
}

export class DriverService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    // For Expo:
    // - Android Emulator: use 10.0.2.2 (special alias to host machine)
    // - iOS Simulator: use localhost or 127.0.0.1
    // - Physical Device: use your machine's IP address (e.g., 192.168.x.x)
    // Change API_BASE_URL in constants/config.ts
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: `${baseURL}/drivers`,
      timeout: 10000,
    });

    // Thêm JWT token vào mỗi request
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Xử lý lỗi
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token hết hạn, xóa token và chuyển hướng đến login
          AsyncStorage.removeItem('authToken');
          // TODO: Navigate to login screen
        }
        return Promise.reject(error);
      },
    );
  }

  /**
   * Lấy dashboard tài xế (dùng cho HomeScreen)
   */
  async getDashboard(): Promise<DriverInfo> {
    try {
      const response = await this.api.get<DriverInfo>('/me/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching driver dashboard:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin cá nhân tài xế
   */
  async getProfile(): Promise<any> {
    try {
      const response = await this.api.get('/me');
      return response.data;
    } catch (error) {
      console.error('Error fetching driver profile:', error);
      throw error;
    }
  }

  /**
   * Cập nhật trạng thái tài xế
   * @param driverId ID của tài xế
   * @param status Trạng thái mới (online|offline|on_trip|break)
   */
  async updateStatus(driverId: string, status: 'online' | 'offline' | 'on_trip' | 'break'): Promise<any> {
    try {
      const response = await this.api.patch(`/${driverId}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('Error updating driver status:', error);
      throw error;
    }
  }

  /**
   * Cập nhật vị trí hiện tại
   * Nên gọi mỗi 5-10 giây khi tài xế đang online
   */
  async updateLocation(driverId: string, location: LocationData): Promise<any> {
    try {
      const response = await this.api.patch(`/${driverId}/location`, location);
      return response.data;
    } catch (error) {
      console.error('Error updating driver location:', error);
      throw error;
    }
  }

  /**
   * Bật/tắt khả năng chấp nhận cuốc mới
   */
  async toggleAcceptingRides(isAccepting: boolean): Promise<any> {
    try {
      const response = await this.api.patch('/me/accepting-rides', {
        isAcceptingRides: isAccepting,
      });
      return response.data;
    } catch (error) {
      console.error('Error toggling accepting rides:', error);
      throw error;
    }
  }

  /**
   * Lấy doanh thu hôm nay
   */
  async getTodayEarnings(): Promise<EarningsData> {
    try {
      const response = await this.api.get<EarningsData>('/me/earnings/today');
      return response.data;
    } catch (error) {
      console.error('Error fetching today earnings:', error);
      throw error;
    }
  }

  /**
   * Lấy thống kê chi tiết
   */
  async getStats(driverId: string): Promise<any> {
    try {
      const response = await this.api.get(`/${driverId}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching driver stats:', error);
      throw error;
    }
  }

  /**
   * Tìm tài xế gần đó
   */
  async getNearbyDrivers(longitude: number, latitude: number, maxDistance: number = 5000): Promise<any[]> {
    try {
      const response = await this.api.get('/nearby', {
        params: {
          longitude,
          latitude,
          maxDistance,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching nearby drivers:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin tài xế theo ID
   */
  async getDriverById(driverId: string): Promise<any> {
    try {
      const response = await this.api.get(`/${driverId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching driver info:', error);
      throw error;
    }
  }

  /**
   * Cập nhật thông tin tài xế
   */
  async updateProfile(driverId: string, data: any): Promise<any> {
    try {
      const response = await this.api.patch(`/${driverId}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating driver profile:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách cuốc có sẵn (chưa được tài xế nào nhận và chưa hoàn thành)
   */
  async getAvailableRides(rideType?: 'share' | 'hire'): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      console.log('🔐 Token:', token ? 'Có token' : 'Không có token');
      console.log('🌐 Base URL:', this.baseURL);
      console.log('📍 Calling: GET', `${this.baseURL}/rides`);
      
      const params: any = {
        status: 'pending',
      };
      if (rideType) {
        params.rideType = rideType;
      }

      const response = await axios.get(`${this.baseURL}/rides`, {
        params,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });
      
      console.log('✅ API Response:', response.data);
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Error fetching available rides:');
      console.error('   Error Message:', error.message);
      console.error('   Error Code:', error.code);
      console.error('   Error Status:', error.response?.status);
      console.error('   Error Data:', error.response?.data);
      console.error('   Full Error:', error);
      throw error;
    }
  }

  /**
   * Tạo chuyến xe mới (tài xế tự tạo chuyến)
   */
  async createRide(rideData: {
    pickupAddress: string;
    dropoffAddress: string;
    pickupCoordinates?: [number, number];
    dropoffCoordinates?: [number, number];
    distance?: number;
    duration?: number;
    baseFare?: number;
    distanceFare?: number;
    timeFare?: number;
    rideType: 'share' | 'hire';
    startDateTime: string;
    remainingSeats: number;
    driverId?: string;
    notes?: string;
    status?: string;
  }): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      console.log('🚗 Creating new ride:', rideData);
      
      const response = await axios.post(
        `${this.baseURL}/rides`,
        rideData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        }
      );
      
      console.log('✅ Ride created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating ride:');
      console.error('   Error Message:', error.message);
      console.error('   Error Status:', error.response?.status);
      console.error('   Error Data:', error.response?.data);
      throw error;
    }
  }

  /**
   * Nhận một cuốc (chấp nhận cuốc)
   */
  async acceptRide(rideId: string, driverId: string): Promise<any> {
    try {
      const response = await axios.patch(
        `${this.baseURL}/rides/${rideId}/accept`,
        { driverId },
        {
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem('authToken')}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error accepting ride:', error);
      throw error;
    }
  }

  /**
   * Cập nhật chuyến đi (status, info, v.v.)
   */
  async updateRide(rideId: string, updates: any): Promise<any> {
    try {
      const response = await axios.patch(
        `${this.baseURL}/rides/${rideId}`,
        updates,
        {
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem('authToken')}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error updating ride:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách chuyến đi đã hoàn thành/đã hủy của tài xế (TripsScreen)
   */
  async getCompletedTrips(status?: 'completed' | 'cancelled'): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('authToken');
      console.log('🚗 Fetching completed trips with status:', status || 'all');
      
      const params: any = {};
      if (status) {
        params.status = status;
      }

      const response = await axios.get(`${this.baseURL}/rides`, {
        params,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });
      
      const result = Array.isArray(response.data) ? response.data : [];
      console.log(`✅ Completed trips (${status || 'all'}) fetched:`, result.length);
      return result;
    } catch (error: any) {
      console.error(`❌ Error fetching ${status || 'all'} trips:`, error.message);
      return [];
    }
  }
}

// Export singleton instance
export const driverService = new DriverService();
