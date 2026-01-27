import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface PendingNotification {
  request: any
  combinedTripId: string
  timestamp: number
}

/**
 * Hook to listen for pending request notifications from global polling
 * Triggered when a new request comes in, regardless of which screen user is on
 */
export const usePendingRequestNotification = (
  onNewRequest: (notification: PendingNotification) => void
) => {
  const [lastNotificationId, setLastNotificationId] = useState<string | null>(null)

  useEffect(() => {
    const checkForNotification = async () => {
      try {
        const stored = await AsyncStorage.getItem('pendingRequestNotification')
        if (stored) {
          const notification = JSON.parse(stored)
          const notificationId = notification.request._id

          // Only trigger if it's a new notification
          if (notificationId !== lastNotificationId) {
            console.log('[usePendingRequestNotification] 📬 New notification detected:', notificationId)
            setLastNotificationId(notificationId)
            onNewRequest(notification)
          }
        }
      } catch (error) {
        console.error('[usePendingRequestNotification] Error:', error)
      }
    }

    // Check immediately
    checkForNotification()

    // Check every 2 seconds (will be triggered by global polling every 5s)
    const interval = setInterval(checkForNotification, 2000)

    return () => {
      clearInterval(interval)
    }
  }, [lastNotificationId, onNewRequest])

  const clearNotification = async () => {
    try {
      await AsyncStorage.removeItem('pendingRequestNotification')
      setLastNotificationId(null)
    } catch (error) {
      console.error('[usePendingRequestNotification] Clear error:', error)
    }
  }

  return { clearNotification }
}
