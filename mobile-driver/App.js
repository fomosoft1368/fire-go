import './src/services/apiClient' // ⚠️ Import sớm — đăng ký global axios interceptor trước mọi service
import { remoteConfig } from './src/services/remoteConfig'
import React, { useEffect, useState, useRef } from 'react'
import { StyleSheet, ActivityIndicator, View, Alert, AppState, Platform } from 'react-native'
import { Audio } from 'expo-av'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import 'react-native-gesture-handler'
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Provider, useSelector, useDispatch } from 'react-redux'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import { store, RootState } from './src/redux/store'
import { restoreAuth } from './src/redux/slices/authSlice'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, API_BASE_URL } from './src/constants'
import { loginSuccess } from './src/redux/slices/authSlice'
import { assignmentRequestPollingService } from './src/services/assignmentRequestPollingService'
import { driverService } from './src/services/driverService'
import { locationTrackingService } from './src/services/locationTrackingService'
import { registerUnauthorizedHandler } from './src/services/apiClient'
import AssignmentRequestModal from './src/components/AssignmentRequestModal'
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import HomeScreen from './src/screens/HomeScreen'
import TripsScreen from './src/screens/TripsScreen'
import EarningsScreen from './src/screens/EarningsScreen'
import SupportScreen from './src/screens/SupportScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import EditProfileScreen from './src/screens/EditProfileScreen'
import ChangePasswordScreen from './src/screens/ChangePasswordScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import DocumentVerificationScreen from './src/screens/DocumentVerificationScreen'
import VehicleInfoScreen from './src/screens/VehicleInfoScreen'
import ActiveRideScreen from './src/screens/ActiveRideScreen'
import RideRequestsScreen from './src/screens/RideRequestsScreen'
import TopupScreen from './src/screens/TopupScreen'
import WithdrawScreen from './src/screens/WithdrawScreen'
import TransactionHistoryScreen from './src/screens/TransactionHistoryScreen'
import PaymentWebViewScreen from './src/screens/PaymentWebViewScreen'
import MapScreen from './src/screens/MapScreen'
import CreateRideScreen from './src/screens/CreateRideScreen'
import EarningsDetailScreen from './src/screens/EarningsDetailScreen'
import TripActivities from './src/screens/TripActivities'
import DeliveryRequestsScreen from './src/screens/DeliveryRequestsScreen'
import ActiveDeliveryScreen from './src/screens/ActiveDeliveryScreen'
import HourlyRequestsScreen from './src/screens/HourlyRequestsScreen'
import HourlyRequestDetailScreen from './src/screens/HourlyRequestDetailScreen'
import ActiveHourlyServiceScreen from './src/screens/ActiveHourlyServiceScreen'
import ChatScreen from './src/screens/ChatScreen'
import NotificationScreen from './src/screens/Notification'
import NotificationDetailScreen from './src/screens/NotificationDetail'
import TermsOfServiceScreen from './src/screens/TermsOfServiceScreen'
import PrivacyPolicyScreen from './src/screens/PrivacyPolicyScreen'
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen'
import IncomingCallScreen from './src/screens/IncomingCallScreen'
import ActiveCallScreen from './src/screens/ActiveCallScreen'
import FontAwesome from '@expo/vector-icons/FontAwesome';
import BonusScreen from './src/screens/BonusScreen'
import ReferralScreen from './src/screens/ReferralScreen'
import { loggerService } from './src/services/loggerService'

// Global Unhandled Error Logger
const defaultErrorHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  try {
    loggerService.logFrontendError('GlobalUnhandledError', error, { isFatal });
  } catch (e) {
    console.error('Failed to log global error', e);
  }
  
  if (defaultErrorHandler) {
    defaultErrorHandler(error, isFatal);
  } else {
    console.error(error, isFatal);
  }
});


//
// Module-level navigation ref — accessible from both RootNavigator and App
// This is the ONLY way to navigate from outside the React component tree
const callNavigationRef = createNavigationContainerRef()

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

// Detect Expo Go — push notifications not supported in Expo Go since SDK 53
// Use executionEnvironment which is reliable in SDK 54+ (appOwnership is deprecated)
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

/**
 * Register for Expo Push Notifications and send token to backend
 */
async function registerPushToken(authToken) {
  // Push notifications not supported in Expo Go since SDK 53
  if (IS_EXPO_GO) {
    console.log('[Push] ⚠️ Expo Go detected — remote push not supported. Use a development build.')
    return
  }

  // iOS simulator cannot get push tokens
  if (!Device.isDevice && Platform.OS === 'ios') {
    console.log('[Push] Skipping push registration on iOS simulator')
    return
  }
  // Android emulators (with Google Play Services) CAN receive push notifications

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('[Push] Notification permission denied')
    return
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync()
    const expoPushToken = tokenData.data
    console.log('[Push] 🔔 Expo push token:', expoPushToken)

    // Register token with backend
    await fetch(`${API_BASE_URL}/notifications/push-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: expoPushToken }),
    })
    console.log('[Push] ✅ Push token registered with backend')
  } catch (error) {
    // Expo Go on Android (SDK 53+) doesn't support remote push — skip silently
    if (error.message?.includes('Expo Go')) {
      console.log('[Push] ⚠️ Remote push not supported in Expo Go. Use a development build.')
    } else {
      console.warn('[Push] ❌ Failed to register push token:', error.message)
    }
  }

  // Android requires notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF6B00',
    })
  }
}

/**
 * Request local notification permission (works in Expo Go)
 */
async function requestLocalNotificationPermission() {
  try {
    const { status } = await Notifications.requestPermissionsAsync()
    if (status !== 'granted') {
      console.log('[LocalNotif] Permission not granted')
      return
    }
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'FireGo Thông báo',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF6B00',
      })
    }
    console.log('[LocalNotif] ✅ Permission granted')
  } catch (err) {
    console.warn('[LocalNotif] Permission error:', err.message)
  }
}

/**
 * Show a local notification immediately (works in Expo Go)
 */
async function showLocalNotification(title, body, data) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, data: data || {}, sound: 'default' },
      trigger: null, // fire immediately
    })
  } catch (err) {
    console.warn('[LocalNotif] Failed to show:', err.message)
  }
}

const HomeTabStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      navigationOptions={{ tabBarVisible: false }}
    >
      <Stack.Screen
        name="HomeScreenMain"
        component={HomeScreen}
        options={{
          tabBarVisible: false,
        }}
      />
      <Stack.Screen
        name="MapScreen"
        component={MapScreen}
        options={{
          animationEnabled: true,
          tabBarVisible: false,
        }}
      />
    </Stack.Navigator>
  )
}

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        let iconName

        if (route.name === 'HomeTab') {
          iconName = 'route'
        } else if (route.name === 'Trips') {
          iconName = 'refresh'
        } else if (route.name === 'Earnings') {
          iconName = 'credit-card'
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
      name="HomeTab"
      component={HomeTabStackNavigator}
      options={{
        tabBarLabel: 'Cuốc xe',
      }}
    />
    <Tab.Screen
      name="Trips"
      component={TripsScreen}
      options={{
        tabBarLabel: 'Hoạt động',
      }}
    />
    <Tab.Screen
      name="Earnings"
      component={EarningsScreen}
      options={{
        tabBarLabel: 'Thu nhập',
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Tài khoản',
      }}
    />
  </Tab.Navigator>
)

const HomeStackNavigator = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HomeScreen" component={MainNavigator} />
      <Stack.Screen
        name="CreateRide"
        component={CreateRideScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="RideRequestsScreen"
        component={RideRequestsScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="RideDetailScreen"
        component={require('./src/screens/RideDetailScreen').default}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="ActiveRideScreen"
        component={ActiveRideScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="Topup"
        component={TopupScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="Withdrawal"
        component={WithdrawScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="EarningsDetail"
        component={EarningsDetailScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="PaymentWebView"
        component={PaymentWebViewScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="TripActivities"
        component={TripActivities}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="DeliveryRequests"
        component={DeliveryRequestsScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="ActiveDelivery"
        component={ActiveDeliveryScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="HourlyRequests"
        component={HourlyRequestsScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="HourlyRequestDetail"
        component={HourlyRequestDetailScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="ActiveHourlyService"
        component={ActiveHourlyServiceScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="ChatScreen"
        component={ChatScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="ChangePassword"
        component={ChangePasswordScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="SettingsScreen"
        component={SettingsScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="DocumentVerification"
        component={DocumentVerificationScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="VehicleInfo"
        component={VehicleInfoScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="Support"
        component={SupportScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="NotificationDetail"
        component={NotificationDetailScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="TermsOfService"
        component={TermsOfServiceScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="PrivacyPolicy"
        component={PrivacyPolicyScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name="IncomingCall"
        component={IncomingCallScreen}
        options={{ animationEnabled: true, gestureEnabled: false }}
      />
      <Stack.Screen
        name="ActiveCall"
        component={ActiveCallScreen}
        options={{ animationEnabled: true, gestureEnabled: false }}
      />
      <Stack.Screen
        name='DriverBonus'
        component={BonusScreen}
        options={{ animationEnabled: true }}
      />
      <Stack.Screen
        name='ReferralScreen'
        component={ReferralScreen}
        options={{ animationEnabled: true }}
      />
    </Stack.Navigator>
  )
}

const RootNavigator = () => {
  const dispatch = useDispatch()
  const { isAuthenticated, user } = useSelector((state) => state.auth)
  const [isLoading, setIsLoading] = React.useState(true)

  useEffect(() => {
    // ✅ Fetch remote config từ backend trước mọi thứ (GOOGLE_MAPS_API_KEY, etc.)
    remoteConfig.init().catch((e) => console.warn('[App] remoteConfig init failed:', e))

    // ✅ Đăng ký handler 401: khi token hết hiệu lực (người khác đăng nhập cùng tài khoản)
    registerUnauthorizedHandler(async () => {
      console.log('[App] 🔒 401 detected — auto-logout (session on another device)')
      await AsyncStorage.multiRemove(['token', 'refreshToken'])
      dispatch(restoreAuth(null))
    })

    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        console.log('[App] ===== CHECKING AUTH ON APP START =====')
        const token = await AsyncStorage.getItem('token')

        if (token) {
          // ✅ STEP 1: Verify account is still valid (not deleted/suspended)
          try {
            const verifyRes = await fetch(`${API_BASE_URL}/auth/verify-account`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (verifyRes.status === 401 || verifyRes.status === 403) {
              const data = await verifyRes.json().catch(() => ({}))
              console.log('[App] 🚫 Account invalid on startup:', data.message)
              await AsyncStorage.removeItem('token')
              setIsLoading(false)
              return // Force login screen
            }
          } catch {
            // Network error — continue restoring session anyway
          }

          // STEP 2: Get user profile using token
          const authService = require('./src/services/authService')
          try {
            console.log('[App] Fetching user profile with token...')
            const user = await authService.getCurrentUser()

            if (user) {
              dispatch(loginSuccess({ token, user }))

              // ✅ Request local notification permission (works in Expo Go)
              requestLocalNotificationPermission().catch(() => { })
              // Register remote push token (only works in dev build, not Expo Go)
              registerPushToken(token).catch(err =>
                console.warn('[Push] Token registration failed:', err.message)
              )

              setTimeout(async () => {
                console.log('[App] Setting driver online status on app start...')
                try {
                  await driverService.setOnlineStatus(true)
                  console.log('[App] ✅ Driver is now online')
                } catch (error) {
                  console.error('[App] ❌ Failed to set online status:', error)
                }
              }, 500)
            }
          } catch (error) {
            console.log('[App] Token invalid or expired, clearing...', error.message)
            await AsyncStorage.removeItem('token')
          }
        } else {
          console.log('[App] No token found, user needs to login')
        }
      } catch (error) {
        console.error('[App] Auth check error:', error)
      } finally {
        console.log('[App] Auth check complete, hiding splash')
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [dispatch])

  // ⭐ START LOCATION TRACKING when user authenticates
  useEffect(() => {
    if (!isAuthenticated || !user) return

    console.log('[App] 📍 Starting location tracking for driver:', user._id)
    locationTrackingService.startTracking(user._id)

    return () => {
      console.log('[App] 🛑 Stopping location tracking on logout')
      locationTrackingService.stopTracking()
    }
  }, [isAuthenticated, user])

  // Handle app state changes (background/foreground)
  useEffect(() => {
    if (!isAuthenticated) return

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      console.log('[App] AppState changed to:', nextAppState)

      // Check if token still exists before making API calls
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        console.log('[App] ⚠️ Token not found, skipping AppState API call')
        return
      }

      if (nextAppState === 'active') {
        // App came to foreground — verify account validity first
        try {
          const verifyRes = await fetch(`${API_BASE_URL}/auth/verify-account`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (verifyRes.status === 401 || verifyRes.status === 403) {
            const data = await verifyRes.json().catch(() => ({}))
            console.log('[App] 🚫 Account invalid on foreground:', data.message)
            await AsyncStorage.removeItem('token')
            dispatch(restoreAuth(null))
            return
          }
        } catch {
          // Network error — skip
        }
        // Set driver online
        console.log('[App] App is now active, setting driver online...')
        try {
          await driverService.setOnlineStatus(true)
          console.log('[App] ✅ Driver is now online')
        } catch (error) {
          console.error('[App] ❌ Failed to set online:', error.message)
        }
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App went to background - set driver offline
        console.log('[App] App is going to background, setting driver offline...')
        try {
          await driverService.setOnlineStatus(false)
          console.log('[App] ✅ Driver is now offline')
        } catch (error) {
          console.error('[App] ❌ Failed to set offline:', error.message)
        }
      }
    })

    // Send heartbeat every 15 seconds to keep driver online
    const heartbeatInterval = setInterval(async () => {
      try {
        const tok = await AsyncStorage.getItem('token')
        if (!tok) return
        await driverService.sendHeartbeat()
      } catch (error) {
        console.error('[App] ❌ Heartbeat failed:', error.message)
      }
    }, 15 * 1000)

    // ✅ NEW: Verify account validity every 60 seconds
    const accountCheckInterval = setInterval(async () => {
      const tok = await AsyncStorage.getItem('token')
      if (!tok) return
      try {
        const res = await fetch(`${API_BASE_URL}/auth/verify-account`, {
          headers: { Authorization: `Bearer ${tok}` },
        })
        if (res.status === 401 || res.status === 403) {
          const data = await res.json().catch(() => ({}))
          console.log('[App] 🚫 Periodic check - account invalid:', data.message)
          await AsyncStorage.removeItem('token')
          dispatch(restoreAuth(null))
        }
      } catch {
        // Network error — skip
      }
    }, 60000)

    // Cleanup: Set offline when component unmounts (app closes)
    return () => {
      subscription.remove()
      clearInterval(heartbeatInterval)
      clearInterval(accountCheckInterval)

      // Important: Set driver offline when app is closed/killed
      // But only if token still exists (user might have logged out)
      console.log('[App] App is unmounting, setting driver offline...')

      AsyncStorage.getItem('token').then((token) => {
        if (!token) {
          console.log('[App] ✅ Token already cleared, skipping offline request')
          return
        }

        driverService.setOnlineStatus(false).catch((error) => {
          console.error('[App] ❌ Failed to set offline on unmount:', error.message)
        })
      }).catch((err) => {
        console.error('[App] Error checking token:', err.message)
      })
    }
  }, [isAuthenticated])

  // =====================================================
  // 🔔 POLL FOR NEW NOTIFICATIONS → Show local notification
  // Works in Expo Go (local schedule, no FCM needed)
  // =====================================================
  const lastDriverNotifIdRef = useRef(null)
  const isDriverNotifFirstLoadRef = useRef(true)

  useEffect(() => {
    if (!isAuthenticated) return

    const pollDriverNotifications = async () => {
      try {
        const token = await AsyncStorage.getItem('token')
        if (!token) return

        const resp = await fetch(`${API_BASE_URL}/notifications/driver?limit=20`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!resp.ok) return

        const json = await resp.json()
        // Backend findDriverNotifications returns { data: [...], total: N }
        const notifications = Array.isArray(json?.data) ? json.data : []
        const unread = notifications.filter(n => !n.isRead)

        if (unread.length > 0) {
          const newest = unread[0]
          if (isDriverNotifFirstLoadRef.current) {
            // Seed on first load — don't show notification
            lastDriverNotifIdRef.current = newest._id
            isDriverNotifFirstLoadRef.current = false
          } else if (newest._id !== lastDriverNotifIdRef.current) {
            lastDriverNotifIdRef.current = newest._id
            showLocalNotification(
              newest.title || 'FireGo',
              newest.message || '',
              { notificationId: newest._id, type: newest.type }
            )
          }
        } else {
          isDriverNotifFirstLoadRef.current = false
        }
      } catch (err) {
        // Silent — don't break app
      }
    }

    // Initial poll + every 30s
    pollDriverNotifications()
    const interval = setInterval(pollDriverNotifications, 30_000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // =====================================================
  // 📞 POLL FOR INCOMING CALL NOTIFICATIONS
  // =====================================================
  const handledCallIdsRef = useRef(new Set())

  useEffect(() => {
    if (!isAuthenticated) return

    let isMounted = true

    const pollCallNotifications = async () => {
      if (!isMounted) return
      try {
        const token = await AsyncStorage.getItem('token')
        if (!token) return

        const resp = await fetch(`${API_BASE_URL}/notifications/driver?type=call_incoming&limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!resp.ok) return

        const json = await resp.json()

        // ✅ FIX: Backend returns { data: [...], total: N }
        // json.data is already the array — NOT json.data.notifications
        const notifications = Array.isArray(json?.data) ? json.data
          : Array.isArray(json?.notifications) ? json.notifications
            : []

        console.log('[App] 📞 Call notifications polled:', notifications.length, 'items (unread:',
          notifications.filter(n => !n.isRead).length, ')')

        for (const notif of notifications) {
          // Skip already-read notifications
          if (notif.isRead) continue

          const callData = notif.data || {}
          const callId = callData.callId
          if (!callId || handledCallIdsRef.current.has(callId)) continue

          // Mark as handled before navigating to prevent duplicate navigation
          handledCallIdsRef.current.add(callId)

          // Mark the notification as read
          try {
            await fetch(`${API_BASE_URL}/notifications/${notif._id}/read`, {
              method: 'PATCH',
              headers: { Authorization: `Bearer ${token}` },
            })
          } catch (_) { }

          console.log('[App] 📞 CALL_INCOMING detected, callId:', callId, 'from callerRole:', callData.callerRole)

          // ✅ Navigate using module-level callNavigationRef (shared with App's NavigationContainer)
          if (callNavigationRef.isReady()) {
            callNavigationRef.navigate('IncomingCall', {
              callId: callData.callId,
              rideId: callData.rideId,
              channelName: callData.channelName,
              receiverToken: callData.receiverToken,
              receiverUid: callData.receiverUid,
              callerName: notif.title || 'Khách hàng',
              callerRole: callData.callerRole || 'customer',
            })
          } else {
            console.warn('[App] 📞 callNavigationRef not ready, cannot navigate to IncomingCall')
          }
          break // Handle one call at a time
        }
      } catch (err) {
        console.warn('[App] ⚠️ Call notification poll error:', err.message)
      }
    }

    // ✅ Poll every 2s (was 3s) + initial poll on mount
    const callPollInterval = setInterval(pollCallNotifications, 2000)
    pollCallNotifications() // Initial poll

    return () => {
      isMounted = false
      clearInterval(callPollInterval)
    }
  }, [isAuthenticated])

  // ⛔ REMOVED: Duplicate polling (5s interval) for rides + deliveries.
  // assignmentRequestPollingService already polls /rides/assignment-requests/pending,
  // /deliveries/assignment-requests/pending, and /combined-trips/driver/:id/pending-requests
  // every 1 second — having a second 5s-interval poller caused race conditions with
  // pausePolling/debounce logic, making the driver wait up to 60s for a request to appear.

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#101922' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen
            name="Main"
            component={HomeStackNavigator}
            options={{ animationEnabled: false }}
          />
          <Stack.Screen
            name="TripActivities"
            component={TripActivities}
            options={{ animationEnabled: true }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ animationEnabled: false }}
          />
          <Stack.Screen
            name="Register"
            component={RegisterScreen}
            options={{ animationEnabled: false }}
          />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ animationEnabled: true }}
          />
        </>
      )}
    </Stack.Navigator>
  )
}

const styles = StyleSheet.create({})

export default function App() {
  // Global state for assignment request modal
  const [assignmentRequest, setAssignmentRequest] = useState(null)
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [countdown, setCountdown] = useState(45)
  const [timeoutSeconds, setTimeoutSeconds] = useState(45)
  // ✅ Reuse the module-level callNavigationRef (already wired into NavigationContainer)
  // This ensures navigate() calls in App() work the same as in RootNavigator
  const navigationRef = callNavigationRef
  const lastRequestIdRef = useRef(null)

  // 🔥 Request queue to prevent modal override
  const [requestQueue, setRequestQueue] = useState([])
  const requestQueueRef = useRef([])
  const currentRequestIdRef = useRef(null) // Ref-based modal lock (avoids stale closure bug)

  // 🛡️ DEBOUNCE: Track recently-closed request IDs to prevent duplicate modals.
  // After a modal closes (timeout/reject/accept), the same requestId is blocked
  // for DEBOUNCE_TTL_MS to prevent the old pending request from re-triggering.
  const recentlyClosedIds = useRef(new Set())
  const DEBOUNCE_TTL_MS = 90_000 // 90 seconds – safely covers any 45s timeout + network delay

  const markRequestClosed = (requestId) => {
    if (!requestId) return
    recentlyClosedIds.current.add(requestId)
    console.log('[App] 🚫 Debounced requestId for 90s:', requestId)
    // Resume polling after 3s delay to let backend finish processing accept/reject
    setTimeout(() => {
      assignmentRequestPollingService.resumePolling()
    }, 3000)
    setTimeout(() => {
      recentlyClosedIds.current.delete(requestId)
      console.log('[App] ✅ Debounce expired for requestId:', requestId)
    }, DEBOUNCE_TTL_MS)
  }

  // ✅ Setup assignment request polling with store subscription
  useEffect(() => {
    let unsubscribe
    let pollingStarted = false

    const startPolling = () => {
      const state = store.getState()
      const user = state.auth.user
      const driverId = user?._id || user?.id

      if (!driverId) {
        console.log('[App] ⏭️ Skip polling - no driverId yet')
        return false
      }

      if (pollingStarted) {
        console.log('[App] ⏭️ Polling already started, skipping')
        return true
      }
      pollingStarted = true

      console.log('[App] 🚀 Starting assignment request polling with driverId:', driverId)

      // ✅ CRITICAL: START the polling service (rides + deliveries + combined trips)
      // Polls all 3 endpoints every 1s — this is the SINGLE source of truth for requests.
      assignmentRequestPollingService.startPolling((request) => {
        console.log('[App] 📬 [PollingService] Request received:', request._id, request.type)
        if (window && window.__firegoAssignmentCallback) {
          window.__firegoAssignmentCallback({
            ...request,
            type: request.type || 'rideshare',
          })
        }
      }, driverId)

      // Register global callback for pollPendingRequests (rides + delivery)
      window.__firegoAssignmentCallback = (request) => {
        // 🛡️ DEBOUNCE: Block recently-closed requestIds to prevent re-triggering
        if (recentlyClosedIds.current.has(request._id)) {
          console.log('[App] 🚫 Debounced – requestId recently closed, skipping:', request._id)
          return
        }

        // ✅ Check if this is a NEW request (different from last one)
        // NOTE: Do NOT set lastRequestIdRef here — set it only AFTER we confirm
        // the modal is free. Setting it early caused a race: the ref was updated
        // even when the modal was busy, so the next poll treated the same request
        // as "already seen" and skipped it.
        const isNewRequest = lastRequestIdRef.current !== request._id

        // 🔥 Check if rideId is a POPULATED OBJECT with distance/duration
        const rideHasFullData = request.rideId && typeof request.rideId === 'object' &&
          request.rideId.distance !== undefined && request.rideId.duration !== undefined

        // 🔥 Check if deliveryId is a POPULATED OBJECT with distance/duration
        const deliveryHasFullData = request.deliveryId && typeof request.deliveryId === 'object' &&
          request.deliveryId.distance !== undefined && request.deliveryId.duration !== undefined

        console.log('[App] 🔍 rideHasFullData:', rideHasFullData, 'rideId type:', typeof request.rideId)
        console.log('[App] 🔍 deliveryHasFullData:', deliveryHasFullData, 'deliveryId type:', typeof request.deliveryId)

        // 🔥 CRITICAL: Use ref (not state) to check if modal is busy.
        // State variables inside this closure are stale (captured at registration time).
        // currentRequestIdRef.current is always up-to-date.
        if (currentRequestIdRef.current !== null) {
          // Same request is already showing — skip (happens when polling fires again)
          if (currentRequestIdRef.current === request._id) {
            console.log('[App] ℹ️ Same request already showing, skipping:', request._id)
            return
          }

          console.log('[App] 🚦 Modal busy, queuing request:', {
            currentRequestId: currentRequestIdRef.current,
            newRequestId: request._id,
            queueLength: requestQueueRef.current.length,
          })

          // Avoid duplicates in queue
          const alreadyInQueue = requestQueueRef.current.some(r => r._id === request._id)
          if (!alreadyInQueue) {
            requestQueueRef.current.push(request)
            setRequestQueue([...requestQueueRef.current])
            console.log('[App] ✅ Queued. Queue length:', requestQueueRef.current.length)
          } else {
            console.log('[App] ⚠️ Already in queue, skipping duplicate')
          }
          return
        }

        // Modal free — show immediately, lock with ref, and pause polling to prevent race condition
        console.log('[App] 📬 Showing request immediately (modal free)')
        currentRequestIdRef.current = request._id
        assignmentRequestPollingService.pausePolling() // 🛑 Pause while modal is active
        setAssignmentRequest(request)
        setShowAssignmentModal(true)

        // ✅ ONLY reset countdown for NEW requests, not for updates
        if (isNewRequest) {
          // Parse timeoutMs from request (default to 45000ms = 45s)
          const timeoutMs = request.timeoutMs || 45000
          const timeoutSec = Math.ceil(timeoutMs / 1000)
          console.log('[App] ✅ New request, setting countdown to', timeoutSec, 'seconds (timeout:', timeoutMs, 'ms)')
          setCountdown(timeoutSec)
          setTimeoutSeconds(timeoutSec)

          // If rideId already populated with distance/duration, use it immediately
          if (request.type === 'ride' && rideHasFullData) {
            console.log('[App] ✅ Using populated ride data immediately:', {
              distance: request.rideId.distance,
              duration: request.rideId.duration,
              fare: request.totalFare || request.fare || request.rideId.totalFare,
              pickupAddress: request.pickupAddress || request.rideId.pickupAddress,
              dropoffAddress: request.dropoffAddress || request.rideId.dropoffAddress,
            })
            const updatedRequest = {
              ...prev,
              distance: request.rideId.distance || 0,
              duration: request.rideId.duration || 0,
              // ✅ Ưu tiên fare từ request (khách hàng), không phải từ rideId (tài xế)
              fare: request.totalFare || request.fare || request.rideId.totalFare || 0,
              totalFare: request.totalFare || request.fare || request.rideId.totalFare || 0,
              // ✅ Ưu tiên địa chỉ từ request (khách hàng), không phải từ rideId (tài xế)
              pickupAddress: request.pickupAddress || request.rideId.pickupAddress || 'Địa điểm đón',
              dropoffAddress: request.dropoffAddress || request.rideId.dropoffAddress || 'Địa điểm đến',
              pickupCoordinates: request.pickupCoordinates || request.rideId.pickupCoordinates || prev.pickupCoordinates,
              dropoffCoordinates: request.dropoffCoordinates || request.rideId.dropoffCoordinates || prev.dropoffCoordinates,
            }
            console.log('[App] 📦 Initial request data (ride):', {
              pickupAddress: updatedRequest.pickupAddress?.substring(0, 50),
              dropoffAddress: updatedRequest.dropoffAddress?.substring(0, 50),
              fare: updatedRequest.fare,
              source: 'populated rideId'
            })
            setAssignmentRequest(updatedRequest)
            return
          }

          // ============ HELPER: Parse distance/duration from various formats ============
          const parseDistance = (val) => {
            if (typeof val === 'number') return val
            if (!val) return 0
            // Handle "5.2 km" → 5.2
            const numStr = String(val).replace(/[^\d.]/g, '')
            const parsed = parseFloat(numStr)
            return isNaN(parsed) ? 0 : Math.round(parsed * 10) / 10 // Round to 1 decimal
          }

          const parseDuration = (val) => {
            if (typeof val === 'number') return val
            if (!val) return 0
            // Handle "15 phút" → 15
            const numStr = String(val).replace(/[^\d]/g, '')
            const parsed = parseInt(numStr)
            return isNaN(parsed) ? 0 : parsed
          }
          // ============ END HELPER ============

          // If deliveryId already populated with distance/duration/fee, use it immediately
          if (request.type === 'delivery' && deliveryHasFullData) {
            console.log('[App] ✅ Using populated delivery data immediately:', {
              distance: request.deliveryId.distance,
              duration: request.deliveryId.duration,
              fare: request.totalFare || request.deliveryId.estimatedPrice,
              pickupAddress: request.pickupAddress || request.deliveryId.pickupAddress,
              dropoffAddress: request.dropoffAddress || request.deliveryId.dropoffAddress,
              distanceParsed: parseDistance(request.deliveryId.distance),
              durationParsed: parseDuration(request.deliveryId.duration),
            })
            const updatedRequest = {
              ...prev,
              distance: parseDistance(request.deliveryId.distance),
              duration: parseDuration(request.deliveryId.duration),
              // ✅ Ưu tiên fare từ request (khách hàng), không phải từ deliveryId
              fare: request.totalFare || request.fare || request.deliveryId.estimatedPrice || 0,
              totalFare: request.totalFare || request.fare || request.deliveryId.estimatedPrice || 0,
              // ✅ Ưu tiên địa chỉ từ request (khách hàng), không phải từ deliveryId
              pickupAddress: request.pickupAddress || request.deliveryId.pickupAddress || 'Lấy hàng',
              dropoffAddress: request.dropoffAddress || request.deliveryId.dropoffAddress || 'Giao hàng',
              pickupCoordinates: request.pickupCoordinates || request.deliveryId.pickupCoordinates || prev.pickupCoordinates,
              dropoffCoordinates: request.dropoffCoordinates || request.deliveryId.dropoffCoordinates || prev.dropoffCoordinates,
            }
            console.log('[App] 📦 Initial request data (delivery):', {
              pickupAddress: updatedRequest.pickupAddress?.substring(0, 50),
              dropoffAddress: updatedRequest.dropoffAddress?.substring(0, 50),
              fare: updatedRequest.fare,
              source: 'populated deliveryId'
            })
            setAssignmentRequest(updatedRequest)
            return
          }

          // ✅ For combined trips, fetch full data to get distance, duration
          if (request.combinedTripId && request.type === 'rideshare') {
            // ✅ FIX: Extract string ID from combinedTripId (may be ObjectId object or populated object)
            const combinedTripIdStr = typeof request.combinedTripId === 'object'
              ? (request.combinedTripId._id?.toString() || request.combinedTripId.toString())
              : request.combinedTripId
            console.log('[App] 📡 Fetching full combined trip data, id:', combinedTripIdStr, '(raw type:', typeof request.combinedTripId, ')')
            fetchFullRequestData(combinedTripIdStr, request._id, 'combined_trip')
          } else if (request.type === 'ride') {
            // ✅ For regular rides, only fetch if rideId is just an ID string
            if (request.rideId && typeof request.rideId === 'string') {
              console.log('[App] 📡 Fetching full ride data (rideId is string)...')
              fetchFullRequestData(request.rideId, request._id, 'ride')
            } else if (request.rideId && typeof request.rideId === 'object' && !rideHasFullData) {
              // rideId is a partial object, try to fetch using its _id
              const rideId = request.rideId._id || request.rideId
              if (rideId && typeof rideId === 'string') {
                console.log('[App] 📡 Fetching full ride data (partial object)...')
                fetchFullRequestData(rideId, request._id, 'ride')
              }
            }
          } else if (request.type === 'delivery') {
            // ✅ For delivery, only fetch if deliveryId is just an ID string
            if (request.deliveryId && typeof request.deliveryId === 'string') {
              console.log('[App] 📡 Fetching full delivery data (deliveryId is string)...')
              fetchFullRequestData(request.deliveryId, request._id, 'delivery')
            } else if (request.deliveryId && typeof request.deliveryId === 'object' && !deliveryHasFullData) {
              // deliveryId is a partial object, try to fetch using its _id
              const deliveryId = request.deliveryId._id || request.deliveryId
              console.log('[App] 📡 Delivery populated but missing full data, fetching...')
              console.log('[App] 📡 deliveryId._id:', deliveryId)
              console.log('[App] 📡 Current deliveryId object:', request.deliveryId)
              if (deliveryId && typeof deliveryId === 'string') {
                console.log('[App] 📡 Fetching full delivery data (partial object)...')
                fetchFullRequestData(deliveryId, request._id, 'delivery')
              }
            }
          }

          // Play notification sound only for new requests
          playNotificationSound()
        } else {
          console.log('[App] ℹ️ Same request update, keeping countdown')
        }
      }
    }

    // Helper to fetch full request data with trip details
    const fetchFullRequestData = async (dataId, requestId, dataType = 'combined_trip') => {
      try {
        // ✅ Safety: always convert dataId to string (guard against ObjectId objects)
        const safeDataId = dataId && typeof dataId === 'object'
          ? (dataId._id?.toString() || dataId.toString())
          : String(dataId || '')

        if (!safeDataId || safeDataId === 'undefined' || safeDataId === '[object Object]') {
          console.error('[App] ❌ Invalid dataId for fetchFullRequestData:', dataId)
          return
        }

        const token = await AsyncStorage.getItem('token')
        if (!token) {
          console.error('[App] ❌ No token available for fetch')
          return
        }

        let endpoint = ''
        if (dataType === 'combined_trip') {
          endpoint = `${API_BASE_URL}/combined-trips/${safeDataId}`
          console.log('[App] 📡 Fetching full combined trip data for:', safeDataId)
        } else if (dataType === 'ride') {
          endpoint = `${API_BASE_URL}/rides/${dataId}`
          console.log('[App] 📡 Fetching full ride data for:', dataId)
        } else if (dataType === 'delivery') {
          endpoint = `${API_BASE_URL}/deliveries/${dataId}`
          console.log('[App] 📡 Fetching full delivery data for:', dataId)
        }

        console.log('[App] 🔗 Fetch endpoint:', endpoint)

        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        })

        console.log('[App] 📥 Response status:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('[App] ❌ Failed to fetch data (HTTP ' + response.status + '):', errorText.substring(0, 200))
          return
        }

        const data = await response.json()
        console.log('[App] ✅ Data fetched successfully')

        // Extract relevant fields based on type
        let pickupAddress = ''
        let dropoffAddress = ''
        let distance = 0
        let duration = 0
        let fare = 0

        // ============ HELPER: Parse distance/duration from various formats ============
        const parseDistance = (val) => {
          if (typeof val === 'number') return val
          if (!val) return 0
          // Handle "5.2 km" → 5.2
          const numStr = String(val).replace(/[^\d.]/g, '')
          const parsed = parseFloat(numStr)
          return isNaN(parsed) ? 0 : Math.round(parsed * 10) / 10 // Round to 1 decimal
        }

        const parseDuration = (val) => {
          if (typeof val === 'number') return val
          if (!val) return 0
          // Handle "15 phút" → 15
          const numStr = String(val).replace(/[^\d]/g, '')
          const parsed = parseInt(numStr)
          return isNaN(parsed) ? 0 : parsed
        }
        // ============ END HELPER ============

        if (dataType === 'combined_trip') {
          pickupAddress = data.pickupAddress || 'N/A'
          dropoffAddress = data.dropoffAddress || 'N/A'
          distance = parseDistance(data.distance)
          duration = parseDuration(data.duration)
          // ⭐ CRITICAL FIX: KHÔNG lấy fare từ combined trip (totalFare là giá tài xế tạo)
          // fare sẽ được lấy từ request.fare (giá khách hàng gửi) trong modal
          fare = 0 // DO NOT use data.totalFare - it's driver's initial price, not customer's price
          console.log('[App] ⚠️ Combined trip: NOT using totalFare from trip, will use request.fare from RideRequest')
        } else if (dataType === 'ride') {
          pickupAddress = data.pickupAddress || 'N/A'
          dropoffAddress = data.dropoffAddress || 'N/A'
          distance = parseDistance(data.distance)
          duration = parseDuration(data.duration)  // ✅ Ride schema uses 'duration', not 'estimatedDuration'
          fare = data.totalFare || 0
        } else if (dataType === 'delivery') {
          pickupAddress = data.pickupAddress || 'N/A'
          dropoffAddress = data.dropoffAddress || 'N/A'
          distance = parseDistance(data.distance)
          duration = parseDuration(data.duration)
          fare = data.estimatedPrice || 0
        }

        console.log('[App] ✅ Data extracted:', {
          distance,
          duration,
          fare,
          pickupAddress: pickupAddress.substring(0, 30) + '...',
          dropoffAddress: dropoffAddress.substring(0, 30) + '...',
          note: 'These are from trip object (driver created), will be overridden by request addresses (customer sent)'
        })

        // 🔥 DEBUG: Log raw values
        console.log('[App] 🔍 RAW distance:', distance, 'type:', typeof distance)
        console.log('[App] 🔍 RAW duration:', duration, 'type:', typeof duration)
        console.log('[App] 🔍 RAW fare:', fare, 'type:', typeof fare)

        // ✅ Update request with full data
        setAssignmentRequest(prev => {
          if (!prev) {
            console.warn('[App] ⚠️ Previous request state is null, cannot update')
            return prev
          }

          // ⭐ CRITICAL: For combined trips, preserve original request.fare (customer's price)
          // DO NOT overwrite with totalFare from trip (driver's initial price)
          const updatedData = {
            ...prev,
            distance,
            duration,
            // ✅ GIỮ NGUYÊN địa chỉ từ request (khách hàng), KHÔNG ghi đè bằng địa chỉ từ trip (tài xế)
            pickupAddress: prev.pickupAddress || pickupAddress,
            dropoffAddress: prev.dropoffAddress || dropoffAddress,
            combinedTripId: dataType === 'combined_trip' ? dataId : prev.combinedTripId,
            rideId: dataType === 'ride' ? dataId : prev.rideId,
            deliveryId: dataType === 'delivery' ? dataId : prev.deliveryId,
            // Also add coordinates for modal display (ưu tiên từ prev nếu đã có)
            pickupCoordinates: prev.pickupCoordinates || data.pickupLocation?.coordinates || data.pickupCoordinates,
            dropoffCoordinates: prev.dropoffCoordinates || data.deliveryLocation?.coordinates || data.deliveryCoordinates || data.dropoffLocation?.coordinates || data.dropoffCoordinates,
          }

          // ONLY update fare for regular rides/delivery, NOT for combined trips
          if (dataType !== 'combined_trip') {
            updatedData.fare = fare
            console.log('[App] ✅ Updated fare for', dataType, ':', fare)
          } else {
            console.log('[App] ⚠️ Preserved original request.fare for combined trip:', prev.fare)
          }

          console.log('[App] 📦 Final updated request data:', {
            pickupAddress: updatedData.pickupAddress?.substring(0, 50),
            dropoffAddress: updatedData.dropoffAddress?.substring(0, 50),
            fare: updatedData.fare,
            distance: updatedData.distance,
            duration: updatedData.duration,
            source: 'fetchFullRequestData'
          })

          return updatedData
        })

        console.log('[App] ✅ State updated with full data')
      } catch (error) {
        console.error('[App] ❌ Error fetching data:', error.message)
        console.error('[App] ❌ Error stack:', error.stack?.substring(0, 200))
      }
    }

    // Subscribe to store changes to start polling when user logs in.
    // Uses `pollingStarted` flag (local variable, always current) instead of
    // state-based conditions that would be stale inside the closure.
    unsubscribe = store.subscribe(() => {
      const newUser = store.getState().auth.user
      if (newUser && !pollingStarted) {
        // User just became available — start polling if not yet started
        startPolling()
      }
    })

    // Start immediately if user is already logged in
    const initialUser = store.getState().auth.user
    if (initialUser) {
      startPolling()
    }

    return () => {
      if (unsubscribe) unsubscribe()
      console.log('[App] 🛑 Stopping assignment request polling')
      assignmentRequestPollingService.stopPolling()
    }
  }, [])

  // 🔥 Helper function to show next request from queue
  const showNextRequest = () => {
    if (requestQueueRef.current.length === 0) {
      console.log('[App] 📭 Queue is empty, no more requests')
      return
    }

    const nextRequest = requestQueueRef.current.shift() // Remove first item
    setRequestQueue([...requestQueueRef.current]) // Update state

    console.log('[App] 📬 Showing next request from queue:', {
      requestId: nextRequest._id,
      queueLength: requestQueueRef.current.length,
      type: nextRequest.type
    })

    // Show modal with next request
    setAssignmentRequest(nextRequest)
    setShowAssignmentModal(true)

    // Lock modal with next request ref
    currentRequestIdRef.current = nextRequest._id

    // Set countdown for this request
    const timeoutMs = nextRequest.timeoutMs || (
      nextRequest.expiresAt
        ? Math.max(1000, new Date(nextRequest.expiresAt).getTime() - Date.now())
        : 45000
    )
    const timeoutSec = Math.ceil(timeoutMs / 1000)
    setCountdown(timeoutSec)
    setTimeoutSeconds(timeoutSec)

    // Update last request ID
    lastRequestIdRef.current = nextRequest._id
  }

  // Countdown timer
  useEffect(() => {
    if (!showAssignmentModal) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // ✅ Countdown reached 0: close modal only. DO NOT call reject API.
          // The backend timeout checker owns the status transition to 'timeout'.
          // Calling reject here would overwrite 'accepted' → 'rejected' in a race.
          console.log('[App] ⏰ Countdown 0 – closing modal (backend owns timeout status)')
          const closedId = currentRequestIdRef.current
          currentRequestIdRef.current = null
          markRequestClosed(closedId) // 🛡️ Debounce for 90s
          setShowAssignmentModal(false)
          setAssignmentRequest(null)
          setCountdown(45)
          showNextRequest()
          return 45
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showAssignmentModal])

  const playNotificationSound = () => {
    // ✅ Use Vibration (no expo-av dependency needed)
    // Pattern: [wait, vibrate, pause, vibrate, pause, vibrate]
    try {
      Vibration.vibrate([0, 300, 200, 300, 200, 300])
    } catch (e) {
      console.log('Vibration error:', e)
    }
  }

  const handleAcceptAssignment = async () => {
    if (!assignmentRequest) return

    // ✅ Check if request is already expired
    if (assignmentRequest.status === 'timeout' || assignmentRequest.status !== 'pending') {
      console.warn('[App] ⚠️ Request already expired or rejected, skipping accept')
      const closedId = currentRequestIdRef.current
      currentRequestIdRef.current = null
      markRequestClosed(closedId)
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
      Alert.alert('Yêu cầu hết hạn', 'Yêu cầu này đã hết hạn, vui lòng chờ yêu cầu tiếp theo')
      showNextRequest()
      return
    }

    try {
      // 💰 Check wallet balance BEFORE accepting
      console.log('[App] 💰 Checking driver wallet balance...')
      const driverProfile = await driverService.getProfile()
      const walletBalance = driverProfile?.walletBalance || 0

      // 💰 Fetch pricing config to get driverShare percentage
      const pricingConfigResponse = await axios.get(`${API_BASE_URL}/pricing/config`)
      const pricingConfig = pricingConfigResponse.data
      const driverShare = pricingConfig?.driverShare || 85 // Default 85% for driver (15% for app)

      // 💰 Calculate app fee = totalFare * (100 - driverShare) / 100
      const totalFare = assignmentRequest.fare || assignmentRequest.totalFare || 0
      const appFee = Math.round((totalFare * (100 - driverShare)) / 100)

      console.log('[App] 💰 Balance check details:', {
        walletBalance,
        totalFare,
        driverShare: `${driverShare}%`,
        appFee,
        driverEarnings: totalFare - appFee,
        hasEnoughBalance: walletBalance >= appFee,
      })

      // ⭐ CRITICAL: Check if balance >= app fee (not total fare)
      if (walletBalance < appFee) {
        console.warn('[App] ⚠️ Wallet balance too low for app fee:', {
          balance: walletBalance,
          appFee,
          shortage: appFee - walletBalance,
        })
        Alert.alert(
          'Số dư ví không đủ',
          `Số dư ví của bạn là ${walletBalance.toLocaleString('vi-VN')}đ, không đủ để nhận cuốc này (cần ${appFee.toLocaleString('vi-VN')}đ). Vui lòng nạp tiền để tiếp tục.`,
          [
            {
              text: 'Nạp tiền',
              onPress: () => {
                callNavigationRef.navigate('Wallet')
              },
            },
            {
              text: 'Để sau',
              onPress: () => {
                currentRequestIdRef.current = null
                setShowAssignmentModal(false)
                setAssignmentRequest(null)
                setCountdown(45)
                showNextRequest() // 🔥 Show next request from queue
              },
            },
          ]
        )
        return
      }

      const requestType = assignmentRequest.type || 'ride'
      // ✅ SAVE fallback IDs BEFORE clearing state
      const tripId = assignmentRequest.combinedTripId?._id || assignmentRequest.combinedTripId
      const fallbackRideId = assignmentRequest.rideId?._id || assignmentRequest.rideId
      const fallbackDeliveryId = assignmentRequest.deliveryId?._id || assignmentRequest.deliveryId

      // 🔥 CRITICAL: Check trip status from backend BEFORE accepting
      console.log('[App] 🔍 Checking trip status before accept...', {
        type: requestType,
        tripId,
        rideId: fallbackRideId,
        deliveryId: fallbackDeliveryId,
      })

      const statusCheck = await assignmentRequestPollingService.checkTripStatus(
        requestType,
        tripId,
        fallbackRideId,
        fallbackDeliveryId
      )

      console.log('[App] 🔍 Status check result:', statusCheck)

      if (!statusCheck.valid) {
        console.error('[App] ⛔ Cannot accept: Trip status invalid:', statusCheck)

        // 🔥 CRITICAL: Auto-reject the request to prevent it from showing again
        console.log('[App] 🗑️ Auto-rejecting invalid request to prevent re-showing...')
        try {
          await assignmentRequestPollingService.rejectRequest(
            assignmentRequest._id,
            requestType,
            tripId,
            `Auto-rejected: ${statusCheck.message || 'Invalid status'}`
          )
          console.log('[App] ✅ Request auto-rejected successfully')
        } catch (rejectError) {
          console.error('[App] ⚠️ Failed to auto-reject, but continuing...', rejectError)
        }

        Alert.alert(
          'Không thể nhận cuốc',
          statusCheck.message || 'Chuyến đi không khả dụng. Vui lòng thử lại.',
          [{ text: 'Đóng' }]
        )
        currentRequestIdRef.current = null
        setShowAssignmentModal(false)
        setAssignmentRequest(null)
        setCountdown(45)
        showNextRequest() // 🔥 Show next request from queue
        return
      }

      console.log('[App] ✅ Status valid, proceeding to accept:', statusCheck.status)

      console.log('[App] ✅ Accepting assignment request:', {
        requestId: assignmentRequest._id,
        type: requestType,
        tripId: tripId
      })

      const result = await assignmentRequestPollingService.acceptRequest(
        assignmentRequest._id,
        requestType,
        tripId // ✅ Pass combinedTripId for rideshare requests
      )

      console.log('[App] ✅ Request accepted successfully:', result)

      // ✅ Determine navigation ID BEFORE clearing state
      let navigationId = result?._id

      if (requestType === 'delivery') {
        navigationId = navigationId || fallbackDeliveryId
      } else if (requestType === 'rideshare') {
        navigationId = navigationId || tripId
      } else {
        navigationId = navigationId || fallbackRideId
      }

      // NOW close modal and reset state
      const closedId = currentRequestIdRef.current
      currentRequestIdRef.current = null
      markRequestClosed(closedId) // 🛡️ Debounce RideRequest ID for 90s

      // ✅ NOTE: Do NOT debounce combinedTripId for rideshare trips.
      // Unlike regular rides, a driver can accept multiple customers joining the same shared trip.
      // Debouncing the tripId would block new passenger join requests from showing up.
      // The RideRequest ID debounce (above) is sufficient to prevent duplicate modals for the same request.
      if (requestType === 'rideshare' && tripId) {
        console.log('[App] ℹ️ Rideshare: NOT debouncing combinedTripId (allows more passengers to join):', tripId)
      }

      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
      showNextRequest()


      // Navigate based on type
      if (!callNavigationRef.isReady()) {
        console.error('[App] ❌ navigationRef not ready')
        return
      }

      if (requestType === 'delivery') {
        console.log('[App] 🚀 Navigating to ActiveDelivery with id:', navigationId)
        callNavigationRef.navigate('ActiveDelivery', { deliveryId: navigationId })
        Alert.alert('Thành công', 'Bạn đã nhận đơn giao hàng!')
      } else if (requestType === 'rideshare') {
        console.log('[App] 🚀 Navigating to ActiveRideScreen with combinedTripId:', navigationId)
        callNavigationRef.navigate('ActiveRideScreen', {
          combinedTripId: navigationId, // ✅ Chỉ truyền combinedTripId cho rideshare
          sourceType: 'combined_trip',
        })
        Alert.alert('Thành công', 'Bạn đã nhận chuyến ghép!')
      } else {
        console.log('[App] 🚀 Navigating to TripActivities with rideId:', navigationId)
        callNavigationRef.navigate('TripActivities', { rideId: navigationId })
        Alert.alert('Thành công', 'Bạn đã nhận cuốc xe!')
      }
    } catch (error) {
      console.error('[App] ❌ Error accepting assignment:', error)
      console.error('[App] ❌ Error message:', error?.message)

      // 🔥 CRITICAL: Auto-reject the request to prevent it from showing again
      console.log('[App] 🗑️ Auto-rejecting failed request to prevent re-showing...')
      try {
        const requestType = assignmentRequest?.type || 'ride'
        const tripId = assignmentRequest?.combinedTripId?._id || assignmentRequest?.combinedTripId

        await assignmentRequestPollingService.rejectRequest(
          assignmentRequest._id,
          requestType,
          tripId,
          `Auto-rejected: Accept failed - ${error?.message || 'Unknown error'}`
        )
        console.log('[App] ✅ Failed request auto-rejected successfully')
      } catch (rejectError) {
        console.error('[App] ⚠️ Failed to auto-reject after error, but continuing...', rejectError)
      }

      // ✅ Close modal anyway on error
      const closedId2 = currentRequestIdRef.current
      currentRequestIdRef.current = null
      markRequestClosed(closedId2) // 🛡️ Debounce for 90s
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
      showNextRequest()
      Alert.alert('Lỗi', error?.message || 'Không thể nhận yêu cầu')
    }
  }

  const handleRejectAssignment = async () => {
    if (!assignmentRequest) {
      console.warn('[App] ⚠️ No assignment request to reject')
      return
    }

    // ✅ Check if request is already expired
    if (assignmentRequest.status === 'timeout' || assignmentRequest.status !== 'pending') {
      console.warn('[App] ⚠️ Request already expired or rejected, skipping reject')
      const closedId = currentRequestIdRef.current
      currentRequestIdRef.current = null
      markRequestClosed(closedId)
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
      Alert.alert('Yêu cầu hết hạn', 'Yêu cầu này đã hết hạn')
      showNextRequest()
      return
    }

    try {
      const requestType = assignmentRequest.type || 'ride'
      const tripId = assignmentRequest.combinedTripId?._id || assignmentRequest.combinedTripId

      console.log('[App] ❌ Rejecting assignment request:', {
        requestId: assignmentRequest._id,
        type: requestType,
        tripId: tripId,
        status: assignmentRequest.status,
        timestamp: new Date().toISOString(),
      })

      await assignmentRequestPollingService.rejectRequest(
        assignmentRequest._id,
        requestType,
        tripId,
        'Driver rejected'
      )

      console.log('[App] ✅ Request rejected successfully')

      // Close modal and reset state
      const closedId = currentRequestIdRef.current
      currentRequestIdRef.current = null
      markRequestClosed(closedId) // 🛡️ Debounce for 90s
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
      showNextRequest()
      Alert.alert('Thành công', 'Bạn đã từ chối yêu cầu này')
    } catch (error) {
      console.error('[App] ❌ Error rejecting assignment:', error)
      console.error('[App] ❌ Error message:', error?.message)
      console.error('[App] ❌ Error stack:', error?.stack?.substring(0, 300))

      // ✅ Close modal anyway on error
      const closedId3 = currentRequestIdRef.current
      currentRequestIdRef.current = null
      markRequestClosed(closedId3) // 🛡️ Debounce for 90s
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
      showNextRequest()
      Alert.alert('Lỗi', error?.message || 'Không thể từ chối yêu cầu')
    }
  }

  return (
    <Provider store={store}>
      <NavigationContainer ref={callNavigationRef}>
        <RootNavigator />

        {/* Global Assignment Request Modal */}
        <AssignmentRequestModal
          visible={showAssignmentModal}
          request={assignmentRequest}
          onAccept={handleAcceptAssignment}
          onReject={handleRejectAssignment}
          countdown={countdown}
          timeoutSeconds={timeoutSeconds}
          driverTypes={store.getState().auth.user?.driverTypes || ['rideshare']}
        />
      </NavigationContainer>
    </Provider>
  )
}