import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    TextInput,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import type { RootState } from '../redux/store';

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

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                <View style={styles.bannerContainer}>
                    <View style={styles.banner}>
                        <View style={styles.bannerContent}>
                            <View style={styles.bannerBadge}>
                                <Ionicons name="flash" size={14} color="#FFD700" />
                                <Text style={styles.bannerBadgeText}>HOT DEAL</Text>
                            </View>
                            <Text style={styles.bannerTitle}>Dịch vụ Vận chuyển{"\n"}hỏa tốc 🚀</Text>
                            <Text style={styles.bannerSubtitle}>
                                Tiết kiệm đến 30% cho đơn đầu tiên
                            </Text>
                            <View style={styles.ratingContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <FontAwesome5 key={star} name="star" size={14} color="#FFD700" solid />
                                ))}
                                <Text style={styles.ratingText}>4.9</Text>
                            </View>
                        </View>
                        <View style={styles.bannerIconContainer}>
                            <Ionicons name="rocket" size={60} color="rgba(255,255,255,0.3)" />
                        </View>
                    </View>
                </View>

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
                                    // Navigate to BookRide with this location
                                    navigation.navigate('BookRide', { 
                                        selectedLocation: location 
                                    })
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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
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
        backgroundColor: '#FFF',
        paddingTop: 48,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatarContainer: {
        position: 'relative',
        marginRight: 14,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#FF6B35',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
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
    },
    greeting: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 2,
    },
    userName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.3,
    },
    notificationButton: {
        padding: 4,
    },
    notificationIconContainer: {
        position: 'relative',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F9FAFB',
        alignItems: 'center',
        justifyContent: 'center',
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
        backgroundColor: '#F8F9FA',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#111827',
        fontWeight: '500',
        paddingVertical: 0,
    },
    bannerContainer: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#F8F9FA',
    },
    banner: {
        flexDirection: 'row',
        backgroundColor: '#FF6B35',
        borderRadius: 20,
        overflow: 'hidden',
        padding: 20,
        shadowColor: '#FF6B35',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
        position: 'relative',
    },
    bannerContent: {
        flex: 1,
        justifyContent: 'center',
        zIndex: 2,
    },
    bannerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 12,
        gap: 4,
    },
    bannerBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFF',
        letterSpacing: 0.5,
    },
    bannerIconContainer: {
        position: 'absolute',
        right: -10,
        top: '50%',
        transform: [{ translateY: -30 }, { rotate: '-15deg' }],
        zIndex: 1,
    },
    bannerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 8,
        letterSpacing: -0.5,
        lineHeight: 28,
    },
    bannerSubtitle: {
        fontSize: 14,
        color: '#FFE0D6',
        marginBottom: 12,
        fontWeight: '500',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ratingText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFF',
        marginLeft: 4,
    },
    bannerImage: {
        width: 120,
        height: '100%',
    },
    section: {
        marginTop: 8,
        backgroundColor: '#FFF',
        padding: 20,
        borderRadius: 0,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#111827',
        letterSpacing: -0.3,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#9CA3AF',
        marginTop: 2,
        fontWeight: '500',
    },
    seeAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    seeAllText: {
        fontSize: 14,
        color: '#FF6B35',
        fontWeight: '600',
    },
    servicesGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    serviceCard: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    serviceIcon: {
        width: 72,
        height: 72,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    serviceText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111827',
        textAlign: 'center',
        marginBottom: 4,
    },
    serviceDesc: {
        fontSize: 11,
        color: '#6B7280',
        textAlign: 'center',
        fontWeight: '500',
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
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        gap: 3,
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    discountText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.3,
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 14,
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    locationIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
    },
    locationArrow: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationInfo: {
        flex: 1,
    },
    locationName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111827',
        marginBottom: 4,
        letterSpacing: -0.2,
    },
    locationAddress: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        lineHeight: 18,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyStateText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#6B7280',
        marginTop: 16,
        textAlign: 'center',
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#9CA3AF',
        marginTop: 6,
        textAlign: 'center',
    },
});

export default Home;
