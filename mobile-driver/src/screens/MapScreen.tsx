import React, { useRef, useEffect, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, SafeAreaView, Animated } from 'react-native'
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

const MapScreen = () => {
  const mapRef = useRef<MapView>(null)
  const navigation = useNavigation()
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
  } | null>(null)
  const [heading, setHeading] = useState<number>(0)
  const [isLoadingLocation, setIsLoadingLocation] = useState(true)
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Pulse animation
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [])

  // Lấy vị trí người dùng
  useEffect(() => {
    let locationSubscription: Location.LocationSubscription | null = null

    const getLocation = async () => {
      try {
        // Kiểm tra và xin quyền truy cập location
        const { status } = await Location.requestForegroundPermissionsAsync()
        
        if (status !== 'granted') {
          console.warn('[MapScreen] Location permission denied')
          // Fallback to default location
          setUserLocation({
            latitude: 21.0285,
            longitude: 105.8542,
          })
          setIsLoadingLocation(false)
          return
        }

        // Lấy vị trí hiện tại
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        })

        console.log('[MapScreen] Current location:', location.coords)

        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        })
        
        // Lấy heading nếu có
        if (location.coords.heading !== null && location.coords.heading !== undefined) {
          setHeading(location.coords.heading)
        }
        
        setIsLoadingLocation(false)

        // Theo dõi vị trí real-time
        locationSubscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            distanceInterval: 5, // Cập nhật mỗi 5 mét (nhạy hơn)
            timeInterval: 3000, // Hoặc mỗi 3 giây
          },
          (newLocation) => {
            console.log('[MapScreen] Location updated:', {
              lat: newLocation.coords.latitude,
              lng: newLocation.coords.longitude,
              heading: newLocation.coords.heading,
              speed: newLocation.coords.speed,
            })
            
            // Cập nhật vị trí
            setUserLocation({
              latitude: newLocation.coords.latitude,
              longitude: newLocation.coords.longitude,
            })
            
            // Cập nhật hướng di chuyển nếu có
            if (newLocation.coords.heading !== null && newLocation.coords.heading !== undefined) {
              setHeading(newLocation.coords.heading)
            }
          }
        )
      } catch (error) {
        console.error('[MapScreen] Error getting location:', error)
        // Fallback to default location on error
        setUserLocation({
          latitude: 21.0285,
          longitude: 105.8542,
        })
        setIsLoadingLocation(false)
      }
    }

    getLocation()

    // Cleanup subscription on unmount
    return () => {
      if (locationSubscription) {
        locationSubscription.remove()
      }
    }
  }, [])

  const handleBackPress = () => {
    navigation.goBack()
  }

  const handleCenterLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        500
      )
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {!isLoadingLocation && userLocation ? (
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          showsUserLocation={true}
          showsMyLocationButton={false}
          followsUserLocation={true}
          showsCompass={true}
          showsTraffic={false}
        >
          {/* Custom driver marker */}
          <Marker
            coordinate={{
              latitude: userLocation.latitude,
              longitude: userLocation.longitude,
            }}
            title="Vị trí của tôi"
            description="Tài xế"
            anchor={{ x: 0.5, y: 0.5 }}
            rotation={heading}
            flat={true}
          >
            <View style={styles.markerContainer}>
              {/* Pulse outer ring */}
              <Animated.View
                style={[
                  styles.pulseRing,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.3],
                      outputRange: [0.6, 0],
                    }),
                  },
                ]}
              />
              
              {/* Main marker */}
              <View style={styles.markerMain}>
                <View style={styles.markerShadow} />
                <View style={styles.markerBody}>
                  <View style={styles.iconContainer}>
                    <MaterialIcons name="directions-car" size={20} color="#fff" />
                  </View>
                  {/* Direction arrow */}
                  <View style={[styles.directionArrow, { transform: [{ rotate: `${heading}deg` }] }]}>
                    <View style={styles.arrowShape} />
                  </View>
                </View>
              </View>
            </View>
          </Marker>
        </MapView>
      ) : (
        <View style={styles.loadingContainer}>
          <MaterialIcons name="my-location" size={40} color={COLORS.primary} />
        </View>
      )}

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={handleBackPress}
        activeOpacity={0.8}
      >
        <MaterialIcons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Center Location Button */}
      <TouchableOpacity
        style={styles.centerButton}
        onPress={handleCenterLocation}
        activeOpacity={0.8}
      >
        <MaterialIcons name="my-location" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
  },
  markerContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulseRing: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 107, 0, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 0, 0.5)',
  },
  markerMain: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerShadow: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#000',
    opacity: 0.2,
    top: 3,
  },
  markerBody: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 8,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directionArrow: {
    position: 'absolute',
    top: -8,
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
  },
  arrowShape: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.primary,
    transform: [{ translateX: -6 }],
  },
  driverMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverMarkerInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingSpinner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: COLORS.primary,
    borderTopColor: 'transparent',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
  centerButton: {
    position: 'absolute',
    bottom: 32,
    right: SPACING.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 10,
  },
})

export default MapScreen
