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
  status: 'offline' | 'online' | 'on_trip' | 'break';
  vehicleLicense: string;
  vehicleModel: string;
  vehicleColor: string;
  vehiclePlate: string;
  vehicleImage?: string;
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
}

class ApiService {
  private getAuthToken() {
    return localStorage.getItem('token');
  }

  private getHeaders() {
    const token = this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.data || data;
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
}

export const apiService = new ApiService();
export type { Driver };
