import React, { useState, useEffect, useRef } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    Alert,
    Modal,
    FlatList,
    Animated,
    Image,
    StatusBar,
    PanResponder,
    Dimensions,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import * as ImagePicker from 'expo-image-picker'
import { COLORS } from '../constants'
import { API_BASE_URL } from '../constants/config'
import MapViewComponent from '../components/MapView'
import { mapsService } from '../services/mapsService'
import { vehicleConditionService } from '../services/vehicleConditionService'
interface TripActivitiesProps {
    navigation: any
    route: any
}

interface Customer {
    _id: string
    name?: string
    firstName?: string
    lastName?: string
    phone: string
    rating: number
    avatar?: string
    address?: string
    totalFares?: number
}

const SCREEN_HEIGHT = Dimensions.get('window').height
const MIN_HEIGHT = SCREEN_HEIGHT * 0.42 // 42%
const MAX_HEIGHT = SCREEN_HEIGHT * 0.85 // 85%

export default function TripActivities({ navigation, route }: TripActivitiesProps) {
    const [ride, setRide] = useState<any>(null)
    const [customer, setCustomer] = useState<Customer | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [pickupCoords, setPickupCoords] = useState<{ latitude: number; longitude: number } | null>(null)
    const [dropoffCoords, setDropoffCoords] = useState<{ latitude: number; longitude: number } | null>(null)
    const [tripStatus, setTripStatus] = useState<'going_to_pickup' | 'arrived_at_pickup' | 'vehicle-condition-checked' | 'in_progress'>('going_to_pickup')
    const [unreadCount, setUnreadCount] = useState(0)
    const [routeInfo, setRouteInfo] = useState<any>(null)
    const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null)
    const [showVehicleCheckModal, setShowVehicleCheckModal] = useState(false)
    const [vehiclePhotos, setVehiclePhotos] = useState<string[]>([])

    // Bottom Sheet Animation
    const bottomSheetHeight = useRef(new Animated.Value(MIN_HEIGHT)).current
    const lastGestureDy = useRef(0)

    const rideId = route?.params?.rideId

    // Pan Responder for Bottom Sheet drag
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Chỉ bắt gesture khi vuốt dọc
                return Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
            },
            onPanResponderGrant: () => {
                bottomSheetHeight.setOffset(lastGestureDy.current)
            },
            onPanResponderMove: (_, gestureState) => {
                // Invert dy vì kéo lên là giá trị âm
                const newValue = -gestureState.dy
                // Clamp giá trị trong khoảng MIN và MAX
                if (lastGestureDy.current + newValue < MIN_HEIGHT) {
                    bottomSheetHeight.setValue(MIN_HEIGHT - lastGestureDy.current)
                } else if (lastGestureDy.current + newValue > MAX_HEIGHT) {
                    bottomSheetHeight.setValue(MAX_HEIGHT - lastGestureDy.current)
                } else {
                    bottomSheetHeight.setValue(newValue)
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                bottomSheetHeight.flattenOffset()
                const currentHeight = lastGestureDy.current - gestureState.dy

                // Tính threshold (giữa MIN và MAX)
                const threshold = (MIN_HEIGHT + MAX_HEIGHT) / 2

                // Snap tới MIN hoặc MAX dựa vào vị trí hiện tại
                const toValue = currentHeight > threshold ? MAX_HEIGHT : MIN_HEIGHT

                lastGestureDy.current = toValue

                Animated.spring(bottomSheetHeight, {
                    toValue,
                    useNativeDriver: false,
                    damping: 25,
                    stiffness: 120,
                }).start()
            },
        })
    ).current

    useEffect(() => {
        if (rideId) {
            fetchRideDetail()
            fetchUnreadCount()

            // Poll unread count every 5 seconds
            const interval = setInterval(fetchUnreadCount, 5000)
            return () => clearInterval(interval)
        }
    }, [rideId])

    // Lấy vị trí tài xế hiện tại
    useEffect(() => {
        let locationSubscription: Location.LocationSubscription | null = null

        const startLocationTracking = async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync()
                if (status !== 'granted') {
                    console.warn('⚠️ Location permission denied')
                    return
                }

                // Lấy vị trí hiện tại ngay
                const location = await Location.getCurrentPositionAsync({
                    accuracy: Location.Accuracy.High,
                })
                const coords = {
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                }
                console.log('📍 Driver location:', coords)
                setDriverLocation(coords)

                // Watch location updates
                locationSubscription = await Location.watchPositionAsync(
                    {
                        accuracy: Location.Accuracy.High,
                        timeInterval: 5000, // Update mỗi 5 giây
                        distanceInterval: 10, // Hoặc khi di chuyển 10 mét
                    },
                    (newLocation) => {
                        const newCoords = {
                            latitude: newLocation.coords.latitude,
                            longitude: newLocation.coords.longitude,
                        }
                        setDriverLocation(newCoords)
                    }
                )
            } catch (error) {
                console.error('❌ Error tracking location:', error)
            }
        }

        startLocationTracking()

        return () => {
            if (locationSubscription) {
                locationSubscription.remove()
            }
        }
    }, [])

    // Fetch route dựa theo trạng thái
    useEffect(() => {
        if (tripStatus === 'going_to_pickup' && driverLocation && pickupCoords) {
            // Đang đến điểm đón: hiển thị route từ driver → pickup
            fetchRoute()
        } else if ((tripStatus === 'arrived_at_pickup' || tripStatus === 'vehicle-condition-checked' || tripStatus === 'in_progress') && pickupCoords && dropoffCoords) {
            // Đã đến điểm đón hoặc đang trong chuyến: hiển thị route từ pickup → dropoff
            fetchRoute()
        }
    }, [tripStatus, driverLocation, pickupCoords, dropoffCoords])

    const fetchRideDetail = async () => {
        setLoading(true)
        try {
            const response = await fetch(`${API_BASE_URL}/rides/${rideId}`)

            if (!response.ok) {
                throw new Error('Failed to fetch ride details')
            }

            const data = await response.json()
            console.log('🚗 Trip data:', data)
            setRide(data)

            // Set trip status based on ride status
            if (data.status === 'in_progress') {
                setTripStatus('in_progress')
            } else if (data.status === 'accepted') {
                setTripStatus('going_to_pickup')
            }

            // Set coordinates - GeoJSON format: [longitude, latitude]
            if (data.pickupLocation?.coordinates && data.pickupLocation.coordinates.length === 2) {
                const coords = {
                    latitude: data.pickupLocation.coordinates[1],  // GeoJSON: [lng, lat]
                    longitude: data.pickupLocation.coordinates[0],
                }
                console.log('📍 Pickup coords:', coords)
                setPickupCoords(coords)
            } else if (data.pickupCoordinates) {
                // Fallback cho format cũ
                setPickupCoords({
                    latitude: data.pickupCoordinates[0],
                    longitude: data.pickupCoordinates[1],
                })
            }

            if (data.dropoffLocation?.coordinates && data.dropoffLocation.coordinates.length === 2) {
                const coords = {
                    latitude: data.dropoffLocation.coordinates[1],  // GeoJSON: [lng, lat]
                    longitude: data.dropoffLocation.coordinates[0],
                }
                console.log('📍 Dropoff coords:', coords)
                setDropoffCoords(coords)
            } else if (data.dropoffCoordinates) {
                // Fallback cho format cũ
                setDropoffCoords({
                    latitude: data.dropoffCoordinates[0],
                    longitude: data.dropoffCoordinates[1],
                })
            }

            // Set customer info if available
            if (data.customerId) {
                const customerData = Array.isArray(data.customerId) ? data.customerId[0] : data.customerId
                if (typeof customerData === 'object') {
                    setCustomer({
                        _id: customerData._id || customerData.id,
                        firstName: customerData.firstName,
                        lastName: customerData.lastName,
                        name: `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() || 'Khách hàng',
                        phone: customerData.phone || '',
                        rating: customerData.rating || 4.5,
                        avatar: customerData.avatar,
                        totalFares: customerData.totalFares,
                    })
                }
            }
        } catch (error: any) {
            console.error('❌ Error fetching ride detail:', error.message)
            Alert.alert('Lỗi', 'Không thể tải thông tin chuyến đi')
        } finally {
            setLoading(false)
        }
    }

    const fetchRoute = async () => {
        try {
            let originAddress: string
            let destinationAddress: string

            if (tripStatus === 'going_to_pickup') {
                // Đang đến điểm đón: route từ driver location → pickup
                if (!driverLocation || !pickupCoords) return

                originAddress = `${driverLocation.latitude},${driverLocation.longitude}`
                destinationAddress = `${pickupCoords.latitude},${pickupCoords.longitude}`

                console.log('🗺️ Fetching route: Driver → Pickup')
            } else {
                // Đã đến điểm đón hoặc đang trong chuyến: route từ pickup → dropoff
                if (!pickupCoords || !dropoffCoords) return

                originAddress = `${pickupCoords.latitude},${pickupCoords.longitude}`
                destinationAddress = `${dropoffCoords.latitude},${dropoffCoords.longitude}`

                console.log('🗺️ Fetching route: Pickup → Dropoff')
            }

            const route = await mapsService.getRouteInfo(originAddress, destinationAddress)
            setRouteInfo(route)

            console.log('✅ Route fetched:', {
                status: tripStatus,
                routePoints: route.routeCoordinates?.length || 0,
                distance: route.distance,
                duration: route.duration,
            })
        } catch (error: any) {
            console.error('❌ Error fetching route:', error)
        }
    }

    const fetchUnreadCount = async () => {
        if (!rideId) return

        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default
            const token = await AsyncStorage.getItem('token')
            if (!token) return

            const response = await fetch(`${API_BASE_URL}/messages/ride/${rideId}/unread-count`, {
                headers: { Authorization: `Bearer ${token}` }
            })

            if (response.ok) {
                const result = await response.json()
                setUnreadCount(result.data?.unreadCount || 0)
            }
        } catch (error) {
            // Ignore errors silently
        }
    }

    const handleGoBack = () => {
        navigation?.goBack()
    }

    const handleCall = () => {
        if (customer?.phone) {
            // Implement call functionality
            Alert.alert('Gọi điện', `Gọi đến ${customer.phone}`)
        }
    }

    const handleChat = () => {
        if (!navigation) return

        navigation.navigate('ChatScreen', {
            customer: {
                id: customer?._id,
                name: customer?.name || 'Khách hàng',
                phone: customer?.phone,
            },
            rideId: rideId,
        })
        setUnreadCount(0)
    }

    const handleArrivedAtPickup = async () => {
        setUpdating(true)
        try {
            // In real app, you might want to update status on backend
            // For now, just update local state
            setTripStatus('arrived_at_pickup')

            // Clear routeInfo để trigger re-fetch route mới (pickup → dropoff)
            setRouteInfo(null)

            Alert.alert('Thành công', 'Đã đến điểm đón. Hãy chờ khách hàng.')
        } catch (error: any) {
            console.error('❌ Error updating status:', error.message)
            Alert.alert('Lỗi', 'Không thể cập nhật trạng thái')
        } finally {
            setUpdating(false)
        }
    }

    const handleVehicleCheck = async () => {
        // Mở modal để chụp ảnh xe
        setShowVehicleCheckModal(true)
    }

    const handleTakePhoto = async () => {
        if (vehiclePhotos.length >= 5) {
            Alert.alert('Giới hạn ảnh', 'Bạn chỉ có thể chụp tối đa 5 ảnh')
            return
        }

        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert('Quyền truy cập', 'Cần cấp quyền sử dụng camera để chụp ảnh xe')
                return
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.3, // Giảm xuống 30% để tránh vượt 16MB MongoDB limit
            })

            if (!result.canceled && result.assets && result.assets[0]) {
                setVehiclePhotos([...vehiclePhotos, result.assets[0].uri])
            }
        } catch (error) {
            console.error('❌ Error taking photo:', error)
            Alert.alert('Lỗi', 'Không thể chụp ảnh')
        }
    }

    const handleRemovePhoto = (index: number) => {
        const newPhotos = vehiclePhotos.filter((_, i) => i !== index)
        setVehiclePhotos(newPhotos)
    }

    const handleConfirmVehicleCheck = async () => {
        if (vehiclePhotos.length === 0) {
            Alert.alert('Thiếu ảnh', 'Vui lòng chụp ít nhất 1 ảnh xe trước khi xác nhận')
            return
        }

        setUpdating(true)
        try {
            console.log(`📤 Uploading ${vehiclePhotos.length} images...`)

            // Upload ảnh lên server (lưu base64 trong MongoDB)
            const result = await vehicleConditionService.uploadVehicleCondition(
                rideId,
                'pre-trip',
                vehiclePhotos
            )

            console.log('✅ Vehicle condition saved:', result)

            setTripStatus('vehicle-condition-checked')
            setShowVehicleCheckModal(false)

            Alert.alert(
                'Thành công',
                `Đã lưu ${vehiclePhotos.length} ảnh kiểm tra xe.\nSẵn sàng bắt đầu chuyến đi.`
            )
        } catch (error: any) {
            console.error('❌ Error uploading vehicle condition:', error.message)
            Alert.alert('Lỗi', error.message || 'Không thể lưu ảnh. Vui lòng thử lại.')
        } finally {
            setUpdating(false)
        }
    }

    const handleStartTrip = async () => {
        setUpdating(true)
        try {
            // Get token from AsyncStorage
            const AsyncStorage = require('@react-native-async-storage/async-storage').default
            const token = await AsyncStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.')
            }

            console.log('🚗 Starting trip:', rideId)

            const response = await fetch(`${API_BASE_URL}/rides/${rideId}/start`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || `Failed: ${response.status}`)
            }

            const updated = await response.json()
            console.log('✅ Trip started:', updated)
            setRide(updated)
            setTripStatus('in_progress')
        } catch (error: any) {
            console.error('❌ Error starting trip:', error.message)
            Alert.alert('Lỗi', error.message || 'Không thể bắt đầu chuyến đi')
        } finally {
            setUpdating(false)
        }
    }

    const handleCompleteTrip = async () => {
        // Check if ride is actually in progress on backend
        if (ride?.status !== 'in_progress') {
            Alert.alert('Lỗi', 'Chuyến đi chưa được bắt đầu. Vui lòng bấm "Bắt đầu" trước.')
            return
        }

        setUpdating(true)
        try {
            // Get token from AsyncStorage
            const AsyncStorage = require('@react-native-async-storage/async-storage').default
            const token = await AsyncStorage.getItem('token')
            if (!token) {
                throw new Error('Không tìm thấy token. Vui lòng đăng nhập lại.')
            }

            console.log('🏁 Completing trip:', rideId)
            console.log('🔍 Current ride status:', ride?.status)

            const response = await fetch(`${API_BASE_URL}/rides/${rideId}/complete`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.message || `Failed: ${response.status}`)
            }

            const updated = await response.json()
            console.log('✅ Trip completed:', updated)

            // Navigate back to home screen (MainNavigator with tabs)
            navigation.reset({
                index: 0,
                routes: [{ name: 'HomeScreen' }],
            })
        } catch (error: any) {
            console.error('❌ Error completing trip:', error.message)
            Alert.alert('Lỗi', error.message || 'Không thể hoàn thành chuyến đi')
        } finally {
            setUpdating(false)
        }
    }

    return (
        <View style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
            <MapViewComponent
                style={StyleSheet.absoluteFillObject}
                initialRegion={pickupCoords ? {
                    latitude: pickupCoords.latitude,
                    longitude: pickupCoords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                } : undefined}
                pickupCoords={pickupCoords || undefined}
                dropoffCoords={dropoffCoords || undefined}
                driverCoords={driverLocation || undefined}
                routeCoordinates={routeInfo?.routeCoordinates || []}
            />
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.logoText}>firego</Text>
            </View>
            <Animated.View style={[styles.card, { height: bottomSheetHeight }]}>
                <View style={styles.handleBarContainer} {...panResponder.panHandlers}>
                    <View style={styles.handleBar} />
                </View>

                <ScrollView
                    showsVerticalScrollIndicator={false}
                    style={styles.cardContent}
                    contentContainerStyle={styles.cardContentContainer}
                >
                    {/* Customer Info Card */}
                    <View style={styles.customerCard}>
                        <View style={styles.customerInfo}>
                            <View style={styles.avatar}>
                                <MaterialIcons name="person" size={36} color="#fff" />
                            </View>
                            <View style={styles.customerDetails}>
                                <Text style={styles.customerName}>{customer?.name || 'Khách hàng'}</Text>
                                <View style={styles.ratingRow}>
                                    <MaterialIcons name="star" size={14} color="#FFB800" />
                                    <Text style={styles.ratingText}>{customer?.rating?.toFixed(1) || '4.8'}</Text>
                                    <Text style={styles.tripCount}>• chuyến đi</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.actionBtnCall} onPress={handleCall}>
                                <MaterialIcons name="call" size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtnChat} onPress={handleChat}>
                                <MaterialIcons name="chat-bubble" size={20} color="#fff" />
                                {unreadCount > 0 && (
                                    <View style={styles.badge}>
                                        <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Trip Status */}
                    <View style={styles.statusSection}>
                        <View style={styles.statusBadge}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>
                                {tripStatus === 'going_to_pickup' && 'Đang đến điểm đón'}
                                {tripStatus === 'arrived_at_pickup' && 'Đã đến điểm đón'}
                                {tripStatus === 'vehicle-condition-checked' && 'Đã kiểm tra xe'}
                                {tripStatus === 'in_progress' && 'Đang trong chuyến'}
                            </Text>
                        </View>
                        <Text style={styles.etaText}>Còn 5 phút</Text>
                    </View>

                    {/* Distance to Pickup */}
                    <View style={styles.distanceToPickupCard}>
                        <View style={styles.distanceToPickupLeft}>
                            <MaterialIcons name="navigation" size={24} color="#FF6B00" />
                            <View style={styles.distanceToPickupInfo}>
                                <Text style={styles.distanceToPickupLabel}>Khoảng cách đến điểm đón</Text>
                                <Text style={styles.distanceToPickupValue}>
                                    {routeInfo?.distance ? `${routeInfo.distance} km` : '0.0 km'} • {routeInfo?.duration ? `${routeInfo.duration} phút` : '0 phút'}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.navigationButton}>
                            <MaterialIcons name="directions" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    {/* Trip Info */}
                    <View style={styles.tripInfoSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="info-outline" size={20} color="#9CA3AF" />
                            <Text style={styles.sectionTitle}>Thông tin chuyến đi</Text>
                        </View>
                        <View style={styles.tripInfoGrid}>
                            <View style={styles.tripInfoItem}>
                                <Text style={styles.tripInfoLabel}>Mã chuyến</Text>
                                <Text style={styles.tripInfoValue}>#{ride?._id?.substring(0, 8) || 'ABC123'}</Text>
                            </View>
                            <View style={styles.tripInfoItem}>
                                <Text style={styles.tripInfoLabel}>Cước phí</Text>
                                <Text style={[styles.tripInfoValue, { color: '#FF6B00' }]}>{ride?.totalFare?.toLocaleString('vi-VN') || '75.000'}đ</Text>
                            </View>
                        </View>
                        <View style={styles.paymentBadge}>
                            <MaterialIcons name="account-balance-wallet" size={16} color="#9CA3AF" />
                            <Text style={styles.paymentText}>Thanh toán tiền mặt</Text>
                        </View>
                    </View>

                    {/* Route Section */}
                    <View style={styles.routeSection}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="route" size={20} color="#9CA3AF" />
                            <Text style={styles.sectionTitle}>Lộ trình</Text>
                        </View>

                        {/* Pickup */}
                        <View style={styles.locationItem}>
                            <View style={styles.locationIconWrapper}>
                                <View style={styles.pickupDot} />
                                <View style={styles.routeLine} />
                            </View>
                            <View style={styles.locationContent}>
                                <View style={styles.locationHeader}>
                                    <Text style={styles.locationLabel}>Điểm đón</Text>
                                    {ride?.distance && (
                                        <View style={styles.distanceBadge}>
                                            <MaterialIcons name="straighten" size={12} color="#9CA3AF" />
                                            <Text style={styles.distanceText}>{typeof ride.distance === 'number' ? ride.distance.toFixed(1) : ride.distance} km</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.locationAddress}>{ride?.pickupAddress || 'Đang tải...'}</Text>
                            </View>
                        </View>

                        {/* Dropoff */}
                        <View style={styles.locationItem}>
                            <View style={styles.locationIconWrapper}>
                                <MaterialIcons name="location-on" size={20} color="#EF4444" />
                            </View>
                            <View style={styles.locationContent}>
                                <Text style={styles.locationLabel}>Điểm trả</Text>
                                <Text style={styles.locationAddress}>{ride?.dropoffAddress || 'Đang tải...'}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Trip Metrics */}
                    <View style={styles.metricsGrid}>
                        <View style={styles.metricCard}>
                            <MaterialIcons name="straighten" size={18} color="#9CA3AF" />
                            <Text style={styles.metricValue}>{ride?.distance ? `${typeof ride.distance === 'number' ? ride.distance.toFixed(1) : ride.distance} km` : '0.0 km'}</Text>
                            <Text style={styles.metricLabel}>Tổng quãng đường</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <MaterialIcons name="schedule" size={18} color="#9CA3AF" />
                            <Text style={styles.metricValue}>{ride?.duration ? `${typeof ride.duration === 'number' ? Math.round(ride.duration) : ride.duration} phút` : '0 phút'}</Text>
                            <Text style={styles.metricLabel}>Thời gian dự kiến</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Fixed Bottom Actions */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={[styles.primaryButton, updating && { opacity: 0.6 }]}
                        onPress={
                            tripStatus === 'going_to_pickup'
                                ? handleArrivedAtPickup
                                : tripStatus === 'arrived_at_pickup'
                                    ? handleVehicleCheck
                                    : tripStatus === 'vehicle-condition-checked'
                                        ? handleStartTrip
                                        : handleCompleteTrip
                        }
                        disabled={updating}
                    >
                        {updating ? (
                            <ActivityIndicator size="small" color="#000" />
                        ) : (
                            <>
                                <MaterialIcons name="check-circle" size={20} color="#000" />
                                <Text style={styles.primaryButtonText}>
                                    {tripStatus === 'going_to_pickup' && 'Đã đến điểm đón'}
                                    {tripStatus === 'arrived_at_pickup' && 'Kiểm tra xe'}
                                    {tripStatus === 'vehicle-condition-checked' && 'Bắt đầu'}
                                    {tripStatus === 'in_progress' && 'Hoàn Thành'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </Animated.View>

            {/* Vehicle Check Modal */}
            <Modal
                visible={showVehicleCheckModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowVehicleCheckModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.vehicleCheckModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Kiểm tra tình trạng xe</Text>
                            <TouchableOpacity
                                onPress={() => setShowVehicleCheckModal(false)}
                                style={styles.closeButton}
                            >
                                <MaterialIcons name="close" size={24} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalSubtitle}>
                            Chụp ảnh xe từ nhiều góc độ (tối đa 5 ảnh)
                        </Text>

                        <ScrollView style={styles.photoList} showsVerticalScrollIndicator={false}>
                            <View style={styles.photoGrid}>
                                {vehiclePhotos.map((photo, index) => (
                                    <View key={index} style={styles.photoItem}>
                                        <Image source={{ uri: photo }} style={styles.photoImage} />
                                        <TouchableOpacity
                                            style={styles.removePhotoButton}
                                            onPress={() => handleRemovePhoto(index)}
                                        >
                                            <MaterialIcons name="close" size={16} color="#fff" />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                {vehiclePhotos.length < 5 && (
                                    <TouchableOpacity
                                        style={styles.addPhotoButton}
                                        onPress={handleTakePhoto}
                                    >
                                        <MaterialIcons name="add-a-photo" size={32} color="#FF6B00" />
                                        <Text style={styles.addPhotoText}>Chụp ảnh</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                        </ScrollView>

                        <View style={styles.photoCounter}>
                            <MaterialIcons name="photo-camera" size={16} color="#9CA3AF" />
                            <Text style={styles.photoCounterText}>
                                {vehiclePhotos.length}/5 ảnh
                            </Text>
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[
                                    styles.modalConfirmButton,
                                    (vehiclePhotos.length === 0 || updating) && { opacity: 0.5 }
                                ]}
                                onPress={handleConfirmVehicleCheck}
                                disabled={vehiclePhotos.length === 0 || updating}
                            >
                                {updating ? (
                                    <ActivityIndicator size="small" color="#000" />
                                ) : (
                                    <Text style={styles.modalConfirmButtonText}>Xác nhận</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    header: {
        position: 'absolute',
        top: 60,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 10,
    },
    backButton: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
    },
    logoText: {
        fontSize: 30,
        fontWeight: '700',
        letterSpacing: -0.5,
        color: '#FF6B00',
    },
    card: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: 16,
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 15,
    },
    handleBarContainer: {
        paddingVertical: 12,
        alignItems: 'center',
        width: '100%',
    },
    cardContent: {
        flex: 1,
    },
    cardContentContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: '#FFB380',
        borderRadius: 3,
    },
    // Customer Card
    customerCard: {
        backgroundColor: '#FFF5F0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#FFB380',
    },
    customerInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FF6B00',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#FFB380',
    },
    customerDetails: {
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 4,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
    tripCount: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionBtnCall: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionBtnChat: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#fff',
    },
    // Status Section
    statusSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFE5D9',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FFB380',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFB800',
    },
    statusText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
    },
    etaText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FF6B00',
    },
    // Distance to Pickup Card
    distanceToPickupCard: {
        backgroundColor: '#FFF5F0',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#FFB380',
    },
    distanceToPickupLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    distanceToPickupInfo: {
        marginLeft: 12,
        flex: 1,
    },
    distanceToPickupLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    distanceToPickupValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    navigationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FF6B00',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Section Header
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#6B7280',
    },
    // Trip Info Section
    tripInfoSection: {
        backgroundColor: '#FFF5F0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FFB380',
    },
    tripInfoGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    tripInfoItem: {
        flex: 1,
    },
    tripInfoLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    tripInfoValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
    },
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFE5D9',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    paymentText: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '500',
    },
    // Route Section
    routeSection: {
        backgroundColor: '#FFF5F0',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#FFB380',
    },
    locationItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    locationIconWrapper: {
        width: 24,
        alignItems: 'center',
        marginRight: 12,
    },
    pickupDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#22C55E',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    routeLine: {
        width: 2,
        height: 40,
        backgroundColor: '#FFB380',
        marginTop: 4,
    },
    locationContent: {
        flex: 1,
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    locationLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 4,
    },
    locationAddress: {
        fontSize: 14,
        color: '#1F2937',
        lineHeight: 20,
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#FFE5D9',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    distanceText: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '600',
    },
    // Metrics Grid
    metricsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#FFF5F0',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFB380',
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1F2937',
        marginTop: 6,
        marginBottom: 2,
    },
    metricLabel: {
        fontSize: 11,
        color: '#6B7280',
        fontWeight: '500',
        textAlign: 'center',
    },
    // Action Container
    actionContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: 1,
        borderTopColor: '#FFE5D9',
        backgroundColor: '#FFFFFF',
    },
    secondaryButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '#22C55E',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#22C55E',
    },
    primaryButton: {
        flex: 2,
        flexDirection: 'row',
        backgroundColor: '#FF6B00',
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    primaryButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
    },
    // Vehicle Check Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'flex-end',
    },
    vehicleCheckModal: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 20,
        paddingBottom: 30,
        paddingHorizontal: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FFF5F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 20,
    },
    photoList: {
        maxHeight: 300,
        marginBottom: 16,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    photoItem: {
        width: '30%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#FFF5F0',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    removePhotoButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addPhotoButton: {
        width: '30%',
        aspectRatio: 1,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#FF6B00',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF5F0',
    },
    addPhotoText: {
        fontSize: 12,
        color: '#FF6B00',
        marginTop: 4,
        fontWeight: '600',
    },
    photoCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        backgroundColor: '#FFF5F0',
        borderRadius: 8,
        marginBottom: 16,
    },
    photoCounterText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCancelButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#6B7280',
    },
    modalConfirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#FF6B00',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalConfirmButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
    },
})
