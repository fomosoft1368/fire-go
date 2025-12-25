import React from 'react'
import { StyleSheet } from 'react-native'
import 'react-native-gesture-handler'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Provider, useSelector } from 'react-redux'
import { store, RootState } from './src/redux/store'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS } from './src/constants'
import LoginScreen from './src/screens/LoginScreen'
import RegisterScreen from './src/screens/RegisterScreen'
import HomeScreen from './src/screens/HomeScreen'
import TripsScreen from './src/screens/TripsScreen'
import EarningsScreen from './src/screens/EarningsScreen'
import ProfileScreen from './src/screens/ProfileScreen'

const Stack = createNativeStackNavigator()
const Tab = createBottomTabNavigator()

const MainNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ color, size }) => {
        let iconName: any

        if (route.name === 'Home') {
          iconName = 'home'
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
        backgroundColor: COLORS.darkCard,
        borderTopColor: COLORS.darkBorder,
        paddingBottom: 8,
        height: 60,
      },
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: '600',
      },
    })}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarLabel: 'Trang chủ',
      }}
    />
    <Tab.Screen
      name="Trips"
      component={TripsScreen}
      options={{
        tabBarLabel: 'Chuyến đi',
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
        tabBarLabel: 'Tôi',
      }}
    />
  </Tab.Navigator>
)

const RootNavigator = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth)

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen
          name="Main"
          component={MainNavigator}
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
