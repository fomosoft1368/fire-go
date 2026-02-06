import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

const API_URL = API_BASE_URL

class AssignmentRequestPollingService {
  private intervalId: NodeJS.Timeout | null = null
  private isPolling = false
  private pollingInterval = 1000 // Poll every 1 second (was 3000)
  private onRequestCallback: ((request: any) => void) | null = null
  private driverId: string | null = null

  /**
   * Bắt đầu polling để check assignment requests
   */
  async startPolling(onRequestReceived: (request: any) => void, driverId?: string) {
    if (this.isPolling) {
      console.log('[AssignmentPolling] Already polling, skipping...')
      return
    }

    this.onRequestCallback = onRequestReceived
    this.driverId = driverId || null
    this.isPolling = true

    console.log('[AssignmentPolling] 🔄 Started polling for assignment requests (driverId:', this.driverId, ')')

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
   * Check for pending assignment requests (rides, deliveries, and combined trips)
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

      // Prepare requests array
      const requests = [
        fetch(`${API_URL}/rides/assignment-requests/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/deliveries/assignment-requests/pending`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]

      // Add combined trips requests if driverId is available
      if (this.driverId) {
        requests.push(
          fetch(`${API_URL}/combined-trips/driver/${this.driverId}/pending-requests`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      }

      // Check all requests in parallel
      const responses = await Promise.all(requests)

      console.log('[AssignmentPolling] Ride response:', responses[0].status)
      console.log('[AssignmentPolling] Delivery response:', responses[1].status)
      if (responses[2]) {
        console.log('[AssignmentPolling] Combined trips response:', responses[2].status)
      }

      const rideRequests = responses[0].ok ? await responses[0].json() : []
      const deliveryRequests = responses[1].ok ? await responses[1].json() : []
      const combinedTripRequests = responses[2]?.ok ? await responses[2].json() : []

      console.log('[AssignmentPolling] Ride requests:', rideRequests.length)
      console.log('[AssignmentPolling] Delivery requests:', deliveryRequests.length)
      console.log('[AssignmentPolling] Combined trip requests:', combinedTripRequests.length)

      // Combine and sort by createdAt (newest first)
      const allRequests = [
        ...rideRequests.map((r: any) => ({ ...r, type: 'ride' })),
        ...deliveryRequests.map((r: any) => ({ ...r, type: 'delivery' })),
        ...combinedTripRequests.map((r: any) => ({ ...r, type: 'rideshare' })),
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
