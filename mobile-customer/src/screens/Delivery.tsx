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
    TextInput,
} from 'react-native'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import MapViewComponent from '../components/MapView'
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons'
import { deliveryService } from '../services/deliveryService'
import { mapsService } from '../services/mapsService'
import { rideService } from '../services/rideService'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useNavigation } from '@react-navigation/native'
import type { RootStackParamList } from '../types'

interface DeliveryProps {
    isScheduled?: boolean
    setIsScheduled?: (value: boolean) => void
    carType?: 'sedan' | 'suv' | 'truck'
    setCarType?: (type: 'sedan' | 'suv' | 'truck') => void
    licensePlate?: string
    setLicensePlate?: (value: string) => void
    transmission?: 'auto' | 'manual'
    setTransmission?: (type: 'auto' | 'manual') => void
    driverNote?: string
    setDriverNote?: (value: string) => void
    pickupLocation?: string
    setPickupLocation?: (value: string) => void
    dropoffLocation?: string
    setDropoffLocation?: (value: string) => void
    setRideMode?: (mode: 'share' | 'hire') => void
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
}
const GOODS_TYPES = [
    { key: 'light', label: 'Hàng nhẹ', icon: 'cube-outline' },
    { key: 'bulky', label: 'Cồng kềnh', icon: 'archive-outline' },
    { key: 'food', label: 'Thực phẩm', icon: 'food-apple-outline' },
];
const WEIGHTS = [
    { key: '<20', label: '< 20kg' },
    { key: '20-50', label: '20-50kg' },
    { key: '>50', label: '> 50kg' },
];
const VEHICLES = [
    { key: 'bike', label: 'Xe máy', desc: 'Phù hợp hàng nhỏ', icon: 'motorbike' },
    { key: 'truck', label: 'Xe tải nhỏ', desc: 'Sức tải 500kg', icon: 'truck-outline' },
];
export default function Delivery(props?: DeliveryProps) {
    const [pickup, setPickup] = useState('')
    const [dropoff, setDropoff] = useState('')
    const [goodsType, setGoodsType] = useState<string>('')
    const [weight, setWeight] = useState<string>('')
    const [vehicle, setVehicle] = useState<string>('bike')
    const [estimatedPrice, setEstimatedPrice] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [pickupCoordinates, setPickupCoordinates] = useState<[number, number]>([105.8342, 21.0278]) // Default Hanoi
    const [dropoffCoordinates, setDropoffCoordinates] = useState<[number, number]>([105.8542, 21.0378])
    const [isPickupSelected, setIsPickupSelected] = useState(false)
    const [isDropoffSelected, setIsDropoffSelected] = useState(false)
    const [routeInfo, setRouteInfo] = useState<any>(null)
    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([])
    const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([])
    const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
    const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
    const [pickupSearchTimeout, setPickupSearchTimeout] = useState<NodeJS.Timeout | null>(null)
    const [dropoffSearchTimeout, setDropoffSearchTimeout] = useState<NodeJS.Timeout | null>(null)
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
    const setRideMode = props?.setRideMode

    const handlePickupLocationChange = (text: string) => {
        setPickup(text)

        if (pickupSearchTimeout) {
            clearTimeout(pickupSearchTimeout)
        }

        if (text.trim().length >= 3) {
            setShowPickupSuggestions(true)
            const timeout = setTimeout(async () => {
                try {
                    console.log('[Delivery] Pickup search for:', text)
                    const suggestions = await mapsService.searchPlaces(text)
                    console.log('[Delivery] Pickup suggestions received:', suggestions.length)
                    setPickupSuggestions(suggestions)
                } catch (error) {
                    console.error('Error searching pickup locations:', error)
                    setPickupSuggestions([])
                }
            }, 500)
            setPickupSearchTimeout(timeout)
        } else {
            setPickupSuggestions([])
            if (text.trim().length === 0) {
                setShowPickupSuggestions(false)
            }
        }
    }

    const handleDropoffLocationChange = (text: string) => {
        setDropoff(text)

        if (dropoffSearchTimeout) {
            clearTimeout(dropoffSearchTimeout)
        }

        if (text.trim().length >= 3) {
            setShowDropoffSuggestions(true)
            const timeout = setTimeout(async () => {
                try {
                    console.log('[Delivery] Dropoff search for:', text)
                    const suggestions = await mapsService.searchPlaces(text)
                    console.log('[Delivery] Dropoff suggestions received:', suggestions.length)
                    setDropoffSuggestions(suggestions)
                } catch (error) {
                    console.error('Error searching dropoff locations:', error)
                    setDropoffSuggestions([])
                }
            }, 500)
            setDropoffSearchTimeout(timeout)
        } else {
            setDropoffSuggestions([])
            if (text.trim().length === 0) {
                setShowDropoffSuggestions(false)
            }
        }
    }

    const handlePickupSuggestionSelect = async (suggestion: any) => {
        setPickup(suggestion.fullText)
        setShowPickupSuggestions(false)
        setPickupSuggestions([])

        // Gọi geocode API để lấy tọa độ thực tế
        try {
            console.log('[Delivery] Geocoding pickup location:', suggestion.fullText)
            const geocodeResult = await mapsService.geocodeAddress(suggestion.fullText)

            if (geocodeResult && geocodeResult.coordinates) {
                const coords: [number, number] = [
                    geocodeResult.coordinates.longitude,
                    geocodeResult.coordinates.latitude
                ]
                setPickupCoordinates(coords)
                setIsPickupSelected(true)
                console.log('[Delivery] Pickup coordinates set:', coords)

                // Tự động tính tuyến đường nếu đã có điểm giao hàng
                if (dropoff.trim() && isDropoffSelected) {
                    console.log('[Delivery] Auto-calculating route...')
                    await calculateRoute(coords, dropoffCoordinates)
                }
            }
        } catch (error) {
            console.error('[Delivery] Geocoding error:', error)
            Alert.alert('Lỗi', 'Không thể lấy tọa độ điểm lấy hàng')
        }
    }

    const handleDropoffSuggestionSelect = async (suggestion: any) => {
        setDropoff(suggestion.fullText)
        setShowDropoffSuggestions(false)
        setDropoffSuggestions([])

        // Gọi geocode API để lấy tọa độ thực tế
        try {
            console.log('[Delivery] Geocoding dropoff location:', suggestion.fullText)
            const geocodeResult = await mapsService.geocodeAddress(suggestion.fullText)

            if (geocodeResult && geocodeResult.coordinates) {
                const coords: [number, number] = [
                    geocodeResult.coordinates.longitude,
                    geocodeResult.coordinates.latitude
                ]
                setDropoffCoordinates(coords)
                setIsDropoffSelected(true)
                console.log('[Delivery] Dropoff coordinates set:', coords)

                // Tự động tính tuyến đường nếu đã có điểm lấy hàng
                if (pickup.trim() && isPickupSelected) {
                    console.log('[Delivery] Auto-calculating route...')
                    await calculateRoute(pickupCoordinates, coords)
                }
            }
        } catch (error) {
            console.error('[Delivery] Geocoding error:', error)
            Alert.alert('Lỗi', 'Không thể lấy tọa độ điểm giao hàng')
        }
    }

    const calculateRoute = async (startCoords: [number, number], endCoords: [number, number]) => {
        try {
            console.log('[Delivery] Calculating route...');
            const directions = await rideService.getDirections(
                startCoords[0],
                startCoords[1],
                endCoords[0],
                endCoords[1],
            );

            console.log('[Delivery] Raw directions response:', directions);

            // Handle different response formats from backend
            let distance = 0;
            let duration = 0;
            let routeCoordinates: Array<{ latitude: number, longitude: number }> = [];

            // Format: features[0].geometry.coordinates and properties.summary
            if (directions.features?.[0]) {
                const feature = directions.features[0];

                // Get distance and duration
                if (feature.properties?.summary) {
                    distance = feature.properties.summary.distance;
                    duration = feature.properties.summary.duration;
                }

                // Get route coordinates from geometry
                if (feature.geometry?.coordinates) {
                    // OSRM returns coordinates as [lng, lat] pairs
                    routeCoordinates = feature.geometry.coordinates.map((coord: [number, number]) => ({
                        latitude: coord[1],
                        longitude: coord[0],
                    }));
                }
            }
            // Fallback: direct properties
            else if (directions.distance !== undefined && directions.duration !== undefined) {
                distance = directions.distance;
                duration = directions.duration;
            }
            // Fallback: routes array
            else if (directions.routes?.[0]) {
                distance = directions.routes[0].distance;
                duration = directions.routes[0].duration;
                if (directions.routes[0].geometry?.coordinates) {
                    routeCoordinates = directions.routes[0].geometry.coordinates.map((coord: [number, number]) => ({
                        latitude: coord[1],
                        longitude: coord[0],
                    }));
                }
            }

            console.log('[Delivery] Extracted:', { distance, duration, routeCoordinatesCount: routeCoordinates.length });

            if (!distance || !duration || distance === 0 || duration === 0) {
                console.error('[Delivery] Invalid distance or duration:', { distance, duration });
                Alert.alert('Lỗi', 'Không thể tính tuyến đường. Vui lòng kiểm tra địa chỉ và thử lại.');
                return;
            }

            // Convert distance from meters to km if needed
            const distanceKm = distance > 500 ? distance / 1000 : distance;

            setRouteInfo({
                distance: distanceKm,
                duration: duration,
                distanceText: `${distanceKm.toFixed(1)} km`,
                durationText: `~${Math.ceil(duration / 60)} phút`,
                routeCoordinates: routeCoordinates,
            });

            console.log('[Delivery] Route info set:', { distanceKm, duration, routeCoordinatesCount: routeCoordinates.length });
        } catch (error: any) {
            console.error('[Delivery] Route calculation error:', error);
            Alert.alert('Lỗi', error.message || 'Không thể tính toán tuyến đường');
        }
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (pickupSearchTimeout) clearTimeout(pickupSearchTimeout)
            if (dropoffSearchTimeout) clearTimeout(dropoffSearchTimeout)
        }
    }, [])

    // Calculate price based on selections and distance
    useEffect(() => {
        if (!routeInfo?.distance) {
            setEstimatedPrice(0)
            return
        }

        const distanceKm = routeInfo.distance

        // Base fare
        let basePrice = vehicle === 'truck' ? 30000 : 15000

        // Distance-based pricing
        let distancePrice = 0
        if (vehicle === 'bike') {
            // Xe máy: 8,000đ/km cho 5km đầu, 6,000đ/km sau đó
            if (distanceKm <= 5) {
                distancePrice = distanceKm * 8000
            } else {
                distancePrice = 5 * 8000 + (distanceKm - 5) * 6000
            }
        } else {
            // Xe tải: 15,000đ/km cho 5km đầu, 12,000đ/km sau đó
            if (distanceKm <= 5) {
                distancePrice = distanceKm * 15000
            } else {
                distancePrice = 5 * 15000 + (distanceKm - 5) * 12000
            }
        }

        // Weight surcharge
        let weightSurcharge = 0
        if (weight === '>50') weightSurcharge = 30000
        else if (weight === '20-50') weightSurcharge = 15000
        else if (weight === '<20') weightSurcharge = 5000

        // Goods type surcharge
        let goodsSurcharge = 0
        if (goodsType === 'bulky') goodsSurcharge = 10000
        else if (goodsType === 'food') goodsSurcharge = 5000

        // Total price
        const totalPrice = basePrice + distancePrice + weightSurcharge + goodsSurcharge

        setEstimatedPrice(Math.round(totalPrice / 1000) * 1000) // Round to nearest 1000
    }, [vehicle, weight, goodsType, routeInfo])

    const handleConfirm = async () => {
        if (!pickup || !dropoff || !goodsType || !weight) {
            Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin giao hàng')
            return
        }

        // Navigate to ConfirmDelivery screen with all data
        navigation.navigate('ConfirmDelivery', {
            pickup,
            dropoff,
            pickupCoordinates,
            dropoffCoordinates,
            goodsType,
            weight,
            vehicle,
            estimatedPrice,
            distance: routeInfo?.distanceText || '0 km',
            duration: routeInfo?.durationText || '0 phút',
        })
    }

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFillObject}>
                <MapViewComponent
                    height={'100%'}
                    initialRegion={{
                        latitude: pickupCoordinates[1],
                        longitude: pickupCoordinates[0],
                        latitudeDelta: 0.0922,
                        longitudeDelta: 0.0421,
                    }}
                    markers={[]}
                    pickupCoords={isPickupSelected ? {
                        latitude: pickupCoordinates[1],
                        longitude: pickupCoordinates[0],
                    } : undefined}
                    dropoffCoords={isDropoffSelected ? {
                        latitude: dropoffCoordinates[1],
                        longitude: dropoffCoordinates[0],
                    } : undefined}
                    routeCoordinates={routeInfo?.routeCoordinates || []}
                />
            </View>
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: "#fff" }]} onPress={() => {
                    if (setRideMode) {
                        setRideMode('share')
                    } else {
                        navigation.goBack()
                    }
                }}>
                    <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
                </TouchableOpacity>
                <Text style={styles.logoText}>firego</Text>
            </View>

            <View style={styles.card}>
                <View style={styles.handleBar} />

                {/* Title Section */}
                <View style={styles.cardHeader}>
                    <MaterialCommunityIcons name="truck-delivery" size={28} color="#FF6B00" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.cardTitle}>Giao hàng nhanh</Text>
                        <Text style={styles.cardSubtitle}>Vận chuyển hàng hóa an toàn</Text>
                    </View>
                    {estimatedPrice > 0 && (
                        <View style={styles.priceTag}>
                            <Text style={styles.priceTagText}>~{estimatedPrice.toLocaleString('vi-VN')}đ</Text>
                        </View>
                    )}
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
                    {/* Location Inputs */}
                    <View style={styles.locationsContainer}>
                        <View style={[styles.inputGroup, showPickupSuggestions && { zIndex: 100 }]}>
                            <View style={styles.inputRow}>
                                <View style={styles.iconWrapper}>
                                    <MaterialIcons name="radio-button-checked" size={20} color="#22C55E" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Điểm lấy hàng"
                                    placeholderTextColor="#9CA3AF"
                                    value={pickup}
                                    onChangeText={handlePickupLocationChange}
                                    onFocus={() => setShowPickupSuggestions(true)}
                                />
                            </View>

                            {showPickupSuggestions && pickupSuggestions.length > 0 && (
                                <View style={styles.suggestionsDropdown}>
                                    <ScrollView
                                        keyboardShouldPersistTaps="handled"
                                        nestedScrollEnabled={true}
                                    >
                                        {pickupSuggestions.map((item, index) => (
                                            <TouchableOpacity
                                                key={`pickup-${index}`}
                                                style={styles.suggestionItem}
                                                onPress={() => handlePickupSuggestionSelect(item)}
                                            >
                                                <MaterialIcons name="location-on" size={20} color="#6B7280" />
                                                <View style={styles.suggestionContent}>
                                                    <Text style={styles.suggestionMainText}>{item.mainText}</Text>
                                                    <Text style={styles.suggestionSecondaryText}>{item.secondaryText}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>

                        <View style={styles.locationDivider}>
                            <View style={styles.dashedLine} />
                        </View>

                        <View style={[styles.inputGroup, showDropoffSuggestions && { zIndex: 100 }]}>
                            <View style={styles.inputRow}>
                                <View style={styles.iconWrapper}>
                                    <MaterialIcons name="flag" size={20} color="#EF4444" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Điểm giao hàng"
                                    placeholderTextColor="#9CA3AF"
                                    value={dropoff}
                                    onChangeText={handleDropoffLocationChange}
                                    onFocus={() => setShowDropoffSuggestions(true)}
                                />
                            </View>

                            {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                                <View style={styles.suggestionsDropdown}>
                                    <ScrollView
                                        keyboardShouldPersistTaps="handled"
                                        nestedScrollEnabled={true}
                                    >
                                        {dropoffSuggestions.map((item, index) => (
                                            <TouchableOpacity
                                                key={`dropoff-${index}`}
                                                style={styles.suggestionItem}
                                                onPress={() => handleDropoffSuggestionSelect(item)}
                                            >
                                                <MaterialIcons name="location-on" size={20} color="#6B7280" />
                                                <View style={styles.suggestionContent}>
                                                    <Text style={styles.suggestionMainText}>{item.mainText}</Text>
                                                    <Text style={styles.suggestionSecondaryText}>{item.secondaryText}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Goods Type */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Loại hàng hóa</Text>
                        <View style={styles.optionsRow}>
                            {GOODS_TYPES.map(type => (
                                <TouchableOpacity
                                    key={type.key}
                                    style={[
                                        styles.optionBtn,
                                        goodsType === type.key && styles.optionBtnActive
                                    ]}
                                    onPress={() => setGoodsType(type.key)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons
                                        name={type.icon as any}
                                        size={18}
                                        color={goodsType === type.key ? '#FF6B00' : '#6B7280'}
                                    />
                                    <Text style={[
                                        styles.optionBtnText,
                                        goodsType === type.key && styles.optionBtnTextActive
                                    ]}>
                                        {type.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Weight */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Trọng lượng ước tính</Text>
                        <View style={styles.optionsRow}>
                            {WEIGHTS.map(w => (
                                <TouchableOpacity
                                    key={w.key}
                                    style={[
                                        styles.weightBtn,
                                        weight === w.key && styles.weightBtnActive
                                    ]}
                                    onPress={() => setWeight(w.key)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.weightBtnText,
                                        weight === w.key && styles.weightBtnTextActive
                                    ]}>
                                        {w.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Vehicle Selection */}
                    <View style={styles.section}>
                        <Text style={styles.sectionLabel}>Phương tiện vận chuyển</Text>
                        <View style={styles.vehicleRow}>
                            {VEHICLES.map(v => (
                                <TouchableOpacity
                                    key={v.key}
                                    style={[
                                        styles.vehicleCard,
                                        vehicle === v.key && styles.vehicleCardActive
                                    ]}
                                    onPress={() => setVehicle(v.key)}
                                    activeOpacity={0.7}
                                >
                                    <MaterialCommunityIcons
                                        name={v.icon as any}
                                        size={32}
                                        color={vehicle === v.key ? '#FF6B00' : '#6B7280'}
                                    />
                                    <Text style={[
                                        styles.vehicleLabel,
                                        vehicle === v.key && styles.vehicleLabelActive
                                    ]}>
                                        {v.label}
                                    </Text>
                                    <Text style={styles.vehicleDesc}>{v.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </ScrollView>

                {/* Confirm Button */}
                <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirm}
                    activeOpacity={0.8}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.confirmButtonText}>Xác nhận đặt hàng</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
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
    handleBar: {
        width: 40,
        height: 5,
        backgroundColor: '#D1D5DB',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.3,
    },
    cardSubtitle: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    priceTag: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    priceTagText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#16A34A',
    },
    scrollContent: {
        flex: 1,
        marginBottom: 16,
    },
    locationsContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        overflow: 'visible',
    },
    inputGroup: {
        marginBottom: 0,
        position: 'relative',
        zIndex: 1,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
    },
    iconWrapper: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        backgroundColor: 'transparent',
        paddingVertical: 0,
    },
    locationDivider: {
        paddingVertical: 8,
        paddingLeft: 10,
    },
    dashedLine: {
        height: 20,
        width: 2,
        backgroundColor: '#D1D5DB',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    section: {
        marginBottom: 20,
    },
    sectionLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 12,
        letterSpacing: -0.2,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    optionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 6,
    },
    optionBtnActive: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FF6B00',
    },
    optionBtnText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    optionBtnTextActive: {
        color: '#FF6B00',
        fontWeight: '700',
    },
    weightBtn: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        minWidth: 90,
    },
    weightBtnActive: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FF6B00',
    },
    weightBtnText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    weightBtnTextActive: {
        color: '#FF6B00',
        fontWeight: '700',
    },
    vehicleRow: {
        flexDirection: 'row',
        gap: 12,
    },
    vehicleCard: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        alignItems: 'center',
        paddingVertical: 20,
        paddingHorizontal: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    vehicleCardActive: {
        backgroundColor: '#FFF7ED',
        borderColor: '#FF6B00',
    },
    vehicleLabel: {
        fontSize: 15,
        fontWeight: '700',
        color: '#374151',
        marginTop: 10,
        textAlign: 'center',
    },
    vehicleLabelActive: {
        color: '#FF6B00',
    },
    vehicleDesc: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 4,
        textAlign: 'center',
    },
    confirmButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        shadowColor: '#FF6B00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    confirmButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    suggestionsDropdown: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        borderRadius: BORDER_RADIUS.lg,
        marginTop: SPACING.xs,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        maxHeight: 200,
        zIndex: 1000,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 10,
        backgroundColor: '#fff',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
        gap: SPACING.md,
    },
    suggestionContent: {
        flex: 1,
    },
    suggestionMainText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#111827',
        marginBottom: SPACING.xs,
    },
    suggestionSecondaryText: {
        fontSize: 12,
        color: '#6B7280',
    },
})
