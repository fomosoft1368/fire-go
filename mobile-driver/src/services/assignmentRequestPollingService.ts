import AsyncStorage from '@react-native-async-storage/async-storage'

const API_URL = 'http://10.0.2.2:3000/api'

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
   * Check for pending assignment requests
   */
  private async checkForRequests() {
    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        console.log('[AssignmentPolling] No token found, stopping polling')
        this.stopPolling()
        return
      }

      const response = await fetch(`${API_URL}/rides/assignment-requests/pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        console.warn('[AssignmentPolling] Failed to fetch requests:', response.status)
        return
      }

      const requests = await response.json()

      if (requests && requests.length > 0) {
        console.log(`[AssignmentPolling] 🔔 Found ${requests.length} pending request(s)`)
        
        // Callback với request đầu tiên (mới nhất)
        if (this.onRequestCallback) {
          this.onRequestCallback(requests[0])
        }
      }
    } catch (error) {
      console.error('[AssignmentPolling] Error checking requests:', error)
    }
  }

  /**
   * Accept an assignment request
   */
  async acceptRequest(requestId: string): Promise<any> {
    const token = await AsyncStorage.getItem('token')
    if (!token) {
      throw new Error('No authentication token')
    }

    const response = await fetch(
      `${API_URL}/rides/assignment-requests/${requestId}/accept`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to accept request')
    }

    return await response.json()
  }

  /**
   * Reject an assignment request
   */
  async rejectRequest(requestId: string, reason?: string): Promise<void> {
    const token = await AsyncStorage.getItem('token')
    if (!token) {
      throw new Error('No authentication token')
    }

    const response = await fetch(
      `${API_URL}/rides/assignment-requests/${requestId}/reject`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Failed to reject request')
    }
  }
}

export const assignmentRequestPollingService = new AssignmentRequestPollingService()
