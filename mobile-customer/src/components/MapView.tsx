import React, { useRef, useEffect, useState } from 'react'
import { View, StyleSheet, TouchableOpacity } from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { MaterialIcons } from '@expo/vector-icons'

interface MapViewComponentProps {
  height?: number
  initialRegion?: {
    latitude: number
    longitude: number
    latitudeDelta: number
    longitudeDelta: number
  }
  onLocationSelect?: (location: { latitude: number; longitude: number }) => void
  markers?: Array<{
    id: string
    latitude: number
    longitude: number
    title: string
    description?: string
  }>
  pickupCoords?: { latitude: number; longitude: number }
  dropoffCoords?: { latitude: number; longitude: number }
  routeCoordinates?: Array<{ latitude: number; longitude: number }>
}

const MapViewComponent = ({
  height = 300,
  initialRegion = {
    latitude: 21.0285, // Hanoi, Vietnam
    longitude: 105.8542,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  },
  onLocationSelect,
  markers = [],
  pickupCoords,
  dropoffCoords,
  routeCoordinates = [],
}: MapViewComponentProps) => {
  const mapRef = useRef<MapView>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)

  // Lấy vị trí người dùng
  useEffect(() => {
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          console.warn('[MapView] Location permission denied')
          return
        }

        const location = await Location.getCurrentPositionAsync({})
        const userCoords = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }
        setUserLocation(userCoords)
        console.log('[MapView] User location:', userCoords)
      } catch (error) {
        console.error('[MapView] Get location error:', error)
      }
    }

    getUserLocation()
  }, [])

  // Tự động zoom để hiển thị cả pickup và dropoff
  useEffect(() => {
    console.log('[MapView] Route data:', {
      pickupCoords,
      dropoffCoords,
      routeCoordinatesCount: routeCoordinates?.length || 0,
    })
    
    if (pickupCoords && dropoffCoords && mapRef.current) {
      // Delay để đảm bảo MapView đã render xong
      const timer = setTimeout(() => {
        try {
          console.log('[MapView] 🗺️ Fitting to coordinates:', { pickupCoords, dropoffCoords })
          mapRef.current?.fitToCoordinates([pickupCoords, dropoffCoords], {
            edgePadding: { top: 100, right: 50, bottom: 150, left: 50 },
            animated: true,
          })
        } catch (error) {
          console.error('[MapView] fitToCoordinates error:', error)
        }
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [pickupCoords, dropoffCoords, routeCoordinates])

  // Hàm zoom tới vị trí hiện tại
  const handleZoomToCurrentLocation = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.animateToRegion(
        {
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        800
      )
    }
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate
          onLocationSelect?.({ latitude, longitude })
        }}
        showsUserLocation={true}
        showsMyLocationButton={true}
        showsCompass={true}
        toolbarEnabled={true}
        scrollEnabled={true}
        zoomEnabled={true}
      >
        {/* Đường đi với outline */}
        {routeCoordinates.length > 0 && (
          <>
            {console.log('[MapView] 🛣️ Rendering route with', routeCoordinates.length, 'points')}
            {/* Outline (viền ngoài) */}
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#1e293b"
              strokeWidth={8}
              lineJoin="round"
              lineCap="round"
            />
            {/* Đường chính */}
            <Polyline
              coordinates={routeCoordinates}
              strokeColor="#8b5cf6"
              strokeWidth={5}
              lineJoin="round"
              lineCap="round"
            />
          </>
        )}
        {/* Điểm đón */}
        {pickupCoords && (
          <Marker
            coordinate={pickupCoords}
            title="Điểm đón"
            pinColor="#FF6B00"
            identifier="pickup"
          />
        )}

        {/* Điểm đến */}
        {dropoffCoords && (
          <Marker
            coordinate={dropoffCoords}
            title="Điểm đến"
            pinColor="#ef4444"
            identifier="dropoff"
          />
        )}

        {/* Các markers khác */}
        {markers.map((marker) => (
          <Marker
            key={marker.id}
            coordinate={{
              latitude: marker.latitude,
              longitude: marker.longitude,
            }}
            title={marker.title}
            description={marker.description}
          />
        ))}

        {/* Vị trí người dùng hiện tại */}
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Vị trí của bạn"
            pinColor="#0066cc"
            identifier="user"
          />
        )}
      </MapView>

      {/* Button phóng to vị trí hiện tại */}
      {userLocation && (
        <TouchableOpacity 
          style={styles.zoomButton}
          onPress={handleZoomToCurrentLocation}
        >
          <MaterialIcons name="my-location" size={24} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  zoomButton: {
    position: 'absolute',
    bottom: 60,
    right: 16,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
})

export default MapViewComponent
