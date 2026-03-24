import { API_BASE_URL, API_TIMEOUT } from '../constants/config'

/**
 * Fetch with timeout support for physical devices
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = API_TIMEOUT || 30000
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms. Please check your internet connection and ensure backend is running at ${API_BASE_URL}`)
    }
    throw error
  }
}

/**
 * API helper with automatic timeout and error handling
 */
export const api = {
  async get(endpoint: string, token?: string, timeout?: number) {
    return fetchWithTimeout(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
      timeout
    )
  },

  async post(endpoint: string, data?: any, token?: string, timeout?: number) {
    return fetchWithTimeout(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: data ? JSON.stringify(data) : undefined,
      },
      timeout
    )
  },

  async put(endpoint: string, data?: any, token?: string, timeout?: number) {
    return fetchWithTimeout(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: data ? JSON.stringify(data) : undefined,
      },
      timeout
    )
  },

  async delete(endpoint: string, token?: string, timeout?: number) {
    return fetchWithTimeout(
      `${API_BASE_URL}${endpoint}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      },
      timeout
    )
  },
}
