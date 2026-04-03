import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { Platform } from 'react-native'
import { API_BASE_URL } from '../constants'
import AsyncStorage from '@react-native-async-storage/async-storage'

// ✅ Cấu hình hiển thị thông báo khi app đang foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

/**
 * Đăng ký push notification và gửi token về backend
 * Gọi sau khi customer đăng nhập thành công
 */
export async function registerPushToken(): Promise<string | null> {
  try {
    // Chỉ chạy trên thiết bị thật (không phải simulator)
    if (!Device.isDevice) {
      console.log('[PushNotification] ⚠️ Push notifications chỉ hoạt động trên thiết bị thật')
      return null
    }

    // Kiểm tra và xin quyền thông báo
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    if (existingStatus !== 'granted') {
      console.log('[PushNotification] 📋 Đang xin quyền thông báo...')
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotification] ❌ Người dùng từ chối quyền thông báo')
      return null
    }

    // Cấu hình channel cho Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Thông báo',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B00',
        sound: 'default',
      })
    }

    // Lấy Expo Push Token
    console.log('[PushNotification] 🔑 Đang lấy Expo Push Token...')
    const tokenData = await Notifications.getExpoPushTokenAsync()
    const expoPushToken = tokenData.data
    console.log('[PushNotification] ✅ Token:', expoPushToken.substring(0, 40) + '...')

    // Gửi token về backend
    await sendTokenToBackend(expoPushToken)

    return expoPushToken
  } catch (error: any) {
    console.error('[PushNotification] ❌ Lỗi đăng ký push token:', error.message)
    return null
  }
}

/**
 * Gửi Expo Push Token lên backend để lưu vào DB
 */
async function sendTokenToBackend(token: string): Promise<void> {
  try {
    const authToken = await AsyncStorage.getItem('authToken')
    if (!authToken) {
      console.log('[PushNotification] ⚠️ Chưa đăng nhập, bỏ qua đăng ký token')
      return
    }

    const response = await fetch(`${API_BASE_URL}/notifications/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token }),
    })

    if (response.ok) {
      console.log('[PushNotification] ✅ Token đã đăng ký với backend thành công')
    } else {
      console.warn('[PushNotification] ⚠️ Backend trả về lỗi:', response.status)
    }
  } catch (error: any) {
    console.error('[PushNotification] ❌ Không thể gửi token về backend:', error.message)
  }
}

/**
 * Lắng nghe thông báo khi nhận được (foreground)
 * Trả về function để cleanup listener
 */
export function addNotificationListener(
  onNotification: (notification: Notifications.Notification) => void,
  onResponse?: (response: Notifications.NotificationResponse) => void,
): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener(onNotification)

  const responseSub = onResponse
    ? Notifications.addNotificationResponseReceivedListener(onResponse)
    : null

  // Trả về cleanup function
  return () => {
    receivedSub.remove()
    responseSub?.remove()
  }
}

/**
 * Lấy số thông báo chưa đọc (badge) 
 */
export async function getBadgeCount(): Promise<number> {
  return await Notifications.getBadgeCountAsync()
}

/**
 * Reset badge count về 0
 */
export async function resetBadge(): Promise<void> {
  await Notifications.setBadgeCountAsync(0)
}
