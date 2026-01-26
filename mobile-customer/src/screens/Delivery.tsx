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
import AsyncStorage from '@react-native-async-storage/async-storage'

interface DeliveryProps {
    setRideMode: (mode: 'share' | 'hire' | 'delivery') => void
    onNavigateToConfirm?: (params: any) => void
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
export default function Delivery({ setRideMode, onNavigateToConfirm }: DeliveryProps) {
    const [pickup, setPickup] = useState('')
    const [dropoff, setDropoff] = useState('')
    const [goodsType, setGoodsType] = useState<string>('')
    const [weight, setWeight] = useState<string>('')
    const [vehicle, setVehicle] = useState<string>('bike')
    const [estimatedPrice, setEstimatedPrice] = useState<number>(0)
    const [loading, setLoading] = useState(false)
    const [pickupCoordinates, setPickupCoordinates] = useState<[number, number]>([105.8342, 21.0278]) // Default Hanoi
    const [dropoffCoordinates, setDropoffCoordinates] = useState<[number, number]>([105.8542, 21.0378])
    const [pickupSuggestions, setPickupSuggestions] = useState<any[]>([])
    const [dropoffSuggestions, setDropoffSuggestions] = useState<any[]>([])
    const [showPickupSuggestions, setShowPickupSuggestions] = useState(false)
    const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false)
    const [pickupSearchTimeout, setPickupSearchTimeout] = useState<NodeJS.Timeout | null>(null)
    const [dropoffSearchTimeout, setDropoffSearchTimeout] = useState<NodeJS.Timeout | null>(null)

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

    const handlePickupSuggestionSelect = (suggestion: any) => {
        setPickup(suggestion.fullText)
        setShowPickupSuggestions(false)
        setPickupSuggestions([])
    }

    const handleDropoffSuggestionSelect = (suggestion: any) => {
        setDropoff(suggestion.fullText)
        setShowDropoffSuggestions(false)
        setDropoffSuggestions([])
    }

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (pickupSearchTimeout) clearTimeout(pickupSearchTimeout)
            if (dropoffSearchTimeout) clearTimeout(dropoffSearchTimeout)
        }
    }, [])

    // Calculate price based on selections
    useEffect(() => {
        let basePrice = 20000
        if (vehicle === 'truck') basePrice = 50000
        if (weight === '>50') basePrice += 30000
        else if (weight === '20-50') basePrice += 15000
        setEstimatedPrice(basePrice)
    }, [vehicle, weight])

    const handleConfirm = async () => {
        if (!pickup || !dropoff || !goodsType || !weight) {
            Alert.alert('Thiếu thông tin', 'Vui lòng điền đầy đủ thông tin giao hàng')
            return
        }
        
        try {
            setLoading(true)
            
            // Get customer ID from AsyncStorage
            const userJson = await AsyncStorage.getItem('user')
            if (!userJson) {
                Alert.alert('Lỗi', 'Vui lòng đăng nhập lại')
                return
            }

            const user = JSON.parse(userJson)
            const userId = user.id || user._id

            // Create delivery order via API
            const deliveryData = {
                customerId: userId,
                pickupAddress: pickup,
                pickupCoordinates,
                dropoffAddress: dropoff,
                dropoffCoordinates,
                goodsType: goodsType as 'light' | 'bulky' | 'food',
                weight: weight as '<20' | '20-50' | '>50',
                vehicle: vehicle as 'bike' | 'truck',
                estimatedPrice,
            }

            const createdDelivery = await deliveryService.createDelivery(deliveryData)
            console.log('[Delivery] Created delivery:', createdDelivery)
            
            // Navigate to confirm screen with delivery ID
            if (onNavigateToConfirm) {
                onNavigateToConfirm({
                    deliveryId: createdDelivery._id,
                    pickup,
                    dropoff,
                    goodsType,
                    weight,
                    vehicle,
                    estimatedPrice
                })
            }
        } catch (error: any) {
            console.error('[Delivery] Create error:', error)
            Alert.alert('Lỗi', error.message || 'Không thể tạo đơn hàng. Vui lòng thử lại.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFillObject}>
                <MapViewComponent
                    height={'100%'}
                />
            </View>
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: "#fff" }]} onPress={() => setRideMode('share')}>
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
                                <FlatList
                                    data={pickupSuggestions}
                                    keyExtractor={(item, index) => `pickup-${index}`}
                                    style={styles.suggestionsDropdown}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.suggestionItem}
                                            onPress={() => handlePickupSuggestionSelect(item)}
                                        >
                                            <MaterialIcons name="location-on" size={20} color="#6B7280" />
                                            <View style={styles.suggestionContent}>
                                                <Text style={styles.suggestionMainText}>{item.mainText}</Text>
                                                <Text style={styles.suggestionSecondaryText}>{item.secondaryText}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
                            )}
                        </View>

                        <View style={styles.locationDivider}>
                            <View style={styles.dashedLine} />
                        </View>

                        <View style={[styles.inputGroup, showDropoffSuggestions && { zIndex: 100 }]}>
                            <View style={styles.inputRow}>
                                <View style={styles.iconWrapper}>
                                    <MaterialIcons name="location-on" size={20} color="#EF4444" />
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
                                <FlatList
                                    data={dropoffSuggestions}
                                    keyExtractor={(item, index) => `dropoff-${index}`}
                                    style={styles.suggestionsDropdown}
                                    keyboardShouldPersistTaps="handled"
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={styles.suggestionItem}
                                            onPress={() => handleDropoffSuggestionSelect(item)}
                                        >
                                            <MaterialIcons name="location-on" size={20} color="#6B7280" />
                                            <View style={styles.suggestionContent}>
                                                <Text style={styles.suggestionMainText}>{item.mainText}</Text>
                                                <Text style={styles.suggestionSecondaryText}>{item.secondaryText}</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )}
                                />
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
        maxHeight: '65%',
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
