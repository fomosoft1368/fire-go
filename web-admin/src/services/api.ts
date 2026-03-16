/// <reference types="vite/client" />

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface Driver {
  _id?: string;
  id?: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  address?: string;
  status: 'offline' | 'online' | 'on_trip' | 'break';
  vehicleLicense: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePlate: string;
  vehicleImage?: string;
  vehicleRegistration?: string;
  licenseNumber: string;
  licenseExpiry: string;
  licenseImage?: string;
  licenseStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  idNumber?: string;
  idType?: string;
  idImage?: string;
  idStatus: 'pending' | 'approved' | 'rejected' | 'expired';
  backgroundCheckPassed: boolean;
  backgroundCheckDate?: string;
  insuranceProvider?: string;
  insuranceExpiry?: string;
  insuranceCertificate?: string;
  bankName?: string;
  bankAccount?: string;
  bankAccountHolder?: string;
  totalRides: number;
  completedRides: number;
  cancelledRides: number;
  averageRating: number;
  totalReviews: number;
  totalEarnings: number;
  currentLocation?: {
    type: string;
    coordinates: [number, number];
  };
  lastLocationUpdate?: string;
  isAcceptingRides: boolean;
  isSuspended: boolean;
  suspensionReason?: string;
  createdAt?: string;
  updatedAt?: string;
  // Document verification fields
  verificationStatus?: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  approvalStatus?: 'not_submitted' | 'pending' | 'approved' | 'rejected';
  documentsSubmittedAt?: string;
  rejectedDocuments?: string[];
  documents?: {
    idCardFront?: {
      url: string;
      uploadedAt: string;
    };
    idCardBack?: {
      url: string;
      uploadedAt: string;
    };
    driverLicense?: {
      url: string;
      uploadedAt: string;
    };
    vehicleRegistration?: {
      url: string;
      uploadedAt: string;
    };
    vehiclePlate?: {
      url: string;
      uploadedAt: string;
    };
    insurance?: {
      url: string;
      uploadedAt: string;
    };
    facePhoto?: {
      url: string;
      uploadedAt: string;
    };
  };
}

class ApiService {
  private getAuthToken() {
    const token = localStorage.getItem('token');
    console.log('Auth token from localStorage:', token ? 'exists' : 'missing');
    return token;
  }

  private getHeaders() {
    const token = this.getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    console.log('Headers:', { hasAuth: !!token, authorization: headers.Authorization ? 'present' : 'missing' });
    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json();
      let errorMessage = '';
      
      if (Array.isArray(error.message)) {
        errorMessage = error.message.map((msg: any) => {
          if (typeof msg === 'string') return msg;
          if (msg.constraints) return Object.values(msg.constraints).join(', ');
          return JSON.stringify(msg);
        }).join('; ');
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      } else {
        errorMessage = `HTTP error! status: ${response.status}`;
      }
      
      console.error('API Error:', { status: response.status, error, errorMessage });
      throw new Error(errorMessage);
    }
    const data = await response.json();
    const result = data.data || data;
    return result;
  }

  // Drivers API
  async getDrivers(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<Driver[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const url = `${API_BASE_URL}/drivers${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<Driver[]>(response);
  }

  async getDriverById(id: string): Promise<Driver> {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<Driver>(response);
  }

  async createDriver(data: Partial<Driver>): Promise<Driver> {
    const response = await fetch(`${API_BASE_URL}/drivers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Driver>(response);
  }

  async updateDriver(id: string, data: Partial<Driver>): Promise<Driver> {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<Driver>(response);
  }

  async updateDriverStatus(id: string, status: string): Promise<Driver> {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}/status`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ status }),
    });
    return this.handleResponse<Driver>(response);
  }

  async approveDriver(id: string, data?: any): Promise<Driver> {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}/approve`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data || {}),
    });
    return this.handleResponse<Driver>(response);
  }

  async rejectDriver(id: string, rejectionData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}/reject`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(rejectionData),
    });
    return this.handleResponse<any>(response);
  }

  async approveDriverDocuments(id: string, notes?: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}/documents/approve`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ notes }),
    });
    return this.handleResponse<any>(response);
  }

  async rejectDriverDocuments(id: string, reason: string, rejectedDocuments?: string[]): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}/documents/reject`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ reason, rejectedDocuments }),
    });
    return this.handleResponse<any>(response);
  }

  async getDriverStats(id: string) {
    const response = await fetch(`${API_BASE_URL}/drivers/${id}/stats`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async getNearbyDrivers(
    latitude: number,
    longitude: number,
    radius?: number
  ): Promise<Driver[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('latitude', String(latitude));
    searchParams.append('longitude', String(longitude));
    if (radius) searchParams.append('radius', String(radius));

    const response = await fetch(`${API_BASE_URL}/drivers/nearby?${searchParams}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<Driver[]>(response);
  }

  // Customers API
  async getCustomers(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.search) searchParams.append('search', params.search);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.page) searchParams.append('page', String(params.page));
    if (params?.limit) searchParams.append('limit', String(params.limit));

    const url = `${API_BASE_URL}/customers${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async getCustomerById(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async updateCustomer(id: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(response);
  }

  async createCustomer(data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/customers`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(response);
  }

  async deleteCustomer(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  // Authentication API
  async login(email: string, password: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse<any>(response);
  }

  // Users API
  async getUsers(params?: {
    role?: string;
    status?: string;
    search?: string;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);

    const url = `${API_BASE_URL}/admin/users${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  // Admin/Staff Users API
  async getAdminUsers(params?: {
    role?: string;
    status?: string;
    search?: string;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.role) searchParams.append('role', params.role);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.search) searchParams.append('search', params.search);

    const url = `${API_BASE_URL}/admin/staff${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  // User Management API
  async getUserById(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async createUser(data: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    role: string;
    department?: string;
    status?: string;
    permissions?: string[];
  }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(response);
  }

  async updateUser(userId: string, data: Partial<any>): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse<any>(response);
  }

  async updateUserPermissions(userId: string, permissions: string[]): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/permissions`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ permissions }),
    });
    return this.handleResponse<any>(response);
  }

  async deleteUser(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  // Rides API
  async getRides(params?: {
    status?: string;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);

    const url = `${API_BASE_URL}/rides${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async assignDriver(rideId: string, driverId: string): Promise<any> {
    const url = `${API_BASE_URL}/rides/${rideId}/assign`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify({ driverId }),
    });
    return this.handleResponse<any>(response);
  }

  // Combined Trips (Xe Ghép) API
  async getCombinedTrips(params?: {
    status?: string;
    driverId?: string;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.driverId) searchParams.append('driverId', params.driverId);

    const url = `${API_BASE_URL}/combined-trips${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async getCombinedTripDetail(tripId: string): Promise<any> {
    const url = `${API_BASE_URL}/combined-trips/${tripId}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  async getCombinedTripRequests(tripId: string): Promise<any[]> {
    const url = `${API_BASE_URL}/combined-trips/${tripId}/requests`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  // Delivery (Giao Hàng) API
  async getDeliveries(params?: {
    status?: string;
    customerId?: string;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.customerId) searchParams.append('customerId', params.customerId);

    const url = `${API_BASE_URL}/deliveries${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async getDeliveryDetail(deliveryId: string): Promise<any> {
    const url = `${API_BASE_URL}/deliveries/${deliveryId}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  // Hourly Services (Lái Xe Hộ) API
  async getHourlyServices(params?: {
    status?: string;
  }): Promise<any[]> {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);

    const url = `${API_BASE_URL}/hourly-services${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async getHourlyServiceDetail(serviceId: string): Promise<any> {
    const url = `${API_BASE_URL}/hourly-services/${serviceId}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  // Notifications
  async getNotifications(): Promise<any[]> {
    const url = `${API_BASE_URL}/notifications`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async getUnreadNotifications(): Promise<any[]> {
    const url = `${API_BASE_URL}/notifications/unread`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse<any[]>(response);
  }

  async markNotificationAsRead(notificationId: string): Promise<any> {
    const url = `${API_BASE_URL}/notifications/${notificationId}/read`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    return this.handleResponse<any>(response);
  }

  // System Config
  async getSystemConfigs(): Promise<any[]> {
    try {
      const url = `${API_BASE_URL}/admin/config`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        console.log('getSystemConfigs failed with status:', response.status);
        return [];
      }
      return this.handleResponse<any[]>(response);
    } catch (err) {
      console.log('Error fetching system configs:', err);
      return [];
    }
  }

  async setSystemConfig(data: any): Promise<any> {
    const url = `${API_BASE_URL}/admin/config`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async getSystemConfig(key: string): Promise<any> {
    const url = `${API_BASE_URL}/admin/config/${key}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Pricing Configuration - Topup Discount
  async updateTopupDiscount(topupDiscountCustomer?: number, topupDiscountDriver?: number): Promise<any> {
    const url = `${API_BASE_URL}/pricing/config/topup-discount`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        topupDiscountCustomer,
        topupDiscountDriver,
      }),
    });
    return this.handleResponse(response);
  }

  // Get Pricing Config
  async getPricingConfig(): Promise<any> {
    const url = `${API_BASE_URL}/pricing/config`;
    const response = await fetch(url, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Update Pricing Config (for wallet limits, etc.)
  async updatePricingConfig(configData: any): Promise<any> {
    const url = `${API_BASE_URL}/pricing/config`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(configData),
    });
    return this.handleResponse(response);
  }

  // Password Management
  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<any> {
    const url = `${API_BASE_URL}/auth/change-password`;
    const response = await fetch(url, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  // Admin Profile
  async getAdminProfile(): Promise<any> {
    try {
      const token = this.getAuthToken();
      if (!token) {
        console.log('No auth token found, cannot fetch profile');
        return null;
      }
      
      const url = `${API_BASE_URL}/auth/profile`;
      const headers = this.getHeaders();
      console.log('Fetching profile with URL:', url);
      console.log('Auth token exists:', !!token);
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
      });
      
      console.log('Profile response status:', response.status);
      if (!response.ok) {
        const errorData = await response.json();
        console.log('Profile response error:', errorData);
        return null;
      }
      const data = await response.json();
      console.log('Profile data:', data);
      return data.data || data;
    } catch (err) {
      console.log('Error fetching profile:', err);
      return null;
    }
  }

  async updateAdminProfile(data: any): Promise<any> {
    const url = `${API_BASE_URL}/admin/profile`;
    try {
      const response = await fetch(url, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        return null;
      }
      return this.handleResponse(response);
    } catch (err) {
      return null;
    }
  }

  // Disputes Management
  async getDisputes(status?: string): Promise<any[]> {
    let url = `${API_BASE_URL}/admin/disputes`;
    if (status) {
      url += `?status=${status}`;
    }
    try {
      const response = await fetch(url, {
        headers: this.getHeaders(),
      });
      if (!response.ok) {
        return []; // Return empty array for 404 or other errors, let frontend use mock data
      }
      return this.handleResponse<any[]>(response);
    } catch {
      return []; // Return empty array if fetch fails
    }
  }

  async getDispute(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/disputes/${id}`, {
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  async resolveDispute(id: string, resolution: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/disputes/${id}/resolve`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(resolution),
    });
    return this.handleResponse(response);
  }

  async escalateDispute(id: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/disputes/${id}/escalate`, {
      method: 'PATCH',
      headers: this.getHeaders(),
    });
    return this.handleResponse(response);
  }

  // Revenue Analytics API
  async getRevenueStats(startDate?: string, endDate?: string): Promise<any> {
    let url = `${API_BASE_URL}/rides/analytics/revenue`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return null;
    return this.handleResponse(response);
  }

  async getDailyRevenue(days: number = 7): Promise<any[]> {
    const url = `${API_BASE_URL}/rides/analytics/daily-revenue?days=${days}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return [];
    return this.handleResponse<any[]>(response);
  }

  async getRevenueByType(startDate?: string, endDate?: string): Promise<any[]> {
    let url = `${API_BASE_URL}/rides/analytics/revenue-by-type`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return [];
    return this.handleResponse<any[]>(response);
  }

  async getWeeklyRevenue(): Promise<any[]> {
    const url = `${API_BASE_URL}/rides/analytics/weekly-revenue`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return [];
    return this.handleResponse<any[]>(response);
  }

  async getTopDrivers(limit: number = 10, startDate?: string, endDate?: string): Promise<any[]> {
    let url = `${API_BASE_URL}/admin/analytics/top-drivers?limit=${limit}`;
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    url = `${API_BASE_URL}/admin/analytics/top-drivers?${params.toString()}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return [];
    return this.handleResponse<any[]>(response);
  }

  // Admin Revenue API (from all sources: rides + combined trips + deliveries)
  async getActualRevenueStats(startDate?: string, endDate?: string): Promise<any> {
    let url = `${API_BASE_URL}/admin/revenue/stats`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return null;
    return this.handleResponse(response);
  }

  async getActualDailyRevenue(days: number = 7): Promise<any[]> {
    const url = `${API_BASE_URL}/admin/revenue/daily?days=${days}`;
    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return [];
    return this.handleResponse<any[]>(response);
  }

  async getActualRevenueByType(startDate?: string, endDate?: string): Promise<any[]> {
    let url = `${API_BASE_URL}/admin/revenue/by-type`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return [];
    return this.handleResponse<any[]>(response);
  }

  async getPeakHours(startDate?: string, endDate?: string): Promise<any[]> {
    let url = `${API_BASE_URL}/admin/analytics/peak-hours`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return [];
    return this.handleResponse<any[]>(response);
  }

  async getAreaPerformance(startDate?: string, endDate?: string): Promise<any[]> {
    let url = `${API_BASE_URL}/admin/analytics/area-performance`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return [];
    return this.handleResponse<any[]>(response);
  }

  async getCancelRate(startDate?: string, endDate?: string): Promise<any> {
    let url = `${API_BASE_URL}/admin/analytics/cancel-rate`;
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });
    if (!response.ok) return null;
    return this.handleResponse<any>(response);
  }

  // Generic HTTP methods
  async get(endpoint: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });
    if (!response.ok) return null;
    return this.handleResponse(response);
  }

  async post(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return this.handleResponse(response);
  }

  async patch(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PATCH',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return this.handleResponse(response);
  }

  async put(endpoint: string, data: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    if (!response.ok) return null;
    return this.handleResponse(response);
  }

  async delete(endpoint: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) return null;
    return this.handleResponse(response);
  }

  // ============================================
  // Driver Search Config APIs
  // ============================================
  async getDriverSearchConfigs(): Promise<any> {
    return this.get('/config/driver-search');
  }

  async getDriverSearchConfigByType(serviceType: string): Promise<any> {
    return this.get(`/config/driver-search/${serviceType}`);
  }

  async updateDriverSearchConfig(serviceType: string, data: any): Promise<any> {
    return this.patch(`/config/driver-search/${serviceType}`, data);
  }
}

export const apiService = new ApiService();
export { API_BASE_URL };
export type { Driver };
