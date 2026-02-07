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
    console.log('🎯 RideCard handleAccept:', { 
      rideId: ride._id || ride.id, 
      sourceType: ride.sourceType, 
      type: ride.type 
    })
    
    if (onAccept) {
      // Call parent handler with full ride object (including sourceType)
      onAccept(ride)
    } else {
      // Fallback: determine navigation based on ride type
      const rideId = ride._id || ride.id
      
      if (ride.type === 'ASSIST') {
        // Lái xe hộ → RideDetailScreen
        console.log('📍 Fallback: Navigating to RideDetailScreen for ASSIST')
        // @ts-ignore - Navigation types not fully defined
        navigation.navigate('RideDetailScreen', { rideId })
      } else {
        // Ghép xe → RideRequestsScreen
        console.log('📍 Fallback: Navigating to RideRequestsScreen for POOL')
        // @ts-ignore - Navigation types not fully defined
        navigation.navigate('RideRequestsScreen', { rideId })
      }
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
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B00',
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
    fontSize: 14,
    color: '#0f172a',
    lineHeight: 20,
    fontWeight: '500',
  },
  timeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    marginBottom: SPACING.md,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  ratingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginLeft: 'auto',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  acceptButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
})
