import { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import type { RootState } from '../redux/store';
import PromoBanner from '../components/PromoBanner';

const Home = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const user = useSelector((state: RootState) => state.auth.user);
    const [searchQuery, setSearchQuery] = useState('');
    const [recentLocations, setRecentLocations] = useState<any[]>([]);

    const handleOpenNotifications = () => {
        navigation.navigate('Notification')
    }
    // Load recent locations from AsyncStorage
    useEffect(() => {
        const loadRecentLocations = async () => {
            try {
                const stored = await AsyncStorage.getItem('recentLocations')
                if (stored) {
                    const locations = JSON.parse(stored)
                    // Get last 5 locations
                    setRecentLocations(locations.slice(0, 5))
                }
            } catch (error) {
                console.error('[Home] Error loading recent locations:', error)
            }
        }
        loadRecentLocations()
    }, [])

    // Get user's display name
    const getDisplayName = () => {
        if (!user) return 'Khách hàng';

        // Display full name (firstName + lastName)
        if (user.firstName && user.lastName) {
            return `${user.firstName} ${user.lastName}`;
        }

        if (user.firstName) {
            return user.firstName;
        }

        if (user.lastName) {
            return user.lastName;
        }

        // Fallback to email username
        if (user.email) {
            return user.email.split('@')[0];
        }

        return 'Khách hàng';
    }
    return (
        <View style={styles.container}>
            {/* Header - Fixed */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Ionicons name="person" size={28} color="#FFF" />
                        </View>
                    </View>
                    <View style={styles.userInfoContainer}>
                        <Text style={styles.greeting}>Xin chào 👋</Text>
                        <Text style={styles.userName}>{getDisplayName()}</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.notificationButton} onPress={handleOpenNotifications}>
                    <View style={styles.notificationIconContainer}>
                        <Ionicons name="notifications-outline" size={24} color="#333" />
                        <View style={styles.notificationDot} />
                    </View>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
                style={{ flex: 1 }}
            >
                <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <View style={styles.searchBar}>
                            <Ionicons name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Bạn muốn đi đâu hôm nay?"
                                placeholderTextColor="#9CA3AF"
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Ionicons name="close-circle" size={20} color="#9CA3AF" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Banner */}
                    <PromoBanner />

                    {/* Services Section */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Dịch vụ của chúng tôi</Text>
                                <Text style={styles.sectionSubtitle}>Chọn dịch vụ phù hợp với bạn</Text>
                            </View>
                            <TouchableOpacity style={styles.seeAllButton}>
                                <Text style={styles.seeAllText}>Xem tất cả</Text>
                                <Ionicons name="arrow-forward" size={16} color="#FF6B35" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.servicesGrid}>
                            {/* Đặt xe */}
                            <TouchableOpacity
                                style={styles.serviceCard}
                                onPress={() => navigation.navigate('BookRide')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.serviceIcon, { backgroundColor: '#FFF3E0' }]}>
                                    <Ionicons name="people" size={32} color="#F57C00" />
                                </View>
                                <Text style={styles.serviceText}>Ghép xe</Text>
                                <Text style={styles.serviceDesc}>Tiết kiệm chi phí</Text>
                            </TouchableOpacity>

                            {/* Lái xe hộ */}
                            <TouchableOpacity
                                style={styles.serviceCard}
                                onPress={() => navigation.navigate('HireDriver')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.serviceIcon, { backgroundColor: '#FFE0CC' }]}>
                                    <MaterialIcons name="drive-eta" size={32} color="#FF6B35" />
                                </View>
                                <Text style={styles.serviceText}>Lái xe hộ</Text>
                                <Text style={styles.serviceDesc}>An toàn thoải mái</Text>
                            </TouchableOpacity>

                            {/* Vận chuyển */}
                            <TouchableOpacity
                                style={styles.serviceCard}
                                onPress={() => navigation.navigate('Delivery')}
                                activeOpacity={0.7}
                            >
                                <View style={styles.badgeContainer}>
                                    <View style={styles.discountBadge}>
                                        <Ionicons name="pricetag" size={10} color="#FFF" />
                                        <Text style={styles.discountText}>-30%</Text>
                                    </View>
                                </View>
                                <View style={[styles.serviceIcon, { backgroundColor: '#FFEDD5' }]}>
                                    <Ionicons name="cube" size={32} color="#EA580C" />
                                </View>
                                <Text style={styles.serviceText}>Vận chuyển</Text>
                                <Text style={styles.serviceDesc}>Nhanh chóng</Text>
                            </TouchableOpacity>

                            {/* Thêm dịch vụ mới nếu cần */}
                            <TouchableOpacity
                                style={styles.serviceCard}
                                onPress={() => navigation.navigate('HourlyService')}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.serviceIcon, { backgroundColor: '#FFEDD5' }]}>
                                    <Ionicons name="time" size={32} color="#EA580C" />
                                </View>
                                <Text style={styles.serviceText}>Dịch vụ theo yêu cầu</Text>
                                <Text style={styles.serviceDesc}>Khám phá thêm</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Recent Locations */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View>
                                <Text style={styles.sectionTitle}>Địa điểm gần đây</Text>
                                <Text style={styles.sectionSubtitle}>Các địa điểm bạn đã đến</Text>
                            </View>
                            <TouchableOpacity>
                                <Ionicons name="refresh" size={24} color="#EA580C" />
                            </TouchableOpacity>
                        </View>

                        {recentLocations.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Ionicons name="location-outline" size={48} color="#D1D5DB" />
                                <Text style={styles.emptyStateText}>Chưa có địa điểm gần đây</Text>
                                <Text style={styles.emptyStateSubtext}>Đặt chuyến đi đầu tiên của bạn!</Text>
                            </View>
                        ) : (
                            recentLocations.map((location, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.locationCard}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        // Navigate to Delivery with this location
                                        navigation.navigate('Delivery')
                                    }}
                                >
                                    <View style={[
                                        styles.locationIcon,
                                        { backgroundColor: location.iconBg || '#FFEDD5' }
                                    ]}>
                                        <Ionicons
                                            name={location.icon || 'location'}
                                            size={22}
                                            color={location.iconColor || '#EA580C'}
                                        />
                                    </View>
                                    <View style={styles.locationInfo}>
                                        <Text style={styles.locationName}>{location.name}</Text>
                                        <Text style={styles.locationAddress}>
                                            📍 {location.address}
                                        </Text>
                                    </View>
                                    <View style={styles.locationArrow}>
                                        <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        paddingTop: 48,
        borderBottomWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 16,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FF6B35',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 3,
        borderColor: '#FFF',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    userInfoContainer: {
        flex: 1,
        justifyContent: 'center',
        marginLeft: 4,
    },
    greeting: {
        fontSize: 13,
        color: '#9CA3AF',
        fontWeight: '600',
        marginBottom: 2,
        letterSpacing: -0.2,
    },
    userName: {
        fontSize: 20,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.4,
    },
    notificationButton: {
        padding: 4,
    },
    notificationIconContainer: {
        position: 'relative',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F5F7FA',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    notificationDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#EF4444',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F5F7FA',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#111827',
        fontWeight: '600',
        paddingVertical: 0,
        letterSpacing: -0.2,
    },
    section: {
        marginTop: 8,
        padding: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111827',
        letterSpacing: -0.5,
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
        fontWeight: '600',
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    seeAllText: {
        fontSize: 15,
        color: '#FF6B35',
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    servicesGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
    },
    serviceCard: {
        flex: 1,
        minWidth: '48%',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 20,
        borderRadius: 24,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
    },
    serviceIcon: {
        width: 80,
        height: 80,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    serviceText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    serviceDesc: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    badgeContainer: {
        position: 'absolute',
        top: -6,
        right: 6,
        zIndex: 10,
    },
    discountBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        gap: 4,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 6,
    },
    discountText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 0.5,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    locationIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    locationArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F5F7FA',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    locationInfo: {
        flex: 1,
    },
    locationName: {
        fontSize: 17,
        fontWeight: '800',
        color: '#111827',
        marginBottom: 6,
        letterSpacing: -0.3,
    },
    locationAddress: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '600',
        lineHeight: 18,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyStateText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#6B7280',
        marginTop: 16,
        textAlign: 'center',
        letterSpacing: -0.3,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 6,
        textAlign: 'center',
        fontWeight: '600',
    },
});

export default Home;
