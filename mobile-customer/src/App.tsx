import React from 'react'
import 'react-native-gesture-handler'
import { useEffect, useState, useCallback, useRef } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Provider, useSelector, useDispatch } from 'react-redux'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { store } from './redux/store'
import { MaterialIcons } from '@expo/vector-icons'
import { LoginScreen, Home, RideSharing, HireDriverScreen, Delivery, WalletScreen, ProfileScreen, EditProfileScreen, ChangePasswordScreen, PaymentMethodsScreen, TransactionHistoryScreen, NotificationScreen, NotificationDetailScreen, FindingRideScreen, FullscreenMapScreen, RideDetailRequestScreen, ConfirmDelivery, FindingDelivery, DeliveryTracking, DeliveryCompleted, DriverFoundScreen, RatingDriverScreen, ChatScreen, TripHistory, CancelTripScreen, PrivacyPolicyScreen, TermsOfServiceScreen, SupportScreen, TopupScreen, WithdrawScreen, HourlyService, FindingServiceScreen, ServiceDetailScreen, ServiceRatingScreen, IncomingCallScreen, ActiveCallScreen  } from './screens'
import { View, Text, ActivityIndicator, Platform } from 'react-native'
import { COLORS } from './constants'
import { restoreAuth } from './redux/slices/authSlice'
import type { RootState } from './redux/store'
import type { RootStackParamList } from './types'
import { notificationService } from './services/notificationService'
import { API_BASE_URL } from './constants'
import RideTracking from './screens/RideTracking'

// Detect Expo Go — executionEnvironment is reliable in SDK 54+ (appOwnership is deprecated)
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient' ||
  Constants.appOwnership === 'expo'

// Configure foreground notification display — works in Expo Go for LOCAL notifications
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  })
} catch {
  // ignore if not supported
}

// Request local notification permission (works in Expo Go)
async function requestLocalNotificationPermission(): Promise<void> {
  try {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') {
      console.log('[LocalNotif] Permission not granted')
      return
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'FireGo',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B00',
      })
    }
    console.log('[LocalNotif] ✅ Permission granted')
  } catch (err: any) {
    console.warn('[LocalNotif] Permission error:', err.message)
  }
}

// Show a local notification immediately (works in Expo Go)
async function showLocalNotification(title: string, body: string, data?: Record<string, any>): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {}, sound: 'default' },
      trigger: null, // fire immediately
    })
  } catch (err: any) {
    console.warn('[LocalNotif] Failed to show:', err.message)
  }
}

// Register Expo push token and save to backend
async function registerPushToken(authToken: string): Promise<void> {
  // Push notifications not supported in Expo Go since SDK 53
  if (IS_EXPO_GO) {
    console.log('[Push] ⚠️ Expo Go detected — remote push not supported. Use a development build.')
    return
  }

  // iOS simulator cannot get push tokens (Android emulators with Play Services can)
  if (!Device.isDevice && Platform.OS === 'ios') return

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }
  if (finalStatus !== 'granted') return

  try {
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync()
    console.log('[Push] 🔔 Customer push token:', expoPushToken)
    await fetch(`${API_BASE_URL}/notifications/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: expoPushToken }),
    })
    console.log('[Push] ✅ Customer push token registered')
  } catch (err: any) {
    // Expo Go on Android (SDK 53+) removed remote push support — skip silently
    if (err.message?.includes('Expo Go')) {
      console.log('[Push] ⚠️ Remote push not supported in Expo Go. Use a development build.')
    } else {
      console.warn('[Push] Token registration error:', err.message)
    }
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B00',
    })
  }
}

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator()

// Global ref for call navigation from outside React tree
const callNavigationRef = React.createRef<any>()

// Badge component for tab icon
const NotificationBadge = ({ unreadCount, size, color }: { unreadCount: number; size: number; color: string }) => (
  <View style={{ position: 'relative' }}>
    <MaterialIcons name="notifications" size={size} color={color} />
    {unreadCount > 0 && (
      <View
        style={{
          position: 'absolute',
          top: -4,
          right: -6,
          backgroundColor: '#FF6B6B',
          borderRadius: 10,
          minWidth: 18,
          height: 18,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Text
          style={{
            color: '#fff',
            fontSize: 10,
            fontWeight: '700',
            paddingHorizontal: 3,
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Text>
      </View>
    )}
  </View>
)

const MainNavigator = () => {
  const [unreadCount, setUnreadCount] = useState(0)
  const token = useSelector((state: RootState) => state.auth.token)

  const lastNotifIdRef = React.useRef<string | null>(null)
  const isFirstLoadRef = React.useRef(true)

  useEffect(() => {
    if (token) {
      notificationService.setToken(token)
      isFirstLoadRef.current = true
      lastNotifIdRef.current = null
      fetchUnreadCount()
      // Refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000)
      return () => clearInterval(interval)
    }
  }, [token])

  // Refresh badge when tab is focused
  useFocusEffect(
    useCallback(() => {
      if (token) {
        fetchUnreadCount()
      }
    }, [token])
  )

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationService.getNotifications(50, 0)
      const data: any[] = response.data || []
      const unread = data.filter((n: any) => !n.isRead)
      setUnreadCount(unread.length)

      if (unread.length > 0) {
        const newest = unread[0]
        if (isFirstLoadRef.current) {
          // Seed ref on first load — don't show notification
          lastNotifIdRef.current = newest._id
          isFirstLoadRef.current = false
        } else if (newest._id !== lastNotifIdRef.current) {
          // New notification arrived after first load → show it
          lastNotifIdRef.current = newest._id
          showLocalNotification(
            newest.title || 'FireGo',
            newest.message || '',
            { notificationId: newest._id, type: newest.type }
          )
        }
      } else {
        isFirstLoadRef.current = false
      }
    } catch (error) {
      console.error('Fetch unread count error:', error)
    }
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: true,
        tabBarIcon: ({ color, size }) => {
          let iconName: any = 'home'

          if (route.name === 'Home') {
            iconName = 'home'
            return <MaterialIcons name={iconName} size={size} color={color} />
          } else if (route.name === 'Notifications') {
            return <NotificationBadge unreadCount={unreadCount} size={size} color={color} />
          } else if (route.name === 'Bookings') {
            iconName = 'event-note'
          } else if (route.name === 'Wallet') {
            iconName = 'account-balance-wallet'
          } else if (route.name === 'Profile') {
            iconName = 'person'
          }

          return <MaterialIcons name={iconName} size={size} color={color} />
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: '#65686C',
        tabBarStyle: {
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: -8,
        },
      })}
    >
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          title: 'Trang chủ',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Bookings"
        component={TripHistory}
        options={{
          title: 'Hoạt động',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletScreen}
        options={{
          title: 'Ví',
          headerShown: false,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Tài khoản',
          headerShown: false,
        }}
      />
    </Tab.Navigator>
  )
}

const RootNavigator = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const isInitializing = useSelector((state: RootState) => state.auth.isInitializing)
  const dispatch = useDispatch()

  useEffect(() => {
    const performLogout = async (reason: string) => {
      console.log('[App] 🚫 Auto-logout:', reason)
      await AsyncStorage.multiRemove(['authToken', 'user'])
      dispatch(restoreAuth(null))
    }

    const verifyAccountWithBackend = async (token: string): Promise<boolean> => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-account`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.status === 401) {
          await performLogout('Tài khoản không tồn tại hoặc đã bị xóa')
          return false
        }
        if (response.status === 403) {
          const data = await response.json().catch(() => ({}))
          await performLogout(data.message || 'Tài khoản bị khóa')
          return false
        }
        return response.ok
      } catch {
        // Network error — don't logout, just skip check
        return true
      }
    }

    const restoreAuthFromStorage = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken')
        const userStr = await AsyncStorage.getItem('user')

        console.log('[App] Restoring auth...')

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr)
            // Restore first so UI shows quickly
            dispatch(restoreAuth({ token, user }))
            // Then verify with backend (will auto-logout if invalid)
            await verifyAccountWithBackend(token)
            // Request local notification permission (works in Expo Go)
            requestLocalNotificationPermission().catch(() => {})
            // Register remote push token (only works in dev build, not Expo Go)
            registerPushToken(token).catch(() => {})
          } catch (parseError) {
            console.error('[App] User JSON parse error:', parseError)
            await AsyncStorage.multiRemove(['authToken', 'user'])
            dispatch(restoreAuth(null))
          }
        } else {
          dispatch(restoreAuth(null))
        }
      } catch (error) {
        console.error('[App] Restore auth error:', error)
        dispatch(restoreAuth(null))
      }
    }

    restoreAuthFromStorage()
  }, [dispatch])

  // ✅ Verify account every time app comes to foreground + every 60s
  useEffect(() => {
    if (!isAuthenticated) return

    const checkAccountValidity = async () => {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) return
      try {
        const response = await fetch(`${API_BASE_URL}/auth/verify-account`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (response.status === 401 || response.status === 403) {
          const data = await response.json().catch(() => ({}))
          const reason = data.message || 'Tài khoản không hợp lệ'
          console.log('[App] 🚫 Account invalid, logging out:', reason)
          await AsyncStorage.multiRemove(['authToken', 'user'])
          dispatch(restoreAuth(null))
        }
      } catch {
        // Network error - skip
      }
    }

    // Check every 60 seconds
    const interval = setInterval(checkAccountValidity, 60000)

    // Check when app comes to foreground
    const { AppState } = require('react-native')
    const subscription = AppState.addEventListener('change', (state: string) => {
      if (state === 'active') {
        checkAccountValidity()
      }
    })

    return () => {
      clearInterval(interval)
      subscription.remove()
    }
  }, [isAuthenticated, dispatch])

  // ======================================================
  // 📞 Incoming Call Poller – check CALL_INCOMING every 5s
  // ======================================================
  const handledCallIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!isAuthenticated) return

    const pollIncomingCall = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken')
        if (!token) return

        const response = await notificationService.getNotifications(10, 0)
        const notifications: any[] = response.data || []

        const callNotif = notifications.find(
          (n) =>
            !n.isRead &&
            n.data?.type === 'CALL_INCOMING' &&
            n.data?.callId &&
            !handledCallIds.current.has(n.data.callId)
        )

        if (callNotif) {
          const { callId, rideId, channelName, receiverToken, receiverUid, callerRole } = callNotif.data
          handledCallIds.current.add(callId)

          // Mark notification as read
          try {
            await fetch(`${API_BASE_URL}/notifications/${callNotif._id}/read`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}` },
            })
          } catch (_) {}

          // Navigate to IncomingCallScreen
          callNavigationRef.current?.navigate('IncomingCall', {
            callId,
            rideId,
            channelName,
            receiverToken,
            receiverUid,
            callerName: callerRole === 'driver' ? 'Tài xế' : 'Khách hàng',
            callerRole,
          })
        }
      } catch (err) {
        // silent - don't break app if poll fails
      }
    }

    const interval = setInterval(pollIncomingCall, 5000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Show loading screen while checking auth
  if (isInitializing) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 16, fontSize: 16, color: COLORS.textSecondary }}>Đang tải...</Text>
      </View>
    )
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainNavigator} />
          <Stack.Group
            screenOptions={{
              presentation: 'card',
            }}
          >
            <Stack.Screen name="Notification" component={NotificationScreen} />
            <Stack.Screen name="NotificationDetailScreen" component={NotificationDetailScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} />
            <Stack.Screen name="TransactionHistory" component={TransactionHistoryScreen} />
            <Stack.Screen name="Topup" component={TopupScreen} />
            <Stack.Screen name="Withdraw" component={WithdrawScreen} />
            <Stack.Screen name="BookRide" component={RideSharing} />
            <Stack.Screen name="HireDriver" component={HireDriverScreen} />
            <Stack.Screen name="RideTracking" component={RideTracking} />
            <Stack.Screen name="CancelTripScreen" component={CancelTripScreen} />
            <Stack.Screen name="RatingDriver" component={RatingDriverScreen} />
            <Stack.Screen name="Delivery" component={Delivery} />
            <Stack.Screen name="HourlyService" component={HourlyService} />
            <Stack.Screen name="FindingService" component={FindingServiceScreen} />
            <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} />
            <Stack.Screen name="ServiceRating" component={ServiceRatingScreen} />
            <Stack.Screen name="RideDetailRequest" component={RideDetailRequestScreen} />
            <Stack.Screen name="FindingRideScreen" component={FindingRideScreen} />
            <Stack.Screen name="FullscreenMap" component={FullscreenMapScreen} />
            <Stack.Screen name="ConfirmDelivery" component={ConfirmDelivery} />
            <Stack.Screen name="FindingDelivery" component={FindingDelivery} />
            <Stack.Screen name="DeliveryTracking" component={DeliveryTracking} />
            <Stack.Screen name="DeliveryCompleted" component={DeliveryCompleted} />
            <Stack.Screen name="DriverFound" component={DriverFoundScreen} />
            <Stack.Screen name="ChatScreen" component={ChatScreen} />
            <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
            <Stack.Screen name="TermsOfService" component={TermsOfServiceScreen} />
            <Stack.Screen name="Support" component={SupportScreen} />
            <Stack.Screen name="IncomingCall" component={IncomingCallScreen} options={{ headerShown: false, presentation: 'fullScreenModal' }} />
            <Stack.Screen name="ActiveCall" component={ActiveCallScreen} options={{ headerShown: false, presentation: 'fullScreenModal' }} />
          </Stack.Group>
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  )
}

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer ref={callNavigationRef}>
        <RootNavigator />
      </NavigationContainer>
    </Provider>
  )
}
