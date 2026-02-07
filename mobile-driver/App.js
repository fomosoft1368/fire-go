import React, { useEffect, useState, useRef } from 'react'
import { StyleSheet, ActivityIndicator, View, Alert, AppState } from 'react-native'
import { Audio } from 'expo-av'
import 'react-native-gesture-handler'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Provider, useSelector, useDispatch } from 'react-redux'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { store, RootState } from './src/redux/store'
import { restoreAuth } from './src/redux/slices/authSlice'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS } from './src/constants'
import { loginSuccess } from './src/redux/slices/authSlice'
import { assignmentRequestPollingService } from './src/services/assignmentRequestPollingService'
import { driverService } from './src/services/driverService'
import AssignmentRequestModal from './src/components/AssignmentRequestModal'
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import HomeScreen from './src/screens/HomeScreen'
import TripsScreen from './src/screens/TripsScreen'
import EarningsScreen from './src/screens/EarningsScreen'
import SupportScreen from './src/screens/SupportScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import EditProfileScreen from './src/screens/EditProfileScreen'
import ActiveRideScreen from './src/screens/ActiveRideScreen'
import RideRequestsScreen from './src/screens/RideRequestsScreen'
import TopupScreen from './src/screens/TopupScreen'
import PaymentWebViewScreen from './src/screens/PaymentWebViewScreen'
import MapScreen from './src/screens/MapScreen'
import CreateRideScreen from './src/screens/CreateRideScreen'
import TripActivities from './src/screens/TripActivities'
import DeliveryRequestsScreen from './src/screens/DeliveryRequestsScreen'
import ActiveDeliveryScreen from './src/screens/ActiveDeliveryScreen'
import ChatScreen from './src/screens/ChatScreen'
import NotificationScreen from './src/screens/Notification'
import NotificationDetailScreen from './src/screens/NotificationDetail'
import GlobalRequestModal from './src/components/GlobalRequestModal'
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
      console.log('🔥 POLLING START - Code version: 2.0')
      console.log('👤 User from Redux:', user?.id || 'NULL')
      
      try {
        // Get all my combined trips to poll for requests
        const allCombinedTrips = await driverService.getMyCombinedTrips()

        console.log('🚗 My trips count:', allCombinedTrips.length)

        for (const trip of allCombinedTrips) {
          if (!isMounted) return

          const API_URL = 'http://192.168.1.18:3000/api'
          try {
            // Get auth token
            const token = await AsyncStorage.getItem('token')
            if (!token) {
              console.warn('[App] ⚠️ No auth token, skipping poll')
              continue
            }

            // ✅ Add driverId to filter requests for THIS driver only
            const driverId = user?.id
            const endpoint = driverId 
              ? `${API_URL}/combined-trips/${trip._id}/requests?driverId=${driverId}`
              : `${API_URL}/combined-trips/${trip._id}/requests`
            
            console.log('[App] 🔗 Polling endpoint:', endpoint)
            
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
            console.log('[App] 📦 Raw response:', requests)

            // Log ALL requests to debug
            console.log('[App] 🔍 All requests:', requests.map(r => ({ id: r._id, status: r.status })))

            // Filter for PENDING requests only (not accepted/rejected/refuse)
            const pendingRequests = (requests || []).filter(req => req.status === 'pending')

            console.log('[App] ✅ Pending only:', pendingRequests.length)

            if (pendingRequests && pendingRequests.length > 0) {
              // Get the first (most recent) pending request
              const firstRequest = pendingRequests[0]

              // Show modal notification via listener pattern
              // (We'll emit this to HomeScreen via global state or listener)
              console.log('[App] 📬 Found pending request:', firstRequest._id, 'Status:', firstRequest.status)

              // Store in AsyncStorage for any screen to access
              await AsyncStorage.setItem(
                'pendingRequestNotification',
                JSON.stringify({
                  request: firstRequest,
                  combinedTripId: trip._id,
                  timestamp: Date.now(),
                })
              )

              // Play notification sound
              try {
                const { sound } = await Audio.Sound.createAsync(
                  require('./src/assets/sounds/notification.mp3')
                )
                await sound.setPositionAsync(0)
                await sound.setVolumeAsync(1.0)
                await sound.playAsync()
              } catch (e) {
                console.log('[App] Notification sound error:', e)
              }
            }
          } catch (error) {
            console.error('[App] Poll error for trip:', trip._id, error)
          }
        }
      } catch (error) {
        console.error('[App] ❌ Global polling error:', error)
      }
    }

    // Poll every 5 seconds
    const interval = setInterval(pollPendingRequests, 5000)
    pollPendingRequests() // Initial poll

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [isAuthenticated])

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
  const [countdown, setCountdown] = useState(15)
  const navigationRef = useRef(null)

  // Start assignment request polling when app loads
  useEffect(() => {
    console.log('[App] 🚀 Starting assignment request polling service...')
    
    assignmentRequestPollingService.startPolling((request) => {
      console.log('[App] 🔔 Assignment request received:', JSON.stringify(request, null, 2))
      setAssignmentRequest(request)
      setShowAssignmentModal(true)
      setCountdown(15)

      // Play notification sound
      playNotificationSound()
    })

    return () => {
      console.log('[App] 🛑 Stopping assignment request polling service...')
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
          return 15
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

    try {
      const requestType = assignmentRequest.type || 'ride'
      console.log('[App] ✅ Accepting assignment request:', assignmentRequest._id, 'type:', requestType)
      
      const result = await assignmentRequestPollingService.acceptRequest(
        assignmentRequest._id,
        requestType
      )

      console.log('[App] ✅ Request accepted successfully:', result)
      
      // Đóng modal
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(15)

      // Navigate based on type
      if (navigationRef.current && result?._id) {
        if (requestType === 'delivery') {
          console.log('[App] 🚀 Navigating to ActiveDelivery with deliveryId:', result._id)
          navigationRef.current.navigate('ActiveDelivery', { 
            deliveryId: result._id 
          })
          Alert.alert('Thành công', 'Bạn đã nhận đơn giao hàng!')
        } else {
          console.log('[App] 🚀 Navigating to TripActivities with rideId:', result._id)
          navigationRef.current.navigate('TripActivities', { 
            rideId: result._id 
          })
          Alert.alert('Thành công', 'Bạn đã nhận cuốc xe!')
        }
      } else {
        console.error('[App] ❌ Cannot navigate: navigationRef or result._id not available')
      }
    } catch (error) {
      console.error('[App] Error accepting assignment:', error)
      Alert.alert('Lỗi', error.message || 'Không thể nhận yêu cầu')
    }
  }

  const handleRejectAssignment = async () => {
    if (!assignmentRequest) return

    try {
      const requestType = assignmentRequest.type || 'ride'
      console.log('[App] ❌ Rejecting assignment request:', assignmentRequest._id, 'type:', requestType)
      
      await assignmentRequestPollingService.rejectRequest(
        assignmentRequest._id,
        requestType,
        'Tài xế từ chối'
      )

      setShowAssignmentModal(false)
      setAssignmentRequest(null)
      setCountdown(15)
    } catch (error) {
      console.error('[App] Error rejecting assignment:', error)
      // Still close modal even if reject fails
      setShowAssignmentModal(false)
      setAssignmentRequest(null)
    }
  }

  return (
    <Provider store={store}>
      <NavigationContainer ref={navigationRef}>
        <RootNavigator />
        <GlobalRequestModal />
        
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