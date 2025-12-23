/**
 * EXAMPLE: Cách sử dụng DriverService trong HomeScreen
 * 
 * Đây là ví dụ minh họa cách tích hợp API tài xế vào React Native app
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { COLORS, SPACING, BORDER_RADIUS, FILTER_TYPES } from '../constants';
import { RideCard, BalanceCard } from '../components';
import { driverService } from '../services/driverService';
import type { RootState } from '../redux/store';
import type { RideItem } from '../types';

const mockRides: RideItem[] = [
  {
    id: '1',
    type: 'POOL',
    price: 250000,
    pickupLocation: 'Điểm đón ở 2.8km',
    dropoffLocation: '123 Nguyễn Huệ, Quận 1',
    pickupTime: '22:00 hôm nay',
    time: '~7 phút',
    rating: 4.9,
    badge: 'GHÉP XE',
    badgeColor: '#ff9900',
  },
  // ... other mock rides
];

export default function HomeScreenWithAPI() {
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);

  // State từ API
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'pool' | 'assist'>('all');

  // Reference để tracking location update interval
  const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ===== LIFECYCLE HOOKS =====

  useEffect(() => {
    // Khi component mount, lấy dashboard data
    loadDashboard();

    // Cleanup khi unmount
    return () => {
      if (locationIntervalRef.current) {
        clearInterval(locationIntervalRef.current);
      }
    };
  }, []);

  // Khi status thay đổi, cập nhật location tracking
  useEffect(() => {
    if (isOnline && user?.driverId) {
      startLocationTracking();
    } else {
      stopLocationTracking();
    }
  }, [isOnline, user?.driverId]);

  // ===== API CALLS =====

  /**
   * Lấy dashboard data từ server
   */
  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const data = await driverService.getDashboard();
      setDashboardData(data);
      setIsOnline(data.isOnline);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Cập nhật trạng thái online/offline
   */
  const handleToggleOnline = async (newStatus: boolean) => {
    try {
      setIsUpdatingStatus(true);
      if (!user?.driverId) return;

      const status = newStatus ? 'online' : 'offline';
      await driverService.updateStatus(user.driverId, status);

      setIsOnline(newStatus);
      setDashboardData((prev: any) => ({
        ...prev,
        isOnline: newStatus,
        status: status,
      }));

      Alert.alert('Thành công', newStatus ? 'Bạn đã trực tuyến' : 'Bạn đã ngoại tuyến');
    } catch (error) {
      console.error('Failed to update status:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật trạng thái');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  /**
   * Bắt đầu tracking vị trí (cập nhật mỗi 10 giây)
   */
  const startLocationTracking = () => {
    if (!user?.driverId) return;

    // Cập nhật ngay lần đầu
    updateCurrentLocation();

    // Thiết lập interval để cập nhật 10 giây một lần
    locationIntervalRef.current = setInterval(() => {
      updateCurrentLocation();
    }, 10000); // 10 seconds
  };

  /**
   * Dừng tracking vị trí
   */
  const stopLocationTracking = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  /**
   * Lấy vị trí hiện tại và cập nhật lên server
   * TODO: Tích hợp với Geolocation API
   */
  const updateCurrentLocation = async () => {
    try {
      if (!user?.driverId) return;

      // TODO: Thay thế bằng real location từ device
      // import * as Location from 'expo-location';
      // const location = await Location.getCurrentPositionAsync({});
      // const { latitude, longitude, accuracy } = location.coords;

      // MOCK LOCATION (xóa khi có real location)
      const latitude = 10.7752;
      const longitude = 106.6889;
      const accuracy = 10;

      await driverService.updateLocation(user.driverId, {
        coordinates: [longitude, latitude],
        accuracy,
      });

      console.log('Location updated:', { latitude, longitude });
    } catch (error) {
      console.error('Failed to update location:', error);
      // Không hiển thị alert vì cập nhật location xảy ra liên tục
    }
  };

  /**
   * Chấp nhận một cuốc
   */
  const handleAcceptRide = (rideId: string) => {
    Alert.alert('Thành công', `Bạn đã nhận cuốc ${rideId}`);
    // TODO: Gọi API accept ride từ rides module
  };

  /**
   * Lấy doanh thu hôm nay
   */
  const handleViewEarnings = async () => {
    try {
      const earnings = await driverService.getTodayEarnings();
      Alert.alert(
        'Doanh thu hôm nay',
        `Tổng: ${earnings.totalEarnings.toLocaleString('vi-VN')}đ\n` +
          `Cuốc: ${earnings.totalTrips}\n` +
          `Tiền mặt: ${earnings.breakdown.cash.toLocaleString('vi-VN')}đ\n` +
          `Online: ${earnings.breakdown.online.toLocaleString('vi-VN')}đ\n` +
          `Tips: ${earnings.breakdown.tips.toLocaleString('vi-VN')}đ`,
      );
    } catch (error) {
      console.error('Failed to fetch earnings:', error);
      Alert.alert('Lỗi', 'Không thể tải dữ liệu doanh thu');
    }
  };

  // ===== RENDER =====

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const filteredRides = mockRides.filter((ride) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'pool') return ride.type === 'POOL';
    if (activeFilter === 'assist') return ride.type === 'ASSIST';
    return false;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Xin chào</Text>
            <Text style={styles.driverName}>{dashboardData?.name || 'Tài xế'}</Text>
          </View>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, isOnline && styles.statusOnline]} />
            <Text style={styles.statusText}>{isOnline ? 'Trực tuyến' : 'Ngoại tuyến'}</Text>
          </View>
        </View>

        {/* Balance Card với Toggle Online/Offline */}
        <BalanceCard
          amount={dashboardData?.totalEarnings || 0}
          dailyAmount={dashboardData?.totalEarnings || 0}
          increase={dashboardData?.totalRides || 0}
          isOnline={isOnline}
          isLoading={isUpdatingStatus}
          onToggleOnline={handleToggleOnline}
        />

        {/* Doanh thu hôm nay */}
        <TouchableOpacity
          style={styles.earningsButton}
          onPress={handleViewEarnings}
          disabled={isUpdatingStatus}
        >
          <MaterialIcons name="attach-money" size={20} color={COLORS.success} />
          <Text style={styles.earningsText}>Xem doanh thu hôm nay</Text>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Filter Buttons */}
        <FilterButtons activeFilter={activeFilter} onFilterChange={setActiveFilter} />

        {/* Rides List */}
        <View style={styles.ridesSection}>
          <Text style={styles.sectionTitle}>Chuyến đi có sẵn</Text>
          {filteredRides.length > 0 ? (
            filteredRides.map((ride) => (
              <RideCard key={ride.id} ride={ride} onAccept={handleAcceptRide} />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="inbox" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Không có chuyến đi nào</Text>
            </View>
          )}
        </View>

        {/* View More */}
        <TouchableOpacity style={styles.viewMoreButton}>
          <Text style={styles.viewMoreText}>Xem thêm</Text>
          <MaterialIcons name="chevron-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ===== FILTER BUTTONS COMPONENT =====

interface FilterButtonsProps {
  activeFilter: 'all' | 'pool' | 'assist';
  onFilterChange: (filter: 'all' | 'pool' | 'assist') => void;
}

const FilterButtons: React.FC<FilterButtonsProps> = ({ activeFilter, onFilterChange }) => {
  return (
    <View style={styles.filterContainer}>
      <FilterButton
        label="Tất cả"
        icon="apps"
        active={activeFilter === 'all'}
        onPress={() => onFilterChange('all')}
      />
      <FilterButton
        label="Ghép xe"
        icon="group"
        active={activeFilter === 'pool'}
        onPress={() => onFilterChange('pool')}
      />
      <FilterButton
        label="Lái xe hộ"
        icon="support-agent"
        active={activeFilter === 'assist'}
        onPress={() => onFilterChange('assist')}
      />
    </View>
  );
};

interface FilterButtonProps {
  label: string;
  icon: string;
  active: boolean;
  onPress: () => void;
}

const FilterButton: React.FC<FilterButtonProps> = ({ label, icon, active, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.filterButton, active && styles.filterButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={icon as any}
        size={20}
        color={active ? COLORS.primary : COLORS.textSecondary}
      />
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
};

// ===== STYLES =====

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    paddingHorizontal: SPACING.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  greeting: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  driverName: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  statusOnline: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
  },
  earningsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.success,
  },
  earningsText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  filterButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.primary,
  },
  ridesSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  viewMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.xl,
  },
  viewMoreText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
