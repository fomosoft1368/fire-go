import React from 'react'
import 'react-native-gesture-handler'
import { useEffect, useState, useCallback } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Provider, useSelector, useDispatch } from 'react-redux'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { store } from './redux/store'
import { MaterialIcons } from '@expo/vector-icons'
import { LoginScreen, Home, HomeScreen, HireDriverScreen, Delivery, BookingsScreen, WalletScreen, ProfileScreen, EditProfileScreen, ChangePasswordScreen, PaymentMethodsScreen, TransactionHistoryScreen, RideBookingScreen, NotificationScreen, NotificationDetailScreen, FindingRideScreen, FullscreenMapScreen, RideDetailRequestScreen, ConfirmDelivery, FindingDelivery, DeliveryTracking, DeliveryCompleted,DriverFoundScreen } from './screens'
import { View, Text } from 'react-native'
import { COLORS } from './constants'
import { restoreAuth } from './redux/slices/authSlice'
import type { RootState } from './redux/store'
import type { RootStackParamList } from './types'
import { notificationService } from './services/notificationService'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator()

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

  useEffect(() => {
    if (token) {
      notificationService.setToken(token)
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
      const data = response.data || []
      const count = data.filter((n: any) => !n.isRead).length
      setUnreadCount(count)
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
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: '#101922',
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
        component={BookingsScreen}
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
  const dispatch = useDispatch()

  useEffect(() => {
    const restoreAuthFromStorage = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken')
        const userStr = await AsyncStorage.getItem('user')
        
        console.log('[App] Restoring auth...')
        console.log('[App] Token exists:', !!token)
        console.log('[App] User exists:', !!userStr)

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr)
            console.log('[App] Restored user:', { id: user.id, role: user.role, email: user.email })
            dispatch(restoreAuth({ token, user }))
          } catch (parseError) {
            console.error('[App] User JSON parse error:', parseError)
            // Clear corrupted data
            await AsyncStorage.removeItem('authToken')
            await AsyncStorage.removeItem('user')
            dispatch(restoreAuth(null))
          }
        } else {
          console.log('[App] No auth data in storage')
          dispatch(restoreAuth(null))
        }
      } catch (error) {
        console.error('[App] Restore auth error:', error)
        dispatch(restoreAuth(null))
      }
    }

    restoreAuthFromStorage()
  }, [dispatch])

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
            <Stack.Screen name="BookRide" component={HomeScreen} />
            <Stack.Screen name="HireDriver" component={HireDriverScreen} />
            <Stack.Screen name="Delivery" component={Delivery} />
            <Stack.Screen name="RideBooking" component={RideBookingScreen} />
            <Stack.Screen name="RideDetailRequest" component={RideDetailRequestScreen} />
            <Stack.Screen name="FindingRideScreen" component={FindingRideScreen} />
            <Stack.Screen name="FullscreenMap" component={FullscreenMapScreen} />
            <Stack.Screen name="ConfirmDelivery" component={ConfirmDelivery} />
            <Stack.Screen name="FindingDelivery" component={FindingDelivery} />
            <Stack.Screen name="DeliveryTracking" component={DeliveryTracking} />
            <Stack.Screen name="DeliveryCompleted" component={DeliveryCompleted} />
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
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </Provider>
  )
}
