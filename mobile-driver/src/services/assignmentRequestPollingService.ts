import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

const API_URL = API_BASE_URL

class AssignmentRequestPollingService {
  private intervalId: NodeJS.Timeout | null = null
  private isPolling = false
  private isPaused = false // 🛑 Pause polling during modal activity to prevent race conditions
  private pollingInterval = 1000 // Poll every 1 second
  private onRequestCallback: ((request: any) => void) | null = null
  private driverId: string | null = null

  /** Pause polling (call when modal is shown or accept/reject in progress) */
  pausePolling() {
    this.isPaused = true
    console.log('[AssignmentPolling] ⏸️ Polling paused (modal active)')
  }

  /** Resume polling (call after modal closes) */
  resumePolling() {
    this.isPaused = false
    console.log('[AssignmentPolling] ▶️ Polling resumed')
  }

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
    // 🛑 Skip if paused (modal is active - prevents race condition during accept/reject)
    if (this.isPaused) {
      console.log('[AssignmentPolling] ⏸️ Paused - skipping check')
      return
    }
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
        console.log(`[AssignmentPolling] ✅ Including combined-trips endpoint (driverId: ${this.driverId})`)
        requests.push(
          fetch(`${API_URL}/combined-trips/driver/${this.driverId}/pending-requests`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      } else {
        console.log('[AssignmentPolling] ⚠️ NO driverId provided - SKIPPING combined-trips endpoint!')
      }

      // Check all requests in parallel
      const responses = await Promise.all(requests)

      console.log('[AssignmentPolling] Ride response:', responses[0].status)
      console.log('[AssignmentPolling] Delivery response:', responses[1].status)
      if (responses[2]) {
        console.log('[AssignmentPolling] Combined trips response:', responses[2].status)
      } else {
        console.log('[AssignmentPolling] Combined trips endpoint: NOT CALLED')
      }

      // Parse responses with better error handling
      let rideRequests = []
      let deliveryRequests = []
      let combinedTripRequests = []

      try {
        if (responses[0].ok) {
          rideRequests = await responses[0].json()
        } else {
          console.warn(`[AssignmentPolling] ⚠️ Ride endpoint returned ${responses[0].status}:`, await responses[0].text())
        }
      } catch (e) {
        console.error('[AssignmentPolling] Error parsing ride response:', e)
      }

      try {
        if (responses[1].ok) {
          deliveryRequests = await responses[1].json()
        } else {
          console.warn(`[AssignmentPolling] ⚠️ Delivery endpoint returned ${responses[1].status}:`, await responses[1].text())
        }
      } catch (e) {
        console.error('[AssignmentPolling] Error parsing delivery response:', e)
      }

      try {
        if (responses[2]) {
          if (responses[2].ok) {
            combinedTripRequests = await responses[2].json()
          } else {
            const errorText = await responses[2].text()
            console.warn(`[AssignmentPolling] ⚠️ Combined-trips endpoint returned ${responses[2].status}:`)
            console.warn('[AssignmentPolling] Response body:', errorText)
            
            // Try to parse as JSON for better debugging
            try {
              const errorData = JSON.parse(errorText)
              console.warn('[AssignmentPolling] Error data:', errorData)
            } catch {}
          }
        }
      } catch (e) {
        console.error('[AssignmentPolling] Error parsing combined-trips response:', e)
      }

      console.log('[AssignmentPolling] Ride requests:', rideRequests.length)
      console.log('[AssignmentPolling] Delivery requests:', deliveryRequests.length)
      console.log('[AssignmentPolling] Combined trip requests:', combinedTripRequests.length)

      // Combine and sort by createdAt (newest first)
      const allRequests = [
        ...rideRequests.map((r: any) => ({ ...r, type: 'ride' })),
        ...deliveryRequests.map((r: any) => ({ ...r, type: 'delivery' })),
        ...combinedTripRequests.map((r: any) => ({ ...r, type: 'rideshare' })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      console.log('[AssignmentPolling] 📊 Total requests after combining:', {
        rides: rideRequests.length,
        deliveries: deliveryRequests.length,
        combined: combinedTripRequests.length,
        total: allRequests.length,
      })

      if (allRequests.length > 0) {
        const firstRequest = allRequests[0]
        
        // ✅ Validate request object before passing to callback
        if (!firstRequest._id || !firstRequest.type) {
          console.error('[AssignmentPolling] ❌ Invalid request object:', firstRequest)
          return
        }

        console.log(`[AssignmentPolling] 🔔 Found ${allRequests.length} pending request(s)`)
        console.log(`[AssignmentPolling] 📌 Sending to callback: ${firstRequest.type} request`, {
          requestId: firstRequest._id,
          type: firstRequest.type,
          createdAt: firstRequest.createdAt,
        })
        
        // Callback với request đầu tiên (mới nhất)
        if (this.onRequestCallback) {
          this.onRequestCallback(firstRequest)
        }
      } else {
        console.log('[AssignmentPolling] ℹ️ No pending requests at this moment')
      }
    } catch (error) {
      console.error('[AssignmentPolling] Error checking requests:', error)
    }
  }

  /**
   * Check trip status before accepting (prevent race conditions)
   * Returns status of combinedTrip/delivery/ride
   */
  async checkTripStatus(
    type: 'ride' | 'delivery' | 'rideshare',
    tripId?: string,
    rideId?: string,
    deliveryId?: string
  ): Promise<{ status: string; valid: boolean; message?: string }> {
    const token = await AsyncStorage.getItem('token')
    if (!token) {
      throw new Error('No authentication token')
    }

    try {
      let endpoint: string
      let idToCheck: string | undefined

      if (type === 'rideshare' && tripId) {
        endpoint = `${API_URL}/combined-trips/${tripId}`
        idToCheck = tripId
      } else if (type === 'delivery' && deliveryId) {
        endpoint = `${API_URL}/deliveries/${deliveryId}`
        idToCheck = deliveryId
      } else if (type === 'ride' && rideId) {
        endpoint = `${API_URL}/rides/${rideId}`
        idToCheck = rideId
      } else {
        return { status: 'unknown', valid: false, message: 'Missing ID for status check' }
      }

      console.log(`[AssignmentPolling] 🔍 Checking ${type} status:`, { idToCheck, endpoint })

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        console.error(`[AssignmentPolling] ❌ Status check failed (${response.status})`)
        return { status: 'error', valid: false, message: `HTTP ${response.status}` }
      }

      const data = await response.json()
      const status = data.status || 'unknown'

      console.log(`[AssignmentPolling] ✅ ${type} status:`, status)

      // 🔥 Validate status - only 'pending' or 'searching' are acceptable
      const validStatuses = ['pending', 'searching', 'finding_driver']
      const isValid = validStatuses.includes(status)

      if (!isValid) {
        let message = 'Chuyến đi không khả dụng'
        if (status === 'cancelled' || status === 'canceled') {
          message = 'Chuyến đã bị hủy bởi khách hàng'
        } else if (status === 'assigned' || status === 'in_progress' || status === 'accepted') {
          message = 'Chuyến đã được tài xế khác nhận'
        } else if (status === 'completed') {
          message = 'Chuyến đã hoàn thành'
        }
        console.warn(`[AssignmentPolling] ⚠️ Invalid status for acceptance:`, { status, message })
        return { status, valid: false, message }
      }

      return { status, valid: true }
    } catch (error) {
      console.error(`[AssignmentPolling] ❌ Error checking ${type} status:`, error)
      return { status: 'error', valid: false, message: (error as Error).message }
    }
  }

  /**
   * Accept an assignment request
   */
  async acceptRequest(requestId: string, type: 'ride' | 'delivery' | 'rideshare' = 'ride', tripId?: string): Promise<any> {
    const token = await AsyncStorage.getItem('token')
    if (!token) {
      throw new Error('No authentication token')
    }

    let endpoint: string

    if (type === 'delivery') {
      endpoint = `${API_URL}/deliveries/assignment-requests/${requestId}/accept`
    } else if (type === 'rideshare') {
      // ✅ For combined trips: PATCH /combined-trips/:combinedTripId/requests/:requestId/accept
      if (!tripId) {
        throw new Error('tripId required for rideshare requests')
      }
      endpoint = `${API_URL}/combined-trips/${tripId}/requests/${requestId}/accept`
    } else {
      // Default to ride
      endpoint = `${API_URL}/rides/assignment-requests/${requestId}/accept`
    }

    console.log(`[AssignmentPolling] 📤 Accepting ${type} request:`, { requestId, tripId, endpoint })

    const response = await fetch(endpoint, {
      method: type === 'rideshare' ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[AssignmentPolling] ❌ Accept request failed (${response.status}):`, errorText)
      
      try {
        const error = JSON.parse(errorText)
        throw new Error(error.message || `Failed to accept ${type} request`)
      } catch {
        throw new Error(`Failed to accept ${type} request (HTTP ${response.status})`)
      }
    }

    return await response.json()
  }

  /**
   * Reject an assignment request
   */
  async rejectRequest(requestId: string, type: 'ride' | 'delivery' | 'rideshare' = 'ride', tripId?: string, reason?: string): Promise<void> {
    const token = await AsyncStorage.getItem('token')
    if (!token) {
      throw new Error('No authentication token')
    }

    let endpoint: string

    if (type === 'delivery') {
      endpoint = `${API_URL}/deliveries/assignment-requests/${requestId}/reject`
    } else if (type === 'rideshare') {
      // ✅ For combined trips: PATCH /combined-trips/:combinedTripId/requests/:requestId/reject
      if (!tripId) {
        throw new Error('tripId required for rideshare requests')
      }
      endpoint = `${API_URL}/combined-trips/${tripId}/requests/${requestId}/reject`
    } else {
      // Default to ride
      endpoint = `${API_URL}/rides/assignment-requests/${requestId}/reject`
    }

    console.log(`[AssignmentPolling] 📤 Rejecting ${type} request:`, { requestId, tripId, endpoint })

    const response = await fetch(endpoint, {
      method: type === 'rideshare' ? 'PATCH' : 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[AssignmentPolling] ❌ Reject request failed (${response.status}):`, errorText)
      
      try {
        const error = JSON.parse(errorText)
        throw new Error(error.message || `Failed to reject ${type} request`)
      } catch {
        throw new Error(`Failed to reject ${type} request (HTTP ${response.status})`)
      }
    }
  }
}

export const assignmentRequestPollingService = new AssignmentRequestPollingService()
