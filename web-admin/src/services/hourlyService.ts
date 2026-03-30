import axios from 'axios'

<<<<<<< Updated upstream
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.10:3000/api'
=======
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.14:3000/api'
>>>>>>> Stashed changes

export interface HourlyService {
  _id: string
  customerId: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    avatar?: string
  }
  workerId?: {
    _id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    avatar?: string
  }
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  hours: number
  address: string
  selectedDate: number
  selectedTime: string
  month?: number
  year?: number
  estimatedPrice: number
  actualPrice?: number
  notes?: string
  services: Array<{
    id?: string
    name: string
    price: number
    duration?: number
    selected: boolean
  }>
  rating?: number
  comment?: string
  feedback?: string
  cancelReason?: string
  startTime?: string
  endTime?: string
  cancelledTime?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface HourlyServiceStats {
  totalServices: number
  pendingServices: number
  completedServices: number
  cancelledServices: number
  totalRevenue: number
}

export const hourlyServiceAPI = {
  /**
   * Get all hourly services with optional filters
   */
  async getAll(status?: string, limit: number = 100, skip: number = 0): Promise<HourlyService[]> {
    try {
      const token = localStorage.getItem('token')
      const params: any = { limit, skip }
      if (status && status !== 'all') {
        params.status = status
      }

      const response = await axios.get(`${API_BASE_URL}/hourly-services`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        params,
      })

      return response.data.data || []
    } catch (error: any) {
      console.error('[HourlyServiceAPI] Error fetching services:', error)
      throw new Error(error.response?.data?.message || 'Không thể tải danh sách dịch vụ')
    }
  },

  /**
   * Get hourly service statistics
   */
  async getStatistics(): Promise<HourlyServiceStats> {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/hourly-services/statistics`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return response.data.data
    } catch (error: any) {
      console.error('[HourlyServiceAPI] Error fetching statistics:', error)
      throw new Error(error.response?.data?.message || 'Không thể tải thống kê')
    }
  },

  /**
   * Get hourly service by ID
   */
  async getById(id: string): Promise<HourlyService> {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/hourly-services/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return response.data.data
    } catch (error: any) {
      console.error('[HourlyServiceAPI] Error fetching service detail:', error)
      throw new Error(error.response?.data?.message || 'Không thể tải chi tiết dịch vụ')
    }
  },

  /**
   * Update hourly service
   */
  async update(
    id: string,
    data: {
      status?: string
      workerId?: string
      actualPrice?: number
      startTime?: string
      endTime?: string
    },
  ): Promise<HourlyService> {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.patch(`${API_BASE_URL}/hourly-services/${id}`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return response.data.data
    } catch (error: any) {
      console.error('[HourlyServiceAPI] Error updating service:', error)
      throw new Error(error.response?.data?.message || 'Không thể cập nhật dịch vụ')
    }
  },

  /**
   * Cancel hourly service
   */
  async cancel(id: string, cancelReason: string): Promise<HourlyService> {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.patch(
        `${API_BASE_URL}/hourly-services/${id}/cancel`,
        { cancelReason },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      )

      return response.data.data
    } catch (error: any) {
      console.error('[HourlyServiceAPI] Error cancelling service:', error)
      throw new Error(error.response?.data?.message || 'Không thể hủy dịch vụ')
    }
  },

  /**
   * Delete hourly service (admin only)
   */
  async delete(id: string): Promise<void> {
    try {
      const token = localStorage.getItem('token')
      await axios.delete(`${API_BASE_URL}/hourly-services/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (error: any) {
      console.error('[HourlyServiceAPI] Error deleting service:', error)
      throw new Error(error.response?.data?.message || 'Không thể xóa dịch vụ')
    }
  },
}
