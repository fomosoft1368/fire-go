import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import type { RideBooking } from '../types'
import { StatusBadge } from './StatusBadge'

interface BookingCardProps {
  booking: RideBooking
  onPress: (bookingId: string) => void
}

export const BookingCard: React.FC<BookingCardProps> = ({ booking, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(booking.id)}
      activeOpacity={0.7}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleSection}>
          <Text style={styles.date}>{booking.bookingTime}</Text>
          <Text style={styles.rideType}>{booking.rideType.toUpperCase()}</Text>
        </View>
        <StatusBadge status={booking.status} />
      </View>

      {/* Location Info */}
      <View style={styles.locationInfo}>
        <View style={styles.locationRow}>
          <MaterialIcons name="radio-button-checked" size={16} color={COLORS.primary} />
          <Text style={styles.pickupText}>{booking.pickupLocation}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.locationRow}>
          <MaterialIcons name="location-on" size={16} color={COLORS.danger} />
          <Text style={styles.dropoffText}>{booking.dropoffLocation}</Text>
        </View>
      </View>

      {/* Details Row */}
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <MaterialIcons name="navigation" size={14} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{booking.distance}</Text>
        </View>
        <View style={styles.detailItem}>
          <MaterialIcons name="schedule" size={14} color={COLORS.textSecondary} />
          <Text style={styles.detailText}>{booking.estimatedTime}</Text>
        </View>
        <Text style={styles.fare}>{booking.estimatedFare.toLocaleString('vi-VN')}đ</Text>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.lightCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.lightBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.lg,
  },
  titleSection: {
    flex: 1,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  rideType: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  locationInfo: {
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.lightBg,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  pickupText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  divider: {
    height: 20,
    width: 1,
    backgroundColor: COLORS.lightBorder,
    marginVertical: SPACING.xs,
    marginLeft: 7,
  },
  dropoffText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    alignItems: 'center',
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  detailText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  fare: {
    marginLeft: 'auto',
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
})
