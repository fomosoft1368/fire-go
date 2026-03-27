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

export interface EarningsData {
  amount: number;
  increase: number;
  totalTrips: number;
  driverShare?: number;
  breakdown?: {
    rides: {
      trips: number;
      totalFare: number;
      driverEarnings: number;
    };
    combinedTrips: {
      trips: number;
      requests: number;
      totalFare: number;
      driverEarnings: number;
    };
    deliveries: {
      deliveries: number;
      totalFare: number;
      driverEarnings: number;
    };
  };
}

export class DriverService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    // For Expo:
    // - Android Emulator: use 10.0.2.2 (special alias to host machine)
    // - iOS Simulator: use 192.168.1.9 or 127.0.0.1
    // - Physical Device: use your machine's IP address (e.g., 192.168.x.x)
    // Change API_BASE_URL in constants/config.ts
    this.baseURL = baseURL;
    this.api = axios.create({
      baseURL: `${baseURL}/drivers`,
      timeout: 10000,
    });

    // Thêm JWT token vào mỗi request
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('token');
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
          AsyncStorage.removeItem('token');
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
      console.log('[DriverService.getProfile] Response data:', {
        walletBalance: response.data?.walletBalance,
        licenseStatus: response.data?.licenseStatus,
        fullData: response.data,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching driver profile:', error);
      throw error;
    }
  }

  /**
   * Cập nhật trạng thái tài xế (lấy ID từ token)
   * @param status Trạng thái mới: 'online' | 'offline'
   */
  async updateDriverStatus(status: 'online' | 'offline'): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('authToken');

      if (!token) {
        throw new Error('No auth token found');
      }

      console.log('[DriverService] Updating driver status to:', status);

      const response = await this.api.patch('/me/status', { status }, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      console.log('[DriverService] ✅ Driver status updated:', response.data);
      return response.data;
    } catch (error) {
      console.error('[DriverService] ❌ Error updating driver status:', error);
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
   * Cập nhật thông tin tài xế hiện tại (dùng token)
   */
  async updateMyProfile(data: any): Promise<any> {
    try {
      const response = await this.api.patch('/me', data);
      return response.data;
    } catch (error) {
      console.error('Error updating my profile:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách cuốc có sẵn (chưa được tài xế nào nhận và chưa hoàn thành)
   */
  async getAvailableRides(rideType?: 'share' | 'hire'): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('token');
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
   * Get all available combined trips (share rides) - both my trips and pending trips
   */
  async getMyCombinedTrips(): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        console.warn('⚠️ No token for getMyCombinedTrips');
        return [];
      }

      console.log('📍 Calling: GET', `${API_BASE_URL}/combined-trips`);

      // Get all combined trips (no status filter to get both pending and assigned trips)
      const response = await axios.get(`${API_BASE_URL}/combined-trips`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      console.log('✅ Combined trips API Response:', response.data);
      return response.data || [];
    } catch (error: any) {
      console.error('❌ Error fetching combined trips:');
      console.error('   Error Message:', error.message);
      console.error('   Error Status:', error.response?.status);
      console.error('   Error Data:', error.response?.data);
      // Return empty array instead of throwing to allow graceful fallback
      return [];
    }
  }

  /**
   * Tạo chuyến xe mới (tài xế tự tạo chuyến)
   */
  async createCombinedTrip(rideData: {
    pickupAddress: string;
    dropoffAddress: string;
    pickupCoordinates?: [number, number];
    dropoffCoordinates?: [number, number];
    distance?: number;
    duration?: number;
    baseFare?: number;
    distanceFare?: number;
    timeFare?: number;
    startDateTime: string;
    remainingSeats: number;
    notes?: string;
  }): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('token');

      if (!token) {
        console.error('❌ No auth token found. Driver must be logged in.');
        throw new Error('Vui lòng đăng nhập trước khi tạo chuyến xe');
      }

      console.log('🚗 Creating new combined trip (share ride):', rideData);
      console.log('🔐 Token present:', token.substring(0, 20) + '...');

      const response = await axios.post(
        `${API_BASE_URL}/combined-trips`,
        rideData,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 10000,
        }
      );

      console.log('✅ Combined trip created successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating combined trip:');
      console.error('   Error Message:', error.message);
      console.error('   Error Status:', error.response?.status);
      console.error('   Error Data:', error.response?.data);
      throw error;
    }
  }

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
      const token = await AsyncStorage.getItem('token');
      console.log('🚗 Creating new ride:', rideData);

      // For share rides (xe ghép), use combined-trips endpoint
      if (rideData.rideType === 'share') {
        return await this.createCombinedTrip({
          pickupAddress: rideData.pickupAddress,
          dropoffAddress: rideData.dropoffAddress,
          pickupCoordinates: rideData.pickupCoordinates,
          dropoffCoordinates: rideData.dropoffCoordinates,
          distance: rideData.distance,
          duration: rideData.duration,
          baseFare: rideData.baseFare,
          distanceFare: rideData.distanceFare,
          timeFare: rideData.timeFare,
          startDateTime: rideData.startDateTime,
          remainingSeats: rideData.remainingSeats,
          notes: rideData.notes,
        });
      }

      // For hire rides, use rides endpoint
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
            Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
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
            Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
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
  async getCompletedTrips(driverId?: string, status?: 'completed' | 'cancelled'): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('🚗 Fetching completed trips with driverId:', driverId, 'status:', status || 'all');

      const params: any = {};
      if (driverId) {
        params.driverId = driverId;
      }
      if (status) {
        params.status = status;
      }

      const response = await axios.get(`${API_BASE_URL}/rides`, {
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

  /**
   * Lấy danh sách chuyến xe ghép đã hoàn thành/đã hủy (TripsScreen)
   */
  async getCompletedCombinedTrips(driverId?: string, status?: 'completed' | 'cancelled'): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('🚗 Fetching completed combined trips with driverId:', driverId, 'status:', status || 'all');

      const params: any = {};
      if (driverId) {
        params.driverId = driverId;
      }
      if (status) {
        params.status = status;
      }

      const response = await axios.get(`${API_BASE_URL}/combined-trips`, {
        params,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      const result = Array.isArray(response.data) ? response.data : [];
      console.log(`✅ Completed combined trips (${status || 'all'}) fetched:`, result.length);
      return result;
    } catch (error: any) {
      console.error(`❌ Error fetching ${status || 'all'} combined trips:`, error.message);
      return [];
    }
  }

  /**
   * Accept a combined trip (share ride)
   */
  async acceptCombinedTrip(combinedTripId: string, driverId: string): Promise<any> {
    try {
      // Use API_BASE_URL directly, not this.baseURL (which includes /drivers prefix)
      const response = await axios.patch(
        `${API_BASE_URL}/combined-trips/${combinedTripId}/accept`,
        { driverId },
        {
          headers: {
            Authorization: `Bearer ${await AsyncStorage.getItem('token')}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error accepting combined trip:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách đơn hàng/giao hàng đã hoàn thành (TripsScreen)
   */
  async getCompletedDeliveries(driverId?: string, status?: 'completed' | 'cancelled'): Promise<any[]> {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('🚚 Fetching completed deliveries with driverId:', driverId, 'status:', status || 'all');

      const params: any = {};
      if (driverId) {
        params.driverId = driverId;
      }
      if (status) {
        params.status = status;
      }

      const response = await axios.get(`${API_BASE_URL}/deliveries`, {
        params,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      });

      const result = Array.isArray(response.data) ? response.data : [];
      console.log(`✅ Completed deliveries (${status || 'all'}) fetched:`, result.length);
      return result;
    } catch (error: any) {
      console.error(`❌ Error fetching ${status || 'all'} deliveries:`, error.message);
      return [];
    }
  }

  /**
   * Set driver online/offline status
   */
  async setOnlineStatus(isOnline: boolean): Promise<any> {
    try {
      console.log(`[DriverService] Setting online status to: ${isOnline}`);
      const response = await this.api.patch('/online-status', { isOnline });
      console.log(`[DriverService] Online status updated:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] Error setting online status:', error.message);
      throw error;
    }
  }

  /**
   * Set driver available status for auto-assign
   */
  async setAvailableStatus(isAvailable: boolean): Promise<any> {
    try {
      console.log(`[DriverService] Setting available status to: ${isAvailable}`);
      const response = await this.api.patch('/available-status', { isAvailable });
      console.log(`[DriverService] Available status updated:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] Error setting available status:', error.message);
      throw error;
    }
  }

  /**
   * Send heartbeat to keep driver online
   */
  async sendHeartbeat(): Promise<any> {
    try {
      const response = await this.api.post('/heartbeat');
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] Error sending heartbeat:', error.message);
      throw error;
    }
  }

  /**
   * Accept ride assignment request
   */
  async acceptRideAssignment(requestId: string): Promise<any> {
    try {
      console.log(`[DriverService] Accepting ride assignment request: ${requestId}`);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${this.baseURL}/rides/assignment-requests/${requestId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('[DriverService] ✅ Ride assignment accepted:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] ❌ Error accepting ride assignment:', error.message);
      throw error;
    }
  }

  /**
   * Reject ride assignment request
   */
  async rejectRideAssignment(requestId: string): Promise<any> {
    try {
      console.log(`[DriverService] Rejecting ride assignment request: ${requestId}`);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${this.baseURL}/rides/assignment-requests/${requestId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('[DriverService] ✅ Ride assignment rejected:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] ❌ Error rejecting ride assignment:', error.message);
      throw error;
    }
  }

  /**
   * Accept delivery assignment request
   */
  async acceptDeliveryAssignment(requestId: string): Promise<any> {
    try {
      console.log(`[DriverService] Accepting delivery assignment request: ${requestId}`);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${this.baseURL}/deliveries/assignment-requests/${requestId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('[DriverService] ✅ Delivery assignment accepted:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] ❌ Error accepting delivery assignment:', error.message);
      throw error;
    }
  }

  /**
   * Reject delivery assignment request
   */
  async rejectDeliveryAssignment(requestId: string): Promise<any> {
    try {
      console.log(`[DriverService] Rejecting delivery assignment request: ${requestId}`);
      const token = await AsyncStorage.getItem('token');
      const response = await axios.post(
        `${this.baseURL}/deliveries/assignment-requests/${requestId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('[DriverService] ✅ Delivery assignment rejected:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] ❌ Error rejecting delivery assignment:', error.message);
      throw error;
    }
  }

  /**
   * Accept combined trip request
   */
  async acceptCombinedTripRequest(combinedTripId: string, requestId: string): Promise<any> {
    try {
      console.log(`[DriverService] Accepting combined trip request:`, { combinedTripId, requestId });
      const token = await AsyncStorage.getItem('token');
      const response = await axios.patch(
        `${this.baseURL}/combined-trips/${combinedTripId}/requests/${requestId}/accept`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('[DriverService] ✅ Combined trip request accepted:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] ❌ Error accepting combined trip request:', error.message);
      throw error;
    }
  }

  /**
   * Reject combined trip request
   */
  async rejectCombinedTripRequest(combinedTripId: string, requestId: string): Promise<any> {
    try {
      console.log(`[DriverService] Rejecting combined trip request:`, { combinedTripId, requestId });
      const token = await AsyncStorage.getItem('token');
      const response = await axios.patch(
        `${this.baseURL}/combined-trips/${combinedTripId}/requests/${requestId}/reject`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('[DriverService] ✅ Combined trip request rejected:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] ❌ Error rejecting combined trip request:', error.message);
      throw error;
    }
  }

  /**
   * Get withdrawal history
   */
  async getWithdrawalHistory(page: number = 1, limit: number = 20): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${this.baseURL}/wallets/history?page=${page}&limit=${limit}&type=WITHDRAW`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('[DriverService] ✅ Withdrawal history fetched:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] ❌ Error fetching withdrawal history:', error.message);
      throw error;
    }
  }

  /**
   * Request withdrawal
   */
  async requestWithdrawal(amount: number, bankAccount: string, description?: string): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('[DriverService] Requesting withdrawal:', { amount, bankAccount, description });

      const response = await axios.post(
        `${this.baseURL}/wallets/withdraw`,
        {
          amount,
          bankAccount,
          description: description || 'Rút tiền từ ví',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[DriverService] ✅ Withdrawal request created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] ❌ Error requesting withdrawal:', error.message);
      throw error;
    }
  }

  /**
   * Get wallet balance
   */
  async getWalletBalance(): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await axios.get(
        `${this.baseURL}/wallets/balance`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log('[DriverService] ✅ Wallet balance:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] ❌ Error fetching wallet balance:', error.message);
      throw error;
    }
  }

  /**
   * Upload driver documents for verification (base64 format)
   */
  async uploadDocuments(
    driverId: string,
    documents: {
      idCardFront?: string;
      idCardBack?: string;
      driverLicense?: string;
      vehicleRegistration?: string;
      vehiclePlate?: string;
      insurance?: string;
      facePhoto?: string;
    }
  ): Promise<any> {
    try {
      const token = await AsyncStorage.getItem('token');
      console.log('[DriverService] Uploading documents for driver:', driverId);

      const response = await axios.post(
        `${this.baseURL}/drivers/${driverId}/documents`,
        documents,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[DriverService] ✅ Documents uploaded successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('[DriverService] ❌ Error uploading documents:', error.message);
      throw error;
    }
  }
}

export const driverService = new DriverService()
