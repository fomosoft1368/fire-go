import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS } from '../constants'
import type { RideBooking } from '../types'

const mockBookings: RideBooking[] = [
  {
    id: 'booking_1',
    status: 'completed',
    pickupLocation: '123 Đường Láng',
    pickupDistrict: 'Đống Đa, Hà Nội',
    dropoffLocation: '456 Nguyễn Trãi',
    dropoffDistrict: 'Thanh Xuân, Hà Nội',
    distance: '12.5 km',
    estimatedTime: '28 phút',
    estimatedFare: 50000,
    actualFare: 50000,
    rideType: 'share',
    driverName: 'Nguyễn Văn B',
    driverRating: 5,
    carPlate: '51H-12345',
    bookingTime: '14:30 • 20/10/2023',
    startTime: '2024-12-14 14:35',
    endTime: '2024-12-14 14:58',
  },
  {
    id: 'booking_2',
    status: 'completed',
    pickupLocation: 'Nhà hàng Sen Tây Hồ',
    pickupDistrict: '614 Lạc Long Quân, Tây Hồ',
    dropoffLocation: 'KĐT Ciputra',
    dropoffDistrict: 'Nam Thăng Long, Hà Nội',
    distance: '18 km',
    estimatedTime: '35 phút',
    estimatedFare: 200000,
    actualFare: 200000,
    rideType: 'hire',
    driverName: 'Trần Thị C',
    driverRating: 5,
    carPlate: '51H-67890',
    bookingTime: '22:00 • 19/10/2023',
    startTime: '2024-12-13 09:15',
    endTime: '2024-12-13 09:50',
  },
  {
    id: 'booking_3',
    status: 'cancelled',
    pickupLocation: 'Aeon Mall Long Biên',
    pickupDistrict: '',
    dropoffLocation: 'Royal City',
    dropoffDistrict: '',
    distance: '8 km',
    estimatedTime: '20 phút',
    estimatedFare: 0,
    rideType: 'share',
    bookingTime: '08:15 • 15/10/2023',
  },
]

export default function BookingsScreen() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filterOptions = [
    { key: 'all', label: 'Tất cả' },
    { key: 'share', label: 'Ghép xe' },
    { key: 'hire', label: 'Lái xe hộ' },
  ]

  const filteredBookings = mockBookings.filter((booking) => {
    if (activeFilter === 'all') return true
    return booking.rideType === activeFilter
  })

  const getStatusBadge = (status: string) => {
    if (status === 'completed') {
      return { label: 'HOÀN THÀNH', color: '#10b981', bgColor: '#dcfce7' }
    } else if (status === 'cancelled') {
      return { label: 'ĐÃ HỦY', color: '#ef4444', bgColor: '#fee2e2' }
    } else if (status === 'in_progress') {
      return { label: 'ĐANG ĐI', color: '#3b82f6', bgColor: '#dbeafe' }
    }
  }

  const getRideTypeIcon = (rideType: string) => {
    return rideType === 'hire' ? 'person-apron' : 'commute'
  }

  const getRideTypeLabel = (rideType: string) => {
    return rideType === 'hire' ? 'Lái xe hộ' : 'Ghép xe'
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lịch sử chuyến đi</Text>
        <TouchableOpacity style={styles.calendarButton}>
          <MaterialIcons name="calendar-month" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        {filterOptions.map((option, index) => (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.filterTab,
              activeFilter === option.key && styles.filterTabActive,
              index === 0 && styles.filterTabFirst,
            ]}
            onPress={() => setActiveFilter(option.key)}
          >
            <Text
              style={[
                styles.filterTabText,
                activeFilter === option.key && styles.filterTabTextActive,
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bookings List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredBookings.map((booking) => {
          const badge = getStatusBadge(booking.status)
          const isCompleted = booking.status === 'completed'
          const isCancelled = booking.status === 'cancelled'
          const rideIcon = getRideTypeIcon(booking.rideType)
          const rideLabel = getRideTypeLabel(booking.rideType)

          return (
            <View
              key={booking.id}
              style={[styles.bookingCard, isCancelled && styles.bookingCardCancelled]}
            >
              {/* Card Header */}
              <View style={styles.cardHeader}>
                <View style={styles.headerLeft}>
                  <View
                    style={[
                      styles.iconContainer,
                      booking.rideType === 'hire'
                        ? styles.iconContainerHire
                        : styles.iconContainerShare,
                    ]}
                  >
                    <MaterialIcons
                      name={rideIcon as any}
                      size={20}
                      color={booking.rideType === 'hire' ? '#FF6B00' : '#FF6B00'}
                    />
                  </View>
                  <View style={styles.headerInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.rideTypeText}>{rideLabel}</Text>
                      {badge && (
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: badge.bgColor },
                          ]}
                        >
                          <Text
                            style={[styles.statusBadgeText, { color: badge.color }]}
                          >
                            {badge.label}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.bookingTime}>{booking.bookingTime}</Text>
                  </View>
                </View>
                <Text style={styles.fareText}>
                  {isCancelled ? (
                    <Text style={styles.fareTextCancelled}>0đ</Text>
                  ) : (
                    booking.estimatedFare.toLocaleString('vi-VN') + 'đ'
                  )}
                </Text>
              </View>

              {/* Route Visualization */}
              <View style={styles.routeSection}>
                <View style={styles.routeTimeline}>
                  {/* Pickup Dot */}
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isCancelled ? '#9ca3af' : '#10b981' },
                      isCancelled && styles.dotCancelled,
                    ]}
                  />
                  {/* Connector Line */}
                  <View
                    style={[
                      styles.connectorLine,
                      isCancelled && styles.connectorLineCancelled,
                    ]}
                  />
                  {/* Dropoff Dot */}
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: isCancelled ? '#9ca3af' : '#ef4444' },
                      isCancelled && styles.dotCancelled,
                    ]}
                  />
                </View>

                <View style={styles.routeInfo}>
                  {/* Pickup Location */}
                  <View style={styles.locationItem}>
                    <Text style={styles.locationName}>{booking.pickupLocation}</Text>
                    {booking.pickupDistrict && (
                      <Text style={styles.locationSubtitle}>
                        {booking.pickupDistrict}
                      </Text>
                    )}
                  </View>

                  {/* Dropoff Location */}
                  <View style={styles.locationItem}>
                    <Text style={styles.locationName}>
                      {booking.dropoffLocation}
                    </Text>
                    {booking.dropoffDistrict && (
                      <Text style={styles.locationSubtitle}>
                        {booking.dropoffDistrict}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {/* Card Footer */}
              {isCompleted && booking.rideType === 'share' && (
                <View style={styles.cardFooter}>
                  <View style={styles.starsContainer}>
                    {[0, 1, 2, 3, 4].map((i) => (
                      <MaterialIcons
                        key={i}
                        name="star"
                        size={20}
                        color="#fbbf24"
                        style={{ marginRight: 2 }}
                      />
                    ))}
                  </View>
                  <TouchableOpacity style={styles.rebookButton}>
                    <MaterialIcons name="replay" size={16} color="#94a3b8" />
                    <Text style={styles.rebookText}>Đặt lại</Text>
                  </TouchableOpacity>
                </View>
              )}
              {isCompleted && booking.rideType === 'hire' && (
                <TouchableOpacity style={styles.rateButton}>
                  <MaterialIcons
                    name="star-rate"
                    size={18}
                    color="#fff"
                    style={{ marginRight: SPACING.sm }}
                  />
                  <Text style={styles.rateButtonText}>Đánh giá tài xế</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        })}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  calendarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  filterContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  filterTab: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 20,
    backgroundColor: '#1a202c',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterTabFirst: {
    marginRight: SPACING.xs,
  },
  filterTabActive: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  bookingCard: {
    backgroundColor: '#1a202c',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: SPACING.lg,
    overflow: 'hidden',
  },
  bookingCardCancelled: {
    opacity: 0.65,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerShare: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
  },
  iconContainerHire: {
    backgroundColor: 'rgba(255, 107, 0, 0.15)',
  },
  headerInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  rideTypeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  bookingTime: {
    fontSize: 11,
    color: '#94a3b8',
  },
  fareText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B00',
    textAlign: 'right',
  },
  fareTextCancelled: {
    color: '#9ca3af',
    textDecorationLine: 'line-through',
  },
  routeSection: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  routeTimeline: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginBottom: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  dotCancelled: {
    shadowOpacity: 0.1,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(200, 200, 200, 0.4)',
    minHeight: 80,
  },
  connectorLineCancelled: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(150, 150, 150, 0.3)',
    borderLeftStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  routeInfo: {
    flex: 1,
    justifyContent: 'space-around',
  },
  locationItem: {
    paddingVertical: SPACING.md,
  },
  locationName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  locationSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  rebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  rebookText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  rateButton: {
    backgroundColor: '#FF6B00',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  rateButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
})
