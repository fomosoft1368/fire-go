import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

const API_URL = API_BASE_URL

class AssignmentRequestPollingService {
  private intervalId: NodeJS.Timeout | null = null
  private isPolling = false
  private pollingInterval = 3000 // Poll every 3 seconds
  private onRequestCallback: ((request: any) => void) | null = null

  /**
   * Bắt đầu polling để check assignment requests
   */
  async startPolling(onRequestReceived: (request: any) => void) {
    if (this.isPolling) {
      console.log('[AssignmentPolling] Already polling, skipping...')
      return
    }

    this.onRequestCallback = onRequestReceived
    this.isPolling = true

    console.log('[AssignmentPolling] 🔄 Started polling for assignment requests')

    // Poll ngay lập tức
    await this.checkForRequests()

    // Sau đó poll theo interval
    this.intervalId = setInterval(async () => {
      await this.checkForRequests()
    }, this.pollingInterval)
  }

  /**
   * Dừng polling
   */
  stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }

    this.isPolling = false
    this.onRequestCallback = null

    console.log('[AssignmentPolling] ⏸️ Stopped polling')
  }

  /**
   * Check for pending assignment requests (both ride and delivery)
   */
  private async checkForRequests() {
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        console.log('[AssignmentPolling] No token found, stopping polling')
        this.stopPolling()
        return
      }

      console.log('[AssignmentPolling] Checking for requests...')

      // Check both ride and delivery requests in parallel
      const [rideResponse, deliveryResponse] = await Promise.all([
        fetch(`${API_URL}/rides/assignment-requests/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/deliveries/assignment-requests/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      console.log('[AssignmentPolling] Ride response:', rideResponse.status)
      console.log('[AssignmentPolling] Delivery response:', deliveryResponse.status)

      const rideRequests = rideResponse.ok ? await rideResponse.json() : []
      const deliveryRequests = deliveryResponse.ok ? await deliveryResponse.json() : []

      console.log('[AssignmentPolling] Ride requests:', rideRequests.length)
      console.log('[AssignmentPolling] Delivery requests:', deliveryRequests.length)

      // Combine and sort by createdAt (newest first)
      const allRequests = [
        ...rideRequests.map((r: any) => ({ ...r, type: 'ride' })),
        ...deliveryRequests.map((r: any) => ({ ...r, type: 'delivery' })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      if (allRequests.length > 0) {
        console.log(`[AssignmentPolling] 🔔 Found ${allRequests.length} pending request(s)`)
        console.log('[AssignmentPolling] First request:', JSON.stringify(allRequests[0], null, 2))
        
        // Callback với request đầu tiên (mới nhất)
        if (this.onRequestCallback) {
          this.onRequestCallback(allRequests[0])
        }
      }
    } catch (error) {
      console.error('[AssignmentPolling] Error checking requests:', error)
    }
  }

  /**
   * Accept an assignment request
   */
  async acceptRequest(requestId: string, type: 'ride' | 'delivery' = 'ride'): Promise<any> {
    const token = await AsyncStorage.getItem('token')
    if (!token) {
      throw new Error('No authentication token')
    }

    const endpoint = type === 'delivery' 
      ? `${API_URL}/deliveries/assignment-requests/${requestId}/accept`
      : `${API_URL}/rides/assignment-requests/${requestId}/accept`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to accept request')
    }

    return await response.json()
  }

  /**
   * Reject an assignment request
   */
  async rejectRequest(requestId: string, type: 'ride' | 'delivery' = 'ride', reason?: string): Promise<void> {
    const token = await AsyncStorage.getItem('token')
    if (!token) {
      throw new Error('No authentication token')
    }

    const endpoint = type === 'delivery'
      ? `${API_URL}/deliveries/assignment-requests/${requestId}/reject`
      : `${API_URL}/rides/assignment-requests/${requestId}/reject`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to reject request')
    }
  }
}

export const assignmentRequestPollingService = new AssignmentRequestPollingService()
