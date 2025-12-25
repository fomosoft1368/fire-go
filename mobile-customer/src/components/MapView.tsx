import React, { useRef, useEffect } from 'react'
import { View, StyleSheet } from 'react-native'
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps'

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

  // Tự động zoom để hiển thị cả pickup và dropoff
  useEffect(() => {
    if (pickupCoords && dropoffCoords && mapRef.current) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates([pickupCoords, dropoffCoords], {
          edgePadding: { top: 50, right: 50, bottom: 50, left: 50 },
          animated: true,
        })
      }, 100)
    }
  }, [pickupCoords, dropoffCoords])

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
      >
        {/* Đường đi với outline */}
        {routeCoordinates.length > 0 && (
          <>
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
      </MapView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  map: {
    flex: 1,
  },
})

export default MapViewComponent
