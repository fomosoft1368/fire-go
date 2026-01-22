import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import type { RideItem } from '../types'
import { Badge } from './Badge'
import { useNavigation } from '@react-navigation/native'

interface RideCardProps {
  ride: RideItem & { sourceType?: string; _id?: string }
  onAccept?: (ride: any) => void
}

export const RideCard: React.FC<RideCardProps> = ({ ride, onAccept }) => {
  const navigation = useNavigation()

  const handleAccept = () => {
    console.log('🎯 RideCard handleAccept:', { rideId: ride._id || ride.id, sourceType: ride.sourceType })
    if (onAccept) {
      // Call parent handler with full ride object (including sourceType)
      onAccept(ride)
    } else {
      // Fallback: navigate to RideRequestsScreen
      // @ts-ignore - Navigation types not fully defined
      navigation.navigate('RideRequestsScreen', { rideId: ride.id })
    }
  }
  return (
    <View style={styles.card}>
      {/* Badge Row */}
      <View style={styles.badgeContainer}>
        <Badge label={ride.badge} color={ride.badgeColor} />
        <Text style={styles.priceText}>+{ride.price.toLocaleString('vi-VN')}đ</Text>
      </View>

      {/* Location Info */}
      <View style={styles.infoContainer}>
        <View style={styles.locationRow}>
          <MaterialIcons name="radio-button-checked" size={16} color={COLORS.primary} />
          <Text style={styles.locationText}>
            {typeof ride.pickupLocation === 'string' ? ride.pickupLocation : 'Điểm đón'}
          </Text>
        </View>
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={16} color={COLORS.danger} />
          <Text style={styles.locationText}>
            {typeof ride.dropoffLocation === 'string' ? ride.dropoffLocation : 'Địa điểm đến'}
          </Text>
        </View>
      </View>

      {/* Time Row */}
      <View style={styles.timeContainer}>
        <View style={styles.timeItem}>
          <MaterialIcons name="schedule" size={14} color={COLORS.textSecondary} />
          <Text style={styles.timeText}>{ride.pickupTime}</Text>
        </View>
        <View style={styles.timeItem}>
          <MaterialIcons name="timer" size={14} color={COLORS.textSecondary} />
          <Text style={styles.timeText}>{ride.time}</Text>
        </View>
        <View style={styles.ratingItem}>
          <MaterialIcons name="star" size={14} color={COLORS.warning} />
          <Text style={styles.ratingText}>{ride.rating}</Text>
        </View>
      </View>

      {/* View Details Button */}
      <TouchableOpacity
        style={styles.acceptButton}
        onPress={handleAccept}
        activeOpacity={0.8}
      >
        <Text style={styles.acceptButtonText}>Xem chi tiết</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  infoContainer: {
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  locationText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  timeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
    marginBottom: SPACING.md,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginLeft: 'auto',
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.text,
  },
  acceptButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  acceptButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
})
