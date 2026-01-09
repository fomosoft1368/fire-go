import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { COLORS_DARK, COLORS_LIGHT, SPACING, BORDER_RADIUS } from '../constants'
import MapViewComponent from '../components/MapView'

const { width, height } = Dimensions.get('window')

interface FindingRideScreenProps {
  routeInfo: any
  passengerCount: number
  fareEstimate: any
  onCancel: () => void
}

export default function FindingRideScreen({
  routeInfo,
  passengerCount,
  fareEstimate,
  onCancel,
}: FindingRideScreenProps) {
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

  // Animation values
  const pulseAnim1 = useRef(new Animated.Value(0)).current
  const pulseAnim2 = useRef(new Animated.Value(0)).current
  const pulseAnim3 = useRef(new Animated.Value(0)).current
  const rotateAnim = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    // Pulse animations với delay khác nhau
    const pulse1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim1, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim1, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )

    const pulse2 = Animated.loop(
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(pulseAnim2, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim2, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )

    const pulse3 = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(pulseAnim3, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim3, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    )

    // Rotate animation
    const rotate = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 3000,
        useNativeDriver: true,
      })
    )

    // Fade in/out text
    const fade = Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    )

    pulse1.start()
    pulse2.start()
    pulse3.start()
    rotate.start()
    fade.start()

    return () => {
      pulse1.stop()
      pulse2.stop()
      pulse3.stop()
      rotate.stop()
      fade.stop()
    }
  }, [])

  const scale1 = pulseAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1.5],
  })

  const scale2 = pulseAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1.8],
  })

  const scale3 = pulseAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 2.2],
  })

  const opacity1 = pulseAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 0],
  })

  const opacity2 = pulseAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 0],
  })

  const opacity3 = pulseAnim3.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  })

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      <StatusBar
        barStyle={themeMode === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={colors.bg}
      />

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapViewComponent
          height={null}
          initialRegion={{
            latitude: routeInfo.pickup.coordinates.latitude,
            longitude: routeInfo.pickup.coordinates.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          markers={[]}
          pickupCoords={{
            latitude: routeInfo.pickup.coordinates.latitude,
            longitude: routeInfo.pickup.coordinates.longitude,
          }}
          dropoffCoords={{
            latitude: routeInfo.dropoff.coordinates.latitude,
            longitude: routeInfo.dropoff.coordinates.longitude,
          }}
          routeCoordinates={routeInfo.routeCoordinates || []}
          onLocationSelect={() => {}}
        />

        {/* Overlay gradient */}
        <View style={styles.mapOverlay} />
      </View>

      {/* Content Card */}
      <View style={[styles.contentCard, { backgroundColor: colors.bgSecondary }]}>
        {/* Radar Animation */}
        <View style={styles.radarSection}>
          <View style={styles.radarContainer}>
            {/* Pulse rings */}
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: scale1 }],
                  opacity: opacity1,
                  borderColor: '#FF6B00',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: scale2 }],
                  opacity: opacity2,
                  borderColor: '#FF6B00',
                },
              ]}
            />
            <Animated.View
              style={[
                styles.pulseRing,
                {
                  transform: [{ scale: scale3 }],
                  opacity: opacity3,
                  borderColor: '#FF6B00',
                },
              ]}
            />

            {/* Center dot with rotation */}
            <Animated.View
              style={[
                styles.radarCenter,
                {
                  transform: [{ rotate: rotation }],
                },
              ]}
            >
              <View style={styles.radarDot} />
              <View style={styles.radarLine} />
            </Animated.View>
          </View>

          {/* Status text */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>
              Đang tìm tài xế
            </Text>
          </Animated.View>
          <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
            Vui lòng chờ trong giây lát...
          </Text>
        </View>

        {/* Route Info */}
        <View style={[styles.infoSection, { borderTopColor: colors.border }]}>
          <View style={styles.infoRow}>
            <MaterialIcons name="trip-origin" size={16} color="#FF6B00" />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Điểm đón</Text>
              <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                {routeInfo.pickup.formattedAddress}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={16} color="#ef4444" />
            <View style={styles.infoTextContainer}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Điểm đến</Text>
              <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
                {routeInfo.dropoff.formattedAddress}
              </Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialIcons name="directions" size={18} color="#FF6B00" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {(routeInfo.distance / 1000).toFixed(1)} km
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statItem}>
              <MaterialIcons name="schedule" size={18} color="#FF6B00" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                ~{Math.ceil(routeInfo.duration / 60)} phút
              </Text>
            </View>

            <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statItem}>
              <MaterialIcons name="people" size={18} color="#FF6B00" />
              <Text style={[styles.statValue, { color: colors.text }]}>
                {passengerCount} khách
              </Text>
            </View>
          </View>

          {/* Fare estimate */}
          {fareEstimate && (
            <View style={[styles.fareBox, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}30` }]}>
              <Text style={[styles.fareLabel, { color: colors.textSecondary }]}>Giá dự kiến</Text>
              <Text style={styles.fareValue}>{fareEstimate.total.toLocaleString()}đ</Text>
            </View>
          )}
        </View>

        {/* Cancel Button */}
        <TouchableOpacity
          style={[styles.cancelButton, { backgroundColor: colors.border }]}
          onPress={onCancel}
          activeOpacity={0.7}
        >
          <MaterialIcons name="close" size={22} color={colors.text} />
          <Text style={[styles.cancelButtonText, { color: colors.text }]}>Hủy tìm kiếm</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  contentCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  radarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  radarContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  pulseRing: {
    position: 'absolute',
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
  },
  radarCenter: {
    width: 50,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  radarLine: {
    position: 'absolute',
    width: 50,
    height: 2,
    backgroundColor: '#FF6B00',
    opacity: 0.6,
    right: 25,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  infoSection: {
    borderTopWidth: 1,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 20,
    opacity: 0.3,
  },
  fareBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.md,
  },
  fareLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  fareValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF6B00',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.xl,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
  },
})
