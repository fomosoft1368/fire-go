import React, { useEffect } from 'react'
import { StyleSheet, ActivityIndicator, View } from 'react-native'
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
import { useEffect } from 'react'
import { loginSuccess } from './src/redux/slices/authSlice'
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import HomeScreen from './src/screens/HomeScreen'
import TripsScreen from './src/screens/TripsScreen'
import EarningsScreen from './src/screens/EarningsScreen'
import ProfileScreen from './src/screens/ProfileScreen'
import ActiveRideScreen from './src/screens/ActiveRideScreen'
import RideRequestsScreen from './src/screens/RideRequestsScreen'
import TopupScreen from './src/screens/TopupScreen'
import PaymentWebViewScreen from './src/screens/PaymentWebViewScreen'
import MapScreen from './src/screens/MapScreen'
import CreateRideScreen from './src/screens/CreateRideScreen'
import TripActivities from './src/screens/TripActivities'
import DeliveryRequestsScreen from './src/screens/DeliveryRequestsScreen'
import ActiveDeliveryScreen from './src/screens/ActiveDeliveryScreen'

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
        let iconName: any

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
    </Stack.Navigator>
  )
}

const RootNavigator = () => {
<<<<<<< HEAD
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)
  const dispatch = useDispatch()

  useEffect(() => {
    const restoreAuthFromStorage = async () => {
      try {
        const token = await AsyncStorage.getItem('token')
        const userStr = await AsyncStorage.getItem('user')
        
        console.log('[Driver App] Restoring auth...')
        console.log('[Driver App] Token exists:', !!token)
        console.log('[Driver App] User exists:', !!userStr)

        if (token && userStr) {
          try {
            const user = JSON.parse(userStr)
            console.log('[Driver App] Restored user:', { id: user.id, role: user.role, email: user.email })
            dispatch(restoreAuth({ token, user }))
          } catch (parseError) {
            console.error('[Driver App] User JSON parse error:', parseError)
            // Clear corrupted data
            await AsyncStorage.removeItem('token')
            await AsyncStorage.removeItem('user')
            dispatch(restoreAuth(null))
          }
        } else {
          console.log('[Driver App] No auth data in storage')
          dispatch(restoreAuth(null))
        }
      } catch (error) {
        console.error('[Driver App] Restore auth error:', error)
        dispatch(restoreAuth(null))
      }
    }

    restoreAuthFromStorage()
  }, [dispatch])
=======
  const dispatch = useDispatch()
  const { isAuthenticated } = useSelector((state) => state.auth)
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

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#101922' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }
>>>>>>> f615926e441a806aecd45b60e9184db5811fa2d1

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen
          name="Main"
          component={HomeStackNavigator}
          options={{ animationEnabled: false }}
        />
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
  return (
    <Provider store={store}>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </Provider>
  )
}
