import React, { useEffect, useState, useRef } from 'react'
import { StyleSheet, ActivityIndicator, View, Alert, AppState } from 'react-native'
import { Audio } from 'expo-av'
import 'react-native-gesture-handler'
import { NavigationContainer } from '@react-navigation/native'
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
import ActiveRideScreen from './src/screens/ActiveRideScreen'
import RideRequestsScreen from './src/screens/RideRequestsScreen'
import TopupScreen from './src/screens/TopupScreen'
import WithdrawalScreen from './src/screens/WithdrawalScreen'
import PaymentWebViewScreen from './src/screens/PaymentWebViewScreen'
import MapScreen from './src/screens/MapScreen'
import CreateRideScreen from './src/screens/CreateRideScreen'
import TripActivities from './src/screens/TripActivities'
import DeliveryRequestsScreen from './src/screens/DeliveryRequestsScreen'
import ActiveDeliveryScreen from './src/screens/ActiveDeliveryScreen'
import ChatScreen from './src/screens/ChatScreen'
import NotificationScreen from './src/screens/Notification'
import NotificationDetailScreen from './src/screens/NotificationDetail'
//


//
const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

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
          iconName = 'local-taxi'
        } else if (route.name === 'Earnings') {
          iconName = 'attach-money'
        } else if (route.name === 'Profile') {
          iconName = 'person'
        }

        return <MaterialIcons name={iconName} size={size} color={color} />
      },
      tabBarActiveTintColor: COLORS.primary,
      tabBarInactiveTintColor: COLORS.textSecondary,
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
        component={WithdrawalScreen}
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
    </Stack.Navigator>
  )
}

const RootNavigator = () => {
  const dispatch = useDispatch()
  const { isAuthenticated, user } = useSelector((state) => state.auth)
  const [isLoading, setIsLoading] = React.useState(true)

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        console.log('[App] ===== CHECKING AUTH ON APP START =====')
        const token = await AsyncStorage.getItem('token')
        console.log('[App] Token exists:', !!token)
        console.log('[App] Token value:', token ? `${token.substring(0, 30)}...` : 'null')
        
        if (token) {
          // Get user profile using token
          const authService = require('./src/services/authService')
          try {
console.log('[App] Fetching user profile with token...')
            const user = await authService.getCurrentUser()
            console.log('[App] User restored successfully:', user ? `${user.email || user.phone}` : 'null')
            
            if (user) {
              // Restore auth state
              console.log('[App] Dispatching loginSuccess to restore session')
              dispatch(loginSuccess({ token, user }))
              
              // Wait a bit for Redux to update, then set driver online
              // Use setTimeout to ensure token is available in interceptor
              setTimeout(async () => {
                console.log('[App] Setting driver online status on app start...')
                try {
                  await driverService.setOnlineStatus(true)
                  console.log('[App] ✅ Driver is now online')
                } catch (error) {
                  console.error('[App] ❌ Failed to set online status:', error)
                  if (error.response) {
                    console.error('[App] Error response:', error.response.status, error.response.data)
                  }
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
      
      if (nextAppState === 'active') {
        // App came to foreground - set driver online
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
    // This ensures we always have a heartbeat within the 2-minute timeout
    const heartbeatInterval = setInterval(async () => {
      try {
        await driverService.sendHeartbeat()
        console.log('[App] 💓 Heartbeat sent')
      } catch (error) {
        console.error('[App] ❌ Heartbeat failed:', error.message)
      }
    }, 15 * 1000) // Every 15 seconds

    // Cleanup: Set offline when component unmounts (app closes)
    return () => {
      subscription.remove()
      clearInterval(heartbeatInterval)
      
      // Important: Set driver offline when app is closed/killed
      console.log('[App] App is unmounting, setting driver offline...')
      driverService.setOnlineStatus(false).catch((error) => {
        console.error('[App] ❌ Failed to set offline on unmount:', error.message)
      })
    }
  }, [isAuthenticated])

  // Global polling for pending requests (runs on all screens)
  useEffect(() => {
    if (!isAuthenticated) return

    console.log('[App] 📬 Starting global pending requests polling...')
    let isMounted = true

    const pollPendingRequests = async () => {
      console.log('🔥 POLLING START - Code version: 3.0 (combined + regular rides)')
      console.log('👤 User from Redux:', user?.id || 'NULL')
      
      try {
        const API_URL = 'http://192.168.1.18:3000/api'
        const token = await AsyncStorage.getItem('token')
        if (!token) {
          console.warn('[App] ⚠️ No auth token, skipping poll')
          return
        }

        // ============================================================
        // 1️⃣ POLL FOR REGULAR RIDE ASSIGNMENT REQUESTS (lái xe hộ)
        // ============================================================
        try {
          console.log('[App] 🔄 Polling regular rides assignment requests...')
          const rideResponse = await fetch(`${API_URL}/rides/assignment-requests/pending`, {
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })

          if (rideResponse.ok) {
            const rideRequests = await rideResponse.json()
            console.log('[App] 📦 Regular ride requests found:', rideRequests.length)

            if (rideRequests && rideRequests.length > 0) {
              const firstRequest = rideRequests[0]
              console.log('[App] 📬 Found regular ride request:', firstRequest._id)

              if (window && window.__firegoAssignmentCallback) {
                console.log('[App] 🔥 Full rideId object:', firstRequest.rideId)
                window.__firegoAssignmentCallback({
                  ...firstRequest,
                  type: 'ride', // ✅ Mark as regular ride
                  rideId: firstRequest.rideId, // ✅ Pass full populated object (not just ID)
                })
              }
            }
          } else {
            console.warn('[App] ⚠️ Failed to fetch ride requests:', rideResponse.status)
          }
        } catch (error) {
          console.error('[App] ❌ Error polling regular rides:', error)
        }

        // ============================================================
        // 2️⃣ POLL FOR COMBINED TRIP ASSIGNMENT REQUESTS (ghép xe)
        // ============================================================
        const allCombinedTrips = await driverService.getMyCombinedTrips()
        console.log('🚗 My trips count:', allCombinedTrips.length)

        for (const trip of allCombinedTrips) {
          if (!isMounted) return

          try {
            const driverId = user?.id
            const endpoint = driverId 
              ? `${API_URL}/combined-trips/${trip._id}/requests?driverId=${driverId}`
              : `${API_URL}/combined-trips/${trip._id}/requests`
            
            console.log('[App] 🔗 Polling combined trip endpoint:', endpoint)
            
            const response = await fetch(endpoint, {
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            })

            console.log('[App] 📡 Response status:', response.status)
            
            if (!response.ok) {
              console.warn('[App] ⚠️ Response not OK, skipping...')
              continue
            }

            const requests = await response.json()
            console.log('[App] 📦 Combined trip raw response:', requests.length, 'requests')

            const pendingRequests = (requests || []).filter(req => req.status === 'pending')
            console.log('[App] ✅ Combined trip pending:', pendingRequests.length)

            if (pendingRequests && pendingRequests.length > 0) {
              const firstRequest = pendingRequests[0]
              console.log('[App] 📬 Found combined trip request:', firstRequest._id)

              if (window && window.__firegoAssignmentCallback) {
                window.__firegoAssignmentCallback({
                  ...firstRequest,
                  type: 'rideshare', // ✅ Mark as combined trip
                  combinedTripId: trip._id,
                })
              }
            }
          } catch (error) {
            console.error('[App] ❌ Error polling combined trip:', error)
          }
        }

        // ============================================================
        // 3️⃣ POLL FOR DELIVERY ASSIGNMENT REQUESTS (giao hàng)
        // ============================================================
        try {
          console.log('[App] 🔄 Polling delivery assignment requests...')
          const deliveryResponse = await fetch(`${API_URL}/deliveries/assignment-requests/pending`, {
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            }
          })

          if (deliveryResponse.ok) {
            const deliveryRequests = await deliveryResponse.json()
            console.log('[App] 📦 Delivery requests found:', deliveryRequests.length)

            if (deliveryRequests && deliveryRequests.length > 0) {
              const firstRequest = deliveryRequests[0]
              console.log('[App] 📬 ========== NEW DELIVERY REQUEST ==========')
              console.log('[App] 📬 Request ID:', firstRequest._id)
              console.log('[App] 📬 Delivery ID:', firstRequest.deliveryId?._id)
              console.log('[App] 📬 Attempt #:', firstRequest.attemptNumber || 1)
              console.log('[App] 📬 Score:', firstRequest.score)
              console.log('[App] 🔥 Full delivery data:', {
                distance: firstRequest.deliveryId?.distance,
                duration: firstRequest.deliveryId?.duration,
                estimatedPrice: firstRequest.deliveryId?.estimatedPrice,
                pickupAddress: firstRequest.deliveryId?.pickupAddress,
                dropoffAddress: firstRequest.deliveryId?.dropoffAddress,
              })
              console.log('[App] 📬 ========== END DELIVERY REQUEST ==========')

              if (window && window.__firegoAssignmentCallback) {
                window.__firegoAssignmentCallback({
                  ...firstRequest,
                  type: 'delivery', // ✅ Mark as delivery
                  deliveryId: firstRequest.deliveryId, // ✅ Pass full populated object
                })
              }
            }
          } else {
            console.warn('[App] ⚠️ Failed to fetch delivery requests:', deliveryResponse.status)
          }
        } catch (error) {
          console.error('[App] ❌ Error polling delivery requests:', error)
        }
      } catch (error) {
        console.error('[App] ❌ Error in global polling:', error)
      }
    }

    // Poll every 5 seconds
    const interval = setInterval(pollPendingRequests, 5000)
    pollPendingRequests() // Initial poll

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [isAuthenticated, user?.id])

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
  const navigationRef = useRef(null)
  const lastRequestIdRef = useRef(null)  // ✅ Track last request ID to avoid reset countdown

  // ✅ Setup assignment request polling with store subscription
  useEffect(() => {
    let unsubscribe
    
    const startPolling = () => {
      const state = store.getState()
      const user = state.auth.user
      const driverId = user?._id || user?.id
      
      if (!driverId) {
        console.log('[App] ⏭️ Skip polling - no driverId yet')
        return
      }

      console.log('[App] 🚀 Starting assignment request polling with driverId:', driverId)

      // ✅ Register global callback for RootNavigator polling to emit requests
      window.__firegoAssignmentCallback = (request) => {
        console.log('[App] 📦 Request data:', request)
        console.log('[App] 📦 Request rideId data:', request.rideId)
        console.log('[App] 📦 Request deliveryId data:', request.deliveryId)
        
        // ✅ Check if this is a NEW request (different from last one)
        const isNewRequest = lastRequestIdRef.current !== request._id
        lastRequestIdRef.current = request._id

        // 🔥 Check if rideId is a POPULATED OBJECT with distance/duration
        const rideHasFullData = request.rideId && typeof request.rideId === 'object' && 
          request.rideId.distance !== undefined && request.rideId.duration !== undefined

        // 🔥 Check if deliveryId is a POPULATED OBJECT with distance/duration
        const deliveryHasFullData = request.deliveryId && typeof request.deliveryId === 'object' && 
          request.deliveryId.distance !== undefined && request.deliveryId.duration !== undefined

        console.log('[App] 🔍 rideHasFullData:', rideHasFullData, 'rideId type:', typeof request.rideId)
        console.log('[App] 🔍 deliveryHasFullData:', deliveryHasFullData, 'deliveryId type:', typeof request.deliveryId)

        // UPDATE STATE TO SHOW MODAL
        setAssignmentRequest(request)
        setShowAssignmentModal(true)

        // ✅ ONLY reset countdown for NEW requests, not for updates
        if (isNewRequest) {
          console.log('[App] ✅ New request, resetting countdown to 45')
          setCountdown(45)

          // If rideId already populated with distance/duration, use it immediately
          if (request.type === 'ride' && rideHasFullData) {
            console.log('[App] ✅ Using populated ride data immediately:', {
              distance: request.rideId.distance,
              duration: request.rideId.duration,
              fare: request.rideId.totalFare,
            })
            setAssignmentRequest(prev => ({
              ...prev,
              distance: request.rideId.distance || 0,
              duration: request.rideId.duration || 0,
              fare: request.rideId.totalFare || 0,
              pickupAddress: request.rideId.pickupAddress || 'Địa điểm đón',
              dropoffAddress: request.rideId.dropoffAddress || 'Địa điểm đến',
              pickupCoordinates: request.rideId.pickupCoordinates || prev.pickupCoordinates,
              dropoffCoordinates: request.rideId.dropoffCoordinates || prev.dropoffCoordinates,
            }))
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
              fare: request.deliveryId.estimatedPrice,
              distanceParsed: parseDistance(request.deliveryId.distance),
              durationParsed: parseDuration(request.deliveryId.duration),
            })
            setAssignmentRequest(prev => ({
              ...prev,
              distance: parseDistance(request.deliveryId.distance),
              duration: parseDuration(request.deliveryId.duration),
              fare: request.deliveryId.estimatedPrice || 0,
              pickupAddress: request.deliveryId.pickupAddress || 'Lấy hàng',
              dropoffAddress: request.deliveryId.dropoffAddress || 'Giao hàng',
              pickupCoordinates: request.deliveryId.pickupCoordinates || prev.pickupCoordinates,
              dropoffCoordinates: request.deliveryId.dropoffCoordinates || prev.dropoffCoordinates,
            }))
            return
          }

          // ✅ For combined trips, fetch full data to get distance, duration
          if (request.combinedTripId && request.type === 'rideshare') {
            console.log('[App] 📡 Fetching full combined trip data...')
            fetchFullRequestData(request.combinedTripId, request._id, 'combined_trip')
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
        const token = await AsyncStorage.getItem('token')
        if (!token) {
          console.error('[App] ❌ No token available for fetch')
          return
        }

        let endpoint = ''
        if (dataType === 'combined_trip') {
          endpoint = `http://192.168.1.18:3000/api/combined-trips/${dataId}`
          console.log('[App] 📡 Fetching full combined trip data for:', dataId)
        } else if (dataType === 'ride') {
          endpoint = `http://192.168.1.18:3000/api/rides/${dataId}`
          console.log('[App] 📡 Fetching full ride data for:', dataId)
        } else if (dataType === 'delivery') {
          endpoint = `http://192.168.1.18:3000/api/deliveries/${dataId}`
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
            pickupAddress,
            dropoffAddress,
            combinedTripId: dataType === 'combined_trip' ? dataId : prev.combinedTripId,
            rideId: dataType === 'ride' ? dataId : prev.rideId,
            deliveryId: dataType === 'delivery' ? dataId : prev.deliveryId,
            // Also add coordinates for modal display
            pickupCoordinates: data.pickupLocation?.coordinates || data.pickupCoordinates || prev.pickupCoordinates,
            dropoffCoordinates: data.deliveryLocation?.coordinates || data.deliveryCoordinates || data.dropoffLocation?.coordinates || data.dropoffCoordinates || prev.dropoffCoordinates,
          }
          
          // ONLY update fare for regular rides/delivery, NOT for combined trips
          if (dataType !== 'combined_trip') {
            updatedData.fare = fare
            console.log('[App] ✅ Updated fare for', dataType, ':', fare)
          } else {
            console.log('[App] ⚠️ Preserved original request.fare for combined trip:', prev.fare)
          }
          
          return updatedData
        })

        console.log('[App] ✅ State updated with full data')
      } catch (error) {
        console.error('[App] ❌ Error fetching data:', error.message)
        console.error('[App] ❌ Error stack:', error.stack?.substring(0, 200))
      }
    }

    // Subscribe to store changes to restart polling when user logs in
    unsubscribe = store.subscribe(() => {
      const newUser = store.getState().auth.user
      if (newUser && !assignmentRequest) {
        // User just logged in, start polling
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

  // Countdown timer
  useEffect(() => {
    if (!showAssignmentModal) return

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Auto reject when timeout
          handleRejectAssignment()
          return 45
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [showAssignmentModal])

  const playNotificationSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('./src/assets/sounds/notification.mp3')
      )
      await sound.setPositionAsync(0)
      await sound.setVolumeAsync(1.0)
      await sound.playAsync()
    } catch (e) {
      console.log('Sound error:', e)
    }
  }

  const handleAcceptAssignment = async () => {
    if (!assignmentRequest) return

    // ✅ Check if request is already expired
    if (assignmentRequest.status === 'timeout' || assignmentRequest.status !== 'pending') {
      console.warn('[App] ⚠️ Request already expired or rejected, skipping accept')
      console.warn('[App] Request status:', assignmentRequest.status)
      Alert.alert('Yêu cầu hết hạn', 'Yêu cầu này đã hết hạn, vui lòng chờ yêu cầu tiếp theo')
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
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
                navigationRef.current?.navigate('Wallet')
              },
            },
            {
              text: 'Để sau',
              onPress: () => {
                setShowAssignmentModal(false)
                setAssignmentRequest(null)
                setCountdown(45)
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
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)

      // Navigate based on type
      if (!navigationRef.current) {
        console.error('[App] ❌ navigationRef not available')
        return
      }
      
      if (requestType === 'delivery') {
        console.log('[App] 🚀 Navigating to ActiveDelivery with id:', navigationId)
        navigationRef.current.navigate('ActiveDelivery', { deliveryId: navigationId })
        Alert.alert('Thành công', 'Bạn đã nhận đơn giao hàng!')
      } else if (requestType === 'rideshare') {
        console.log('[App] 🚀 Navigating to ActiveRideScreen with combinedTripId:', navigationId)
        navigationRef.current.navigate('ActiveRideScreen', { 
          combinedTripId: navigationId, // ✅ Chỉ truyền combinedTripId cho rideshare
          sourceType: 'combined_trip',
        })
        Alert.alert('Thành công', 'Bạn đã nhận chuyến ghép!')
      } else {
        console.log('[App] 🚀 Navigating to TripActivities with rideId:', navigationId)
        navigationRef.current.navigate('TripActivities', { rideId: navigationId })
        Alert.alert('Thành công', 'Bạn đã nhận cuốc xe!')
      }
    } catch (error) {
      console.error('[App] ❌ Error accepting assignment:', error)
      console.error('[App] ❌ Error message:', error?.message)
      // ✅ Close modal anyway on error
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
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
      console.warn('[App] Request status:', assignmentRequest.status)
      Alert.alert('Yêu cầu hết hạn', 'Yêu cầu này đã hết hạn')
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
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
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
      Alert.alert('Thành công', 'Bạn đã từ chối yêu cầu này')
    } catch (error) {
      console.error('[App] ❌ Error rejecting assignment:', error)
      console.error('[App] ❌ Error message:', error?.message)
      console.error('[App] ❌ Error stack:', error?.stack?.substring(0, 300))
      
      // ✅ Close modal anyway on error
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(45)
      Alert.alert('Lỗi', error?.message || 'Không thể từ chối yêu cầu')
    }
  }

  return (
    <Provider store={store}>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
        
        {/* Global Assignment Request Modal */}
        <AssignmentRequestModal
          visible={showAssignmentModal}
          request={assignmentRequest}
          onAccept={handleAcceptAssignment}
          onReject={handleRejectAssignment}
          countdown={countdown}
          driverTypes={store.getState().auth.user?.driverTypes || ['rideshare']}
        />
      </NavigationContainer>
    </Provider>
  )
}