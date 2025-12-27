import React from 'react'
import 'react-native-gesture-handler'
import { useEffect } from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Provider, useSelector, useDispatch } from 'react-redux'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { store } from './redux/store'
import { MaterialIcons } from '@expo/vector-icons'
import { LoginScreen, HomeScreen, BookingsScreen, WalletScreen, ProfileScreen } from './screens'
import { COLORS } from './constants'
import { restoreAuth } from './redux/slices/authSlice'
import type { RootState } from './redux/store'
import type { RootStackParamList } from './types'

const Stack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator()

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: true,
      tabBarIcon: ({ focused, color, size }) => {
        let iconName: any = 'home'

        if (route.name === 'Home') {
          iconName = 'home'
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
      component={HomeScreen}
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

const RootNavigator = () => {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  const dispatch = useDispatch()

  useEffect(() => {
    const restoreAuthFromStorage = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken')
        const userStr = await AsyncStorage.getItem('user')

        if (token && userStr) {
          const user = JSON.parse(userStr)
          dispatch(restoreAuth({ token, user }))
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

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainNavigator} />
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
