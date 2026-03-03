import { useState } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Alert,
    TextInput,
    Image,
    ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { useEffect } from 'react'
import type { RootState } from '../redux/store'
import { hourlyServiceService } from '../services/hourlyServiceService'

interface AddOnService {
    id: string
    name: string
    price: number
    duration: number
    icon: string
    color: string
    selected: boolean
}

// Map backend icon names to Material Icons
const getIconName = (backendIcon: string): string => {
    const iconMap: { [key: string]: string } = {
        'sofa': 'chair',
        'window': 'window',
        'refrigerator': 'kitchen',
        'air_conditioner': 'ac-unit',
        'bed': 'bed',
        'carpet': 'foundation',
        'washing_machine': 'local-laundry-service',
        'kitchen': 'restaurant',
        'bathroom': 'bathroom',
    }
    return iconMap[backendIcon] || 'home-repair-service'
}

// Map backend icon names to colors
const getIconColor = (backendIcon: string): string => {
    const colorMap: { [key: string]: string } = {
        'sofa': '#FF6B35',
        'window': '#FF6B35',
        'refrigerator': '#FF6B35',
        'air_conditioner': '#FF6B35',
        'bed': '#FF6B35',
        'carpet': '#FF6B35',
        'washing_machine': '#FF6B35',
        'kitchen': '#FF6B35',
        'bathroom': '#FF6B35',
    }
    return colorMap[backendIcon] || '#FF6B35'
}

export default function HourlyService() {
    const navigation = useNavigation()
    const { user } = useSelector((state: RootState) => state.auth)
    const [hours, setHours] = useState(3)
    const [selectedDate, setSelectedDate] = useState(5)
    const [selectedTime, setSelectedTime] = useState('09:30')
    const [propertyType, setPropertyType] = useState<'apartment' | 'house'>('apartment')
    const [address, setAddress] = useState('')
    const [notes, setNotes] = useState('')
    const [loading, setLoading] = useState(false)
    const [loadingServices, setLoadingServices] = useState(true)
    const [services, setServices] = useState<AddOnService[]>([])
    const [showAllServices, setShowAllServices] = useState(false)

    const timeSlots = ['08:00', '09:30', '13:00', '15:30', '17:00']
    const basePrice = 250000
    const MAX_VISIBLE_SERVICES = 3

    // Fetch addon services từ API khi component mount
    useEffect(() => {
        fetchAddonServices()
    }, [])

    const fetchAddonServices = async () => {
        try {
            setLoadingServices(true)
            const addonServices = await hourlyServiceService.getAddonServices()
            
            // Map dữ liệu từ backend sang format của component
            const mappedServices: AddOnService[] = addonServices.map((service: any) => ({
                id: service._id,
                name: service.name,
                price: service.price,
                duration: service.duration,
                icon: getIconName(service.icon),
                color: getIconColor(service.icon),
                selected: false,
            }))

            setServices(mappedServices)
        } catch (error) {
            console.error('[HourlyService] Error fetching addon services:', error)
            // Fallback to empty array if error
            setServices([])
            Alert.alert('Thông báo', 'Không thể tải các dịch vụ bổ sung')
        } finally {
            setLoadingServices(false)
        }
    }

    const totalAddOnPrice = services
        .filter(s => s.selected)
        .reduce((sum, s) => sum + s.price, 0)

    const totalPrice = basePrice + totalAddOnPrice

    const handleToggleService = (id: string) => {
        setServices(services.map(s =>
            s.id === id ? { ...s, selected: !s.selected } : s
        ))
    }

    const handleContinue = async () => {
        if (!user?.id) {
            Alert.alert('Lỗi', 'Không tìm thấy thông tin người dùng')
            return
        }

        if (!address.trim()) {
            Alert.alert('Lỗi', 'Vui lòng nhập địa chỉ')
            return
        }

        setLoading(true)
        try {
            const payload = {
                customerId: user.id,
                hours,
                selectedDate,
                selectedTime,
                propertyType,
                address,
                notes: notes.trim(),
                services: services.map(({ id, name, price, duration, selected }) => ({
                    id,
                    name,
                    price,
                    duration,
                    selected,
                })),
                estimatedPrice: totalPrice,
            }

            console.log('[HourlyService] Creating service with payload:', payload)

            const response = await hourlyServiceService.createService(payload)

            console.log('[HourlyService] Service created successfully:', response)

            Alert.alert('Thành công', 'Dịch vụ đã được tạo. Vui lòng chờ xác nhận từ nhân viên.', [
                {
                    text: 'OK',
                    onPress: () => {
                        navigation.navigate('FindingService' as never, { 
                            serviceId: response._id,
                            serviceType: 'hourly'
                        } as never)
                    },
                },
            ])
        } catch (error: any) {
            console.error('[HourlyService] Error creating service:', error)
            const errorMessage = error?.message || 'Không thể tạo dịch vụ. Vui lòng thử lại.'
            Alert.alert('Lỗi', errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const getDaysInMonth = (month: number, year: number) => {
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (month: number, year: number) => {
        return new Date(year, month, 1).getDay()
    }

    const currentDate = new Date()
    const month = currentDate.getMonth()
    const year = currentDate.getFullYear()
    const daysInMonth = getDaysInMonth(month, year)
    const firstDay = getFirstDayOfMonth(month, year)

    const monthName = currentDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <MaterialIcons name="arrow-back" size={24} color="#FF6B35" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Đặt dịch vụ Vệ sinh</Text>
                <View style={{ width: 48 }} />
            </View>

            <ScrollView
                style={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Duration & Time Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thời lượng & Thời gian</Text>
                    <View style={styles.durationCard}>
                        <View style={styles.durationLeft}>
                            <Text style={styles.durationLabel}>Số giờ làm việc</Text>
                            <Text style={styles.durationSubtext}>Khuyên dùng cho căn hộ 2PN</Text>
                        </View>
                        <View style={styles.durationControl}>
                            <TouchableOpacity
                                style={styles.minusButton}
                                onPress={() => setHours(Math.max(1, hours - 1))}
                            >
                                <MaterialIcons name="remove" size={20} color="#333" />
                            </TouchableOpacity>
                            <TextInput
                                style={styles.hoursInput}
                                value={String(hours)}
                                editable={false}
                            />
                            <TouchableOpacity
                                style={styles.plusButton}
                                onPress={() => setHours(hours + 1)}
                            >
                                <MaterialIcons name="add" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Calendar */}
                    <View style={styles.calendarCard}>
                        <View style={styles.calendarHeader}>
                            <TouchableOpacity style={styles.calendarNav}>
                                <MaterialIcons name="chevron-left" size={24} color="#FF6B35" />
                            </TouchableOpacity>
                            <Text style={styles.monthText}>{monthName}</Text>
                            <TouchableOpacity style={styles.calendarNav}>
                                <MaterialIcons name="chevron-right" size={24} color="#FF6B35" />
                            </TouchableOpacity>
                        </View>

                        {/* Day headers */}
                        <View style={styles.dayHeadersRow}>
                            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((day) => (
                                <Text key={day} style={styles.dayHeader}>{day}</Text>
                            ))}
                        </View>

                        {/* Calendar days */}
                        <View style={styles.daysGrid}>
                            {Array.from({ length: firstDay }).map((_, i) => (
                                <View key={`empty-${i}`} />
                            ))}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1
                                const isSelected = day === selectedDate
                                return (
                                    <TouchableOpacity
                                        key={day}
                                        style={[
                                            styles.dayButton,
                                            isSelected && styles.dayButtonSelected,
                                        ]}
                                        onPress={() => setSelectedDate(day)}
                                    >
                                        <Text
                                            style={[
                                                styles.dayText,
                                                isSelected && styles.dayTextSelected,
                                            ]}
                                        >
                                            {day}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </View>

                    {/* Time Slots */}
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.timeSlotScroll}
                    >
                        {timeSlots.map((time) => (
                            <TouchableOpacity
                                key={time}
                                style={[
                                    styles.timeSlot,
                                    selectedTime === time && styles.timeSlotSelected,
                                ]}
                                onPress={() => setSelectedTime(time)}
                            >
                                <Text
                                    style={[
                                        styles.timeSlotText,
                                        selectedTime === time && styles.timeSlotTextSelected,
                                    ]}
                                >
                                    {time}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Property Type Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Loại hình nhà ở</Text>
                    <View style={styles.propertyTypeContainer}>
                        <TouchableOpacity
                            style={[
                                styles.propertyTypeButton,
                                propertyType === 'apartment' && styles.propertyTypeButtonSelected,
                            ]}
                            onPress={() => setPropertyType('apartment')}
                        >
                            <View style={[
                                styles.propertyTypeIcon,
                                propertyType === 'apartment' && styles.propertyTypeIconSelected,
                            ]}>
                                <MaterialIcons 
                                    name="apartment" 
                                    size={28} 
                                    color={propertyType === 'apartment' ? '#FF6B35' : '#64748b'} 
                                />
                            </View>
                            <Text style={[
                                styles.propertyTypeText,
                                propertyType === 'apartment' && styles.propertyTypeTextSelected,
                            ]}>
                                Chung cư
                            </Text>
                            <Text style={styles.propertyTypeSubtext}>
                                Căn hộ, chung cư
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.propertyTypeButton,
                                propertyType === 'house' && styles.propertyTypeButtonSelected,
                            ]}
                            onPress={() => setPropertyType('house')}
                        >
                            <View style={[
                                styles.propertyTypeIcon,
                                propertyType === 'house' && styles.propertyTypeIconSelected,
                            ]}>
                                <MaterialIcons 
                                    name="home" 
                                    size={28} 
                                    color={propertyType === 'house' ? '#FF6B35' : '#64748b'} 
                                />
                            </View>
                            <Text style={[
                                styles.propertyTypeText,
                                propertyType === 'house' && styles.propertyTypeTextSelected,
                            ]}>
                                Nhà ở
                            </Text>
                            <Text style={styles.propertyTypeSubtext}>
                                Nhà riêng, biệt thự
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Address Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Địa điểm làm việc</Text>
                    <View style={styles.addressCard}>
                        <Image
                            source={{ uri: 'https://via.placeholder.com/400x150?text=Map' }}
                            style={styles.mapImage}
                        />
                        <View style={styles.locationPin}>
                            <MaterialIcons name="location-on" size={24} color="#fff" />
                        </View>
                        <View style={styles.addressInputContainer}>
                            <MaterialIcons name="home" size={20} color="#FF6B35" />
                            <View style={styles.inputWrapper}>
                                <Text style={styles.inputLabel}>Địa chỉ chi tiết</Text>
                                <TextInput
                                    style={styles.addressInput}
                                    value={address}
                                    onChangeText={setAddress}
                                    placeholder="Nhập địa chỉ..."
                                />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Add-on Services */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Dịch vụ</Text>
                    {loadingServices ? (
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                            <ActivityIndicator size="large" color="#FF6B35" />
                            <Text style={{ marginTop: 8, color: '#999' }}>Đang tải dịch vụ...</Text>
                        </View>
                    ) : services.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                            <MaterialIcons name="inbox" size={48} color="#ddd" />
                            <Text style={{ marginTop: 8, color: '#999', textAlign: 'center' }}>
                                Không có dịch vụ bổ sung nào
                            </Text>
                        </View>
                    ) : (
                        <>
                            {(showAllServices ? services : services.slice(0, MAX_VISIBLE_SERVICES)).map((service) => (
                                <TouchableOpacity
                                    key={service.id}
                                    style={[
                                        styles.serviceItem,
                                        service.selected && styles.serviceItemSelected,
                                    ]}
                                    onPress={() => handleToggleService(service.id)}
                                >
                                    <View style={styles.serviceLeft}>
                                        <View
                                            style={[
                                                styles.serviceIcon,
                                                { backgroundColor: service.color + '20' },
                                            ]}
                                        >
                                            <MaterialIcons
                                                name={service.icon as any}
                                                size={20}
                                                color={service.color}
                                            />
                                        </View>
                                        <View style={styles.serviceInfo}>
                                            <Text style={styles.serviceName}>{service.name}</Text>
                                            <Text style={styles.serviceDuration}>
                                                +{service.duration} phút
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.serviceRight}>
                                        <Text style={styles.servicePrice}>
                                            {service.price.toLocaleString('vi-VN')}đ
                                        </Text>
                                        <View
                                            style={[
                                                styles.checkbox,
                                                service.selected && styles.checkboxSelected,
                                            ]}
                                        >
                                            {service.selected && (
                                                <MaterialIcons name="check" size={16} color="#fff" />
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            
                            {services.length > MAX_VISIBLE_SERVICES && (
                                <TouchableOpacity
                                    style={styles.showMoreButton}
                                    onPress={() => setShowAllServices(!showAllServices)}
                                >
                                    <Text style={styles.showMoreButtonText}>
                                        {showAllServices 
                                            ? `Ẩn bớt (${MAX_VISIBLE_SERVICES} trên ${services.length})`
                                            : `Xem thêm ${services.length - MAX_VISIBLE_SERVICES} dịch vụ khác`
                                        }
                                    </Text>
                                    <MaterialIcons 
                                        name={showAllServices ? "expand-less" : "expand-more"} 
                                        size={20} 
                                        color="#FF6B35" 
                                    />
                                </TouchableOpacity>
                            )}
                        </>
                    )}
                </View>

                {/* Notes Section */}
                <View style={styles.section}>
                    <Text style={styles.notesLabel}>Ghi chú cho nhân viên</Text>
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Ví dụ: Nhà có chó nhỏ, vui lòng mang theo máy hút bụi..."
                        multiline
                        value={notes}
                        onChangeText={setNotes}
                        numberOfLines={5}
                    />
                </View>

                {/* Bottom spacing for fixed button */}
                <View style={{ height: 150 }} />
            </ScrollView>

            {/* Sticky Bottom Action */}
            <View style={styles.bottomAction}>
                <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Tổng cộng</Text>
                    <Text style={styles.totalPrice}>
                        {totalPrice.toLocaleString('vi-VN')}đ
                    </Text>
                </View>
                <TouchableOpacity
                    style={[styles.continueButton, loading && styles.continueButtonDisabled]}
                    onPress={handleContinue}
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text style={styles.continueButtonText}>Đang xử lý...</Text>
                        </>
                    ) : (
                        <>
                            <Text style={styles.continueButtonText}>Xem giá & Tiếp tục</Text>
                            <MaterialIcons name="arrow-forward" size={20} color="#fff" />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        elevation: 2,
        paddingTop: 30,
    },
    backButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        flex: 1,
        textAlign: 'center',
    },
    scrollContent: {
        flex: 1,
        backgroundColor: '#fff',
    },
    section: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 12,
    },
    durationCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
        elevation: 2,
    },
    durationLeft: {
        flex: 1,
    },
    durationLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 4,
    },
    durationSubtext: {
        fontSize: 14,
        color: '#64748b',
    },
    durationControl: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f1f5f9',
        borderRadius: 24,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 12,
    },
    minusButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 1,
    },
    hoursInput: {
        width: 24,
        textAlign: 'center',
        fontSize: 18,
        fontWeight: '700',
        color: '#0f172a',
    },
    plusButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 2,
    },
    calendarCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 16,
        elevation: 2,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    calendarNav: {
        padding: 8,
    },
    monthText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },
    dayHeadersRow: {
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-around',
    },
    dayHeader: {
        flex: 1,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
    },
    dayButton: {
        width: '14.28%',
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        marginBottom: 8,
    },
    dayButtonSelected: {
        backgroundColor: '#FF6B35',
    },
    dayText: {
        fontSize: 14,
        color: '#64748b',
    },
    dayTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    timeSlotScroll: {
        marginBottom: 16,
    },
    timeSlot: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        marginHorizontal: 4,
        backgroundColor: '#fff',
    },
    timeSlotSelected: {
        backgroundColor: '#FF6B35',
        borderColor: '#FF6B35',
    },
    timeSlotText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    timeSlotTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    divider: {
        height: 8,
        backgroundColor: '#f1f5f9',
    },
    addressCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        elevation: 2,
    },
    mapImage: {
        width: '100%',
        height: 128,
        backgroundColor: '#cbd5e1',
    },
    locationPin: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginTop: -12,
        marginLeft: -12,
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 107, 53, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
        elevation: 3,
    },
    addressInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        gap: 12,
    },
    inputWrapper: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    addressInput: {
        fontSize: 14,
        fontWeight: '500',
        color: '#0f172a',
        padding: 8,
        backgroundColor: '#f1f5f9',
        borderRadius: 8,
    },
    serviceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#cbd5e1',
        backgroundColor: '#fff',
        marginBottom: 12,
    },
    serviceItemSelected: {
        borderColor: '#FF6B35',
        backgroundColor: '#FFF3EE',
    },
    serviceLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    serviceIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    serviceInfo: {
        flex: 1,
    },
    serviceName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
        marginBottom: 2,
    },
    serviceDuration: {
        fontSize: 12,
        color: '#64748b',
    },
    serviceRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    servicePrice: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FF6B35',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    checkboxSelected: {
        backgroundColor: '#FF6B35',
        borderColor: '#FF6B35',
        justifyContent: 'center',
        alignItems: 'center',
    },
    notesLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
        marginBottom: 8,
    },
    notesInput: {
        borderWidth: 1,
        borderColor: '#cbd5e1',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 14,
        color: '#0f172a',
        minHeight: 100,
        textAlignVertical: 'top',
    },
    propertyTypeContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    propertyTypeButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#e2e8f0',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 12,
        alignItems: 'center',
        elevation: 2,
    },
    propertyTypeButtonSelected: {
        borderColor: '#FF6B35',
        backgroundColor: '#FFF3EE',
        elevation: 4,
    },
    propertyTypeIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    propertyTypeIconSelected: {
        backgroundColor: '#FFE5DB',
    },
    propertyTypeText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#475569',
        marginBottom: 4,
    },
    propertyTypeTextSelected: {
        color: '#FF6B35',
    },
    propertyTypeSubtext: {
        fontSize: 12,
        color: '#94a3b8',
        textAlign: 'center',
    },
    bottomAction: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#e2e8f0',
        paddingHorizontal: 16,
        paddingVertical: 16,
        elevation: 8,
    },
    priceContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    priceLabel: {
        fontSize: 14,
        color: '#64748b',
    },
    totalPrice: {
        fontSize: 20,
        fontWeight: '700',
        color: '#0f172a',
    },
    continueButton: {
        backgroundColor: '#FF6B35',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        elevation: 4,
    },
    continueButtonDisabled: {
        backgroundColor: '#94a3b8',
        opacity: 0.7,
    },
    continueButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    showMoreButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginTop: 12,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#FF6B35',
        backgroundColor: '#FFF3EE',
        gap: 8,
    },
    showMoreButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FF6B35',
    },
})
