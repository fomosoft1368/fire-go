import { useRef, useEffect, useState } from 'react'
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'
import * as Location from 'expo-location'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'

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
  drivers?: Array<{
    id: string
    latitude: number
    longitude: number
    name: string
    rating?: number
    vehicle?: string
  }>
}

const MapViewComponent = ({
  height = 300,
  initialRegion,
  onLocationSelect,
  markers = [],
  pickupCoords,
  dropoffCoords,
  routeCoordinates = [],
  drivers = [],
}: MapViewComponentProps) => {
  const mapRef = useRef<MapView>(null)
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null)
  // Initialize with fallback region
  const defaultRegion = {
    latitude: 21.0285,
    longitude: 105.8542,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }
  const [currentRegion, setCurrentRegion] = useState(initialRegion || defaultRegion)
  const [mapInitialRegion, setMapInitialRegion] = useState(initialRegion || defaultRegion)

  // Lấy vị trí người dùng ở BACKGROUND (không chặn rendering)
  useEffect(() => {
    let isMounted = true
    
    const getUserLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== 'granted') {
          console.warn('[MapView] Location permission denied')
          return
        }

        // Thử lấy last known position trước (nhanh hơn)
        const lastPosition = await Location.getLastKnownPositionAsync({})
        if (lastPosition && isMounted) {
          const userCoords = {
            latitude: lastPosition.coords.latitude,
            longitude: lastPosition.coords.longitude,
          }
          setUserLocation(userCoords)
          
          const userRegion = {
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }
          
          // Animate map tới vị trí người dùng
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion(userRegion, 800)
            }
          }, 300)
          
          console.log('[MapView] Last known location:', userCoords)
        }

        // Lấy current position ở background
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        })
        
        if (isMounted) {
          const userCoords = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          }
          setUserLocation(userCoords)
          
          const userRegion = {
            latitude: userCoords.latitude,
            longitude: userCoords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }
          
          // Update map with accurate location
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.animateToRegion(userRegion, 800)
            }
          }, 300)
          
          console.log('[MapView] Current location:', userCoords)
        }
      } catch (error) {
        console.error('[MapView] Get location error:', error)
      }
    }

    getUserLocation()
    
    return () => {
      isMounted = false
    }
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
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        1000
      )
    }
  }

  // Hàm zoom in
  const handleZoomIn = () => {
    const newRegion = {
      ...currentRegion,
      latitudeDelta: Math.max(currentRegion.latitudeDelta / 2, 0.001),
      longitudeDelta: Math.max(currentRegion.longitudeDelta / 2, 0.001),
    }
    setCurrentRegion(newRegion)
    mapRef.current?.animateToRegion(newRegion, 300)
  }

  // Hàm zoom out
  const handleZoomOut = () => {
    const newRegion = {
      ...currentRegion,
      latitudeDelta: Math.min(currentRegion.latitudeDelta * 2, 180),
      longitudeDelta: Math.min(currentRegion.longitudeDelta * 2, 180),
    }
    setCurrentRegion(newRegion)
    mapRef.current?.animateToRegion(newRegion, 300)
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={mapInitialRegion}
        onRegionChangeComplete={(region) => setCurrentRegion(region)}
        onPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate
          onLocationSelect?.({ latitude, longitude })
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
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
              strokeColor="#f97316"
              strokeWidth={9}
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
            identifier="pickup"
          >
            <View style={styles.pickupMarker}>
              <View style={styles.markerInner}>
                <MaterialIcons name="radio-button-checked" size={24} color="#FF6B00" />
              </View>
            </View>
          </Marker>
        )}

        {/* Điểm đến */}
        {dropoffCoords && (
          <Marker
            coordinate={dropoffCoords}
            title="Điểm đến"
            identifier="dropoff"
          >
            <View style={styles.dropoffMarker}>
              <View style={styles.markerInner}>
                <MaterialIcons name="flag" size={24} color="#ef4444" />
              </View>
            </View>
          </Marker>
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

        {/* Hiển thị các tài xế trên map */}
        {drivers && drivers.length > 0 && (
          <>
            {console.log('[MapView] 🚗 Rendering', drivers.length, 'drivers on map')}
            {drivers.map((driver) => {
              console.log(`[MapView] Driver marker: ${driver.name} at (${driver.latitude}, ${driver.longitude})`)
              return (
                <Marker
                  key={driver.id}
                  coordinate={{
                    latitude: driver.latitude,
                    longitude: driver.longitude,
                  }}
                  identifier={`driver-${driver.id}`}
                  title={driver.name}
                >
                  <View style={styles.driverMarker}>
                    <MaterialCommunityIcons name="car" size={24} color="#ff8c00" />
                  </View>
                </Marker>
              )
            })}
          </>
        )}
      </MapView>

      {/* Nút zoom in */}
      <TouchableOpacity 
        style={styles.zoomInButton}
        onPress={handleZoomIn}
      >
        <MaterialIcons name="add" size={24} color="#FF6B00" />
      </TouchableOpacity>

      {/* Nút zoom out */}
      <TouchableOpacity 
        style={styles.zoomOutButton}
        onPress={handleZoomOut}
      >
        <MaterialIcons name="remove" size={24} color="#FF6B00" />
      </TouchableOpacity>

      {/* Button vị trí hiện tại */}
      {userLocation && (
        <TouchableOpacity 
          style={styles.currentLocationButton}
          onPress={handleZoomToCurrentLocation}
        >
          <MaterialIcons name="navigation" size={20} color="#FF6B00"/>
        </TouchableOpacity>
      )}

      {/* Button compass */}
      <TouchableOpacity 
        style={styles.compassButton}
        onPress={() => {
          if (mapRef.current) {
            mapRef.current.animateCamera({
              heading: 0,
              pitch: 0,
              zoom: mapRef.current.camera?.zoom || 15,
              duration: 300,
            }, { duration: 300 })
          }
        }}
      >
        <MaterialIcons name="explore" size={20} color="#FF6B00" />
      </TouchableOpacity>

      {/* Button phóng to vị trí hiện tại */}
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
  zoomInButton: {
    position: 'absolute',
    top: '35%',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  zoomOutButton: {
    position: 'absolute',
    top: '42%',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  currentLocationButton: {
    position: 'absolute',
    top: '49%',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  compassButton: {
    position: 'absolute',
    top: '56%',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  driverMarker: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickupMarker: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  dropoffMarker: {
        width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerInner: {
    justifyContent: 'center',
    alignItems: 'center',
  },
    controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
})

export default MapViewComponent
