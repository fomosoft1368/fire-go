import { useState, useEffect, useRef } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { COLORS, SPACING } from '../constants'
import { hourlyServiceService, HourlyRequest } from '../services/hourlyServiceService'
import { mapsService } from '../services/mapsService'
import MapViewComponent from '@/components/MapView'

export default function ActiveHourlyServiceScreen({ navigation, route }: any) {
    const { serviceId } = route.params || {}

    const [service, setService] = useState<HourlyRequest | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [elapsedTime, setElapsedTime] = useState(0)
    const [hasArrived, setHasArrived] = useState(false)
    const [currentLocation, setCurrentLocation] = useState<[number, number] | null>(null)
    const [locationCoords, setLocationCoords] = useState<{ latitude: number; longitude: number } | null>(null)
    const [routeCoordinates, setRouteCoordinates] = useState<Array<{ latitude: number; longitude: number }>>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        loadServiceDetails()
        startLocationTracking()
        const interval = setInterval(loadServiceDetails, 10000) // Refresh every 10s
        return () => clearInterval(interval)
    }, [serviceId])

    // Start tracking driver location
    const startLocationTracking = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                console.warn('[ActiveHourlyService] Location permission denied')
                return
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            })
            setCurrentLocation([location.coords.longitude, location.coords.latitude])

            // Watch location
            Location.watchPositionAsync(
                {
                    accuracy: Location.Accuracy.High,
                    distanceInterval: 10,
                },
                (newLocation) => {
                    setCurrentLocation([newLocation.coords.longitude, newLocation.coords.latitude])
                }
            )
        } catch (error) {
            console.error('[ActiveHourlyService] Location error:', error)
        }
    }

    // Timer for elapsed time
    useEffect(() => {
        if (service?.status === 'in_progress' && service.startTime) {
            const startTime = new Date(service.startTime).getTime()

            timerRef.current = setInterval(() => {
                const now = Date.now()
                const elapsed = Math.floor((now - startTime) / 1000)
                setElapsedTime(elapsed)
            }, 1000)

            return () => {
                if (timerRef.current) clearInterval(timerRef.current)
            }
        }
    }, [service?.status, service?.startTime])

    // Calculate route when location and destination are available
    useEffect(() => {
        const calculateRoute = async () => {
            if (currentLocation && locationCoords && service?.address) {
                try {
                    const startAddress = `${currentLocation[1]},${currentLocation[0]}`
                    const endAddress = service.address

                    console.log('[ActiveHourlyService] Calculating route:', { startAddress, endAddress })

                    const routeInfo = await mapsService.getRouteInfo(startAddress, endAddress)

                    if (routeInfo.routeCoordinates && routeInfo.routeCoordinates.length > 0) {
                        setRouteCoordinates(routeInfo.routeCoordinates)
                        console.log('[ActiveHourlyService] Route calculated:', routeInfo.routeCoordinates.length, 'points')
                    } else {
                        console.warn('[ActiveHourlyService] No route coordinates in response')
                    }
                } catch (error) {
                    console.error('[ActiveHourlyService] Route calculation error:', error)
                }
            }
        }

        calculateRoute()
    }, [currentLocation, locationCoords, service?.address])

    const loadServiceDetails = async () => {
        try {
            const data = await hourlyServiceService.getServiceDetail(serviceId)
            console.log('[ActiveHourlyService] Service data:', JSON.stringify(data, null, 2))
            console.log('[ActiveHourlyService] Customer info:', data.customerId)
            setService(data)

            // Geocode địa chỉ để lấy tọa độ
            if (data.address) {
                try {
                    const routeInfo = await mapsService.getRouteInfo(
                        currentLocation ? `${currentLocation[1]},${currentLocation[0]}` : data.address,
                        data.address
                    )

                    if (routeInfo.dropoff?.coordinates) {
                        setLocationCoords({
                            latitude: routeInfo.dropoff.coordinates.latitude,
                            longitude: routeInfo.dropoff.coordinates.longitude,
                        })
                    }
                } catch (error) {
                    console.error('[ActiveHourlyService] Geocoding error:', error)
                }
            }

            setLoading(false)
        } catch (error) {
            console.error('[ActiveHourlyService] Load error:', error)
            setLoading(false)
        }
    }

    const handleArriveAtLocation = () => {
        Alert.alert('Xác nhận', 'Bạn đã đến nơi làm việc?', [
            { text: 'Chưa', style: 'cancel' },
            {
                text: 'Đã đến',
                onPress: () => {
                    setHasArrived(true)
                    Alert.alert('Thành công', 'Bạn có thể bắt đầu làm việc khi sẵn sàng')
                },
            },
        ])
    }

    const handleStartWork = async () => {
        Alert.alert('Xác nhận', 'Bắt đầu làm việc?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Bắt đầu',
                onPress: async () => {
                    try {
                        setUpdating(true)
                        await hourlyServiceService.updateStatus(serviceId, 'in_progress', {
                            startTime: new Date().toISOString(),
                        })
                        await loadServiceDetails()
                    } catch (error: any) {
                        Alert.alert('Lỗi', error.message || 'Không thể bắt đầu công việc')
                    } finally {
                        setUpdating(false)
                    }
                },
            },
        ])
    }

    const handleCompleteWork = async () => {
        Alert.alert('Xác nhận', 'Hoàn thành công việc?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Hoàn thành',
                onPress: async () => {
                    try {
                        setUpdating(true)
                        await hourlyServiceService.updateStatus(serviceId, 'completed', {
                            endTime: new Date().toISOString(),
                        })
                        Alert.alert('Thành công', 'Đã hoàn thành công việc!', [
                            {
                                text: 'OK',
                                onPress: () => {
                                    navigation.reset({
                                        index: 0,
                                        routes: [{ name: 'HomeScreen' }],
                                    })
                                },
                            },
                        ])
                    } catch (error: any) {
                        Alert.alert('Lỗi', error.message || 'Không thể hoàn thành công việc')
                    } finally {
                        setUpdating(false)
                    }
                },
            },
        ])
    }

    const handleCall = () => {
        if (!service?.customerId?.phone) {
            Alert.alert('Lỗi', 'Không có số điện thoại')
            return
        }
        Linking.openURL(`tel:${service.customerId.phone}`)
    }

    const handleChat = () => {
        if (!service?.customerId?._id) return
        navigation.navigate('ChatScreen', {
            recipientId: service.customerId._id,
            recipientName: `${service.customerId.firstName} ${service.customerId.lastName}`,
        })
    }

    const handleOpenMaps = () => {
        if (!service?.address) return
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.address)}`
        Linking.openURL(url)
    }

    const formatTime = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600)
        const mins = Math.floor((seconds % 3600) / 60)
        const secs = seconds % 60
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.loadingText}>Đang tải...</Text>
                </View>
            </SafeAreaView>
        )
    }

    if (!service) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.errorContainer}>
                    <MaterialIcons name="error-outline" size={64} color="#ef4444" />
                    <Text style={styles.errorText}>Không tìm thấy dịch vụ</Text>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Text style={styles.backButtonText}>Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        )
    }

    const isConfirmed = service.status === 'confirmed'
    const isInProgress = service.status === 'in_progress'
    const selectedServices = service.services.filter((s) => s.selected)

    return (
        <View style={styles.container}>
            {/* Map */}
            <View style={StyleSheet.absoluteFillObject}>
                <MapViewComponent
                    height="100%"
                    initialRegion={locationCoords || currentLocation ? {
                        latitude: locationCoords?.latitude || currentLocation![1],
                        longitude: locationCoords?.longitude || currentLocation![0],
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    } : undefined}
                    pickupCoords={locationCoords || undefined}
                    routeCoordinates={routeCoordinates}
                />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: "#fff" }]} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
                </TouchableOpacity>
                <Text style={styles.logoText}>firego</Text>
            </View>

            {/* Bottom Sheet */}
            <View style={styles.bottomSheet}>
                <View style={styles.handleBarContainer}>
                    <View style={styles.handleBar} />
                </View>

                <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Customer Info */}
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Thông tin khách hàng</Text>

                        {/* Customer Details */}
                        <View style={styles.customerDetails}>
                            <View style={styles.customerInfo}>
                                <View style={styles.customerRow}>
                                    <MaterialIcons name="person" size={18} color={COLORS.primary} />
                                    <Text style={styles.customerLabel}>Họ và tên:</Text>
                                    <Text style={styles.customerValue}>
                                        {service.customerId?.firstName} {service.customerId?.lastName}
                                    </Text>
                                </View>
                                <View style={styles.customerRow}>
                                    <MaterialIcons name="phone" size={18} color={COLORS.primary} />
                                    <Text style={styles.customerLabel}>Số điện thoại:</Text>
                                    <Text style={styles.customerValue}>
                                        {service.customerId?.phone || 'Chưa có'}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.divider} />

                        <View style={styles.contactActions}>
                            <TouchableOpacity style={styles.callButton} onPress={handleCall}>
                                <MaterialIcons name="call" size={20} color="#fff" />
                                <Text style={styles.callButtonText}>Gọi điện</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.chatButton} onPress={handleChat}>
                                <MaterialIcons name="chat" size={20} color={COLORS.primary} />
                                <Text style={styles.chatButtonText}>Chat</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Location */}
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Địa chỉ làm việc</Text>
                        <View style={styles.locationSection}>
                            <MaterialIcons name="location-on" size={20} color="#ef4444" />
                            <Text style={styles.locationAddress}>{service.address}</Text>
                        </View>
                    </View>

                    {/* Schedule & Services Combined */}
                    <View style={styles.infoCard}>
                        <Text style={styles.cardTitle}>Chi tiết dịch vụ</Text>

                        <View style={styles.scheduleRow}>
                            <MaterialIcons name="event" size={18} color={COLORS.primary} />
                            <Text style={styles.scheduleText}>
                                {new Date(service.selectedDate).toLocaleDateString('vi-VN')}
                            </Text>
                        </View>
                        <View style={styles.scheduleRow}>
                            <MaterialIcons name="access-time" size={18} color={COLORS.primary} />
                            <Text style={styles.scheduleText}>{service.selectedTime}</Text>
                        </View>
                        <View style={styles.scheduleRow}>
                            <MaterialIcons name="timer" size={18} color={COLORS.primary} />
                            <Text style={styles.scheduleText}>{service.hours} giờ</Text>
                        </View>

                        <View style={styles.divider} />

                        {selectedServices.map((item, index) => (
                            <View key={index} style={styles.serviceRow}>
                                <View style={styles.serviceIcon}>
                                    <MaterialIcons name="cleaning-services" size={16} color={COLORS.primary} />
                                </View>
                                <Text style={styles.serviceName}>{item.name}</Text>
                                <Text style={styles.servicePrice}>+{(item.price / 1000).toFixed(0)}k</Text>
                            </View>
                        ))}
                        {service.notes && (
                            <>
                                <View style={styles.divider} />
                                <Text style={styles.notesLabel}>Ghi chú:</Text>
                                <Text style={styles.notesText}>{service.notes}</Text>
                            </>
                        )}

                        <View style={styles.divider} />

                        <View style={styles.pricingRow}>
                            <Text style={styles.pricingLabel}>Tổng chi phí</Text>
                            <Text style={styles.pricingValue}>{(service.estimatedPrice / 1000).toFixed(0)}k</Text>
                        </View>
                    </View>

                    <View style={{ height: 120 }} />
                </ScrollView>
            </View>

            {/* Action Button */}
            <View style={styles.bottomActions}>
                {isConfirmed && !hasArrived && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.navigateButton]}
                        onPress={handleArriveAtLocation}
                    >
                        <MaterialIcons name="navigation" size={24} color="#fff" />
                        <Text style={styles.actionButtonText}>Bắt đầu di chuyển</Text>
                    </TouchableOpacity>
                )}
                {isConfirmed && hasArrived && (
                    <TouchableOpacity
                        style={[styles.actionButton, updating && styles.actionButtonDisabled]}
                        onPress={handleStartWork}
                        disabled={updating}
                    >
                        {updating ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialIcons name="play-arrow" size={24} color="#fff" />
                                <Text style={styles.actionButtonText}>Bắt đầu làm việc</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
                {isInProgress && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.completeButton, updating && styles.actionButtonDisabled]}
                        onPress={handleCompleteWork}
                        disabled={updating}
                    >
                        {updating ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <MaterialIcons name="check-circle" size={24} color="#fff" />
                                <Text style={styles.actionButtonText}>Hoàn thành công việc</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
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
        top: 50,
        left: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 10,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
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
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 15,
        maxHeight: '50%',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
    },
    timerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#dcfce7',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    timerText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10b981',
    },
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        maxHeight: '60%',
        elevation: 8,
    },
    handleBarContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#cbd5e1',
        borderRadius: 2,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 120,
    },
    infoCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 12,
    },
    customerDetails: {
        marginBottom: 12,
    },
    customerInfo: {
        gap: 12,
    },
    customerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    customerLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748b',
        minWidth: 100,
    },
    customerValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
        flex: 1,
    },
    contactActions: {
        flexDirection: 'row',
        gap: 12,
    },
    callButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10b981',
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    callButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    chatButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 6,
    },
    chatButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    locationSection: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    locationAddress: {
        flex: 1,
        fontSize: 13,
        color: '#0f172a',
        lineHeight: 18,
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 8,
        backgroundColor: '#fff',
    },
    mapButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    scheduleText: {
        fontSize: 13,
        color: '#0f172a',
    },
    serviceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    serviceIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceName: {
        flex: 1,
        fontSize: 13,
        color: '#0f172a',
    },
    servicePrice: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 12,
    },
    notesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 6,
    },
    notesText: {
        fontSize: 12,
        color: '#64748b',
        lineHeight: 18,
    },
    pricingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    pricingLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },
    pricingValue: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.primary,
    },
    bottomActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingBottom: 32,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        gap: 8,
    },
    navigateButton: {
        backgroundColor: '#3b82f6',
    },
    completeButton: {
        backgroundColor: '#10b981',
    },
    actionButtonDisabled: {
        opacity: 0.6,
    },
    actionButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingText: {
        fontSize: 15,
        color: '#64748b',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 24,
    },
    errorText: {
        fontSize: 16,
        color: '#ef4444',
        fontWeight: '600',
    },
    backButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
})
