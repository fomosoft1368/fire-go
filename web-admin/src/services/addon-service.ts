import axios from 'axios'

<<<<<<< Updated upstream
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.10:3000/api'
=======
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://192.168.1.14:3000/api'
>>>>>>> Stashed changes

interface AddonService {
  _id?: string
  name: string
  icon: string
  description: string
  price: number
  duration: number
  status: 'active' | 'inactive'
  createdAt?: string
  updatedAt?: string
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const addonServiceApi = {
  /**
   * Get all addon services
   */
  getAll: async (status?: string, skip?: number, limit?: number) => {
    try {
      const params = new URLSearchParams()
      if (status) params.append('status', status)
      if (skip !== undefined) params.append('skip', skip.toString())
      if (limit !== undefined) params.append('limit', limit.toString())

      const response = await apiClient.get(`/addon-services?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error('[addonServiceApi] Error fetching all services:', error)
      throw error
    }
  },

  /**
   * Get active addon services
   */
  getActive: async (skip?: number, limit?: number) => {
    try {
      const params = new URLSearchParams()
      if (skip !== undefined) params.append('skip', skip.toString())
      if (limit !== undefined) params.append('limit', limit.toString())

      const response = await apiClient.get(`/addon-services/active?${params.toString()}`)
      return response.data
    } catch (error: any) {
      console.error('[addonServiceApi] Error fetching active services:', error)
      throw error
    }
  },

  /**
   * Get addon service by ID
   */
  getById: async (id: string) => {
    try {
      const response = await apiClient.get(`/addon-services/${id}`)
      return response.data
    } catch (error: any) {
      console.error('[addonServiceApi] Error fetching service by ID:', error)
      throw error
    }
  },

  /**
   * Create new addon service
   */
  create: async (data: AddonService) => {
    try {
      const response = await apiClient.post('/addon-services', data)
      return response.data
    } catch (error: any) {
      console.error('[addonServiceApi] Error creating service:', error)
      throw error
    }
  },

  /**
   * Update addon service
   */
  update: async (id: string, data: Partial<AddonService>) => {
    try {
      const response = await apiClient.patch(`/addon-services/${id}`, data)
      return response.data
    } catch (error: any) {
      console.error('[addonServiceApi] Error updating service:', error)
      throw error
    }
  },

  /**
   * Toggle addon service status
   */
  toggleStatus: async (id: string) => {
    try {
      const response = await apiClient.patch(`/addon-services/${id}/toggle-status`)
      return response.data
    } catch (error: any) {
      console.error('[addonServiceApi] Error toggling status:', error)
      throw error
    }
  },

  /**
   * Delete addon service
   */
  delete: async (id: string) => {
    try {
      const response = await apiClient.delete(`/addon-services/${id}`)
      return response.data
    } catch (error: any) {
      console.error('[addonServiceApi] Error deleting service:', error)
      throw error
    }
  },
}
