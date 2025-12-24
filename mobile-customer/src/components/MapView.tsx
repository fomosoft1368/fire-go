import React, { useState } from 'react'
import { View, StyleSheet, Dimensions, Text } from 'react-native'

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
}: MapViewComponentProps) => {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.mapPlaceholder}>
        <Text style={styles.placeholderText}>🗺️ Google Maps</Text>
        <Text style={styles.infoText}>Latitude: {initialRegion.latitude.toFixed(4)}</Text>
        <Text style={styles.infoText}>Longitude: {initialRegion.longitude.toFixed(4)}</Text>
        {markers.length > 0 && (
          <Text style={styles.markerCount}>📍 {markers.length} điểm đánh dấu</Text>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginBottom: 16,
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e8e8e8',
    borderColor: '#ccc',
    borderWidth: 1,
  },
  placeholderText: {
    fontSize: 24,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginVertical: 2,
  },
  markerCount: {
    fontSize: 12,
    color: '#FF6B00',
    marginTop: 8,
    fontWeight: 'bold',
  },
})

export default MapViewComponent
