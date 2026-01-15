import { useState, useEffect } from 'react'
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'
import MapViewComponent from '../components/MapView'
import { SPACING, BORDER_RADIUS, COLORS_DARK, COLORS_LIGHT } from '../constants'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'

export default function FullscreenMapScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
  const route = useRoute()
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

  const params = route.params as {
    pickupCoords?: { latitude: number; longitude: number }
    dropoffCoords?: { latitude: number; longitude: number }
    routeCoordinates?: Array<{ latitude: number; longitude: number }>
    drivers?: any[]
    routeInfo?: any
    pickupCoordinates?: [number, number]
    dropoffCoordinates?: [number, number]
  }

  const pickupCoordinates = params?.pickupCoordinates || [105.8542, 21.0285]
  const dropoffCoordinates = params?.dropoffCoordinates || [105.8542, 21.0285]
  const routeInfo = params?.routeInfo

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/* Header with Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
      </TouchableOpacity>

      <MapViewComponent
        height="100%"
        initialRegion={{
          latitude: pickupCoordinates[1],
          longitude: pickupCoordinates[0],
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        markers={[]}
        pickupCoords={params?.pickupCoords}
        dropoffCoords={params?.dropoffCoords}
        routeCoordinates={params?.routeCoordinates || []}
        drivers={params?.drivers || []}
        onLocationSelect={() => { }}
      />

      {/* Map Info at Bottom */}
      {routeInfo && (
        <View style={styles.fullscreenMapInfo}>
          <View style={styles.mapInfoRow}>
            <View style={styles.mapInfoItem}>
              <MaterialIcons name="straighten" size={18} color="#FF6B00" />
              <Text style={styles.mapInfoValue}>{routeInfo.distanceText}</Text>
            </View>
            <View style={styles.mapInfoDivider} />
            <View style={styles.mapInfoItem}>
              <MaterialIcons name="schedule" size={18} color="#FF6B00" />
              <Text style={styles.mapInfoValue}>{routeInfo.durationText}</Text>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 24,
    zIndex: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  fullscreenMapInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
  },
  mapInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  mapInfoItem: {
    flex: 1,
    alignItems: 'center',
    gap: SPACING.sm,
  },
  mapInfoValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  mapInfoDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
})
