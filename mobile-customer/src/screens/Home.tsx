import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
} from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';
import type { RootState } from '../redux/store';

const Home = () => {
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
    const user = useSelector((state: RootState) => state.auth.user);

    const handleOpenNotifications = () => {
        navigation.navigate('Notification')
    }

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

    const getUserAvatar = () => {
        if (user?.avatar) return user.avatar;
        
        // Create avatar with full name
        const fullName = user?.firstName && user?.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user?.email || 'User';
            
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=FF6B35&color=fff`;
    }

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Image
                            source={{ uri: getUserAvatar() }}
                            style={styles.avatar}
                        />
                        <View>
                            <Text style={styles.greeting}>Xin chào,</Text>
                            <Text style={styles.userName}>{getDisplayName()}</Text>
                        </View>
                    </View>
                    <TouchableOpacity style={styles.notificationButton} onPress={handleOpenNotifications}>
                        <Ionicons name="notifications-outline" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* Search Bar */}
                <TouchableOpacity
                    style={styles.searchBar}
                    onPress={() => navigation.navigate('BookRide')}
                >
                    <Ionicons name="search" size={20} color="#999" />
                    <Text style={styles.searchPlaceholder}>
                        Bạn muốn đi đâu hôm nay, ghi hàng đến đây?
                    </Text>
                </TouchableOpacity>

                {/* Banner */}
                <View style={styles.banner}>
                    <Image
                        source={{ uri: 'https://via.placeholder.com/150x200' }}
                        style={styles.bannerImage}
                    />
                    <View style={styles.bannerContent}>
                        <Text style={styles.bannerTitle}>Dịch vụ Vận chuyển hỏa tốc</Text>
                        <Text style={styles.bannerSubtitle}>
                            Tiết kiệm 3% và ưu đãi hàng đặt biệt
                        </Text>
                        <View style={styles.ratingContainer}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <FontAwesome5 key={star} name="star" size={12} color="#FFD700" solid />
                            ))}
                        </View>
                    </View>
                </View>

                {/* Services Section */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Dịch vụ chính</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>Tất cả</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.servicesGrid}>
                        {/* Đặt xe */}
                        <TouchableOpacity
                            style={styles.serviceCard}
                            onPress={() => navigation.navigate('BookRide')}
                        >
                            <View style={[styles.serviceIcon, { backgroundColor: '#E3F2FD' }]}>
                                <Ionicons name="car" size={28} color="#1976D2" />
                            </View>
                            <Text style={styles.serviceText}>Ghép xe</Text>
                        </TouchableOpacity>

                        {/* Lái xe hộ */}
                        <TouchableOpacity
                            style={styles.serviceCard}
                            onPress={() => navigation.navigate('HireDriver')}
                        >
                            <View style={[styles.serviceIcon, { backgroundColor: '#E8F5E9' }]}>
                                <MaterialIcons name="drive-eta" size={28} color="#388E3C" />
                            </View>
                            <Text style={styles.serviceText}>Lái xe hộ</Text>
                        </TouchableOpacity>

                        {/* Vận chuyển */}
                        <TouchableOpacity
                            style={styles.serviceCard}
                            onPress={() => navigation.navigate('Delivery')}
                        >
                            <View style={styles.badgeContainer}>
                                <View style={styles.discountBadge}>
                                    <Text style={styles.discountText}>20%</Text>
                                </View>
                            </View>
                            <View style={[styles.serviceIcon, { backgroundColor: '#FFF3E0' }]}>
                                <Ionicons name="cube" size={28} color="#F57C00" />
                            </View>
                            <Text style={styles.serviceText}>Vận chuyển</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Recent Locations */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Gần đây</Text>

                    <TouchableOpacity style={styles.locationCard}>
                        <View style={styles.locationIcon}>
                            <Ionicons name="business-outline" size={20} color="#666" />
                        </View>
                        <View style={styles.locationInfo}>
                            <Text style={styles.locationName}>Tòa nhà Keangnam</Text>
                            <Text style={styles.locationAddress}>
                                Phạm Hùng, Mễ Trì, Nam Từ Liêm
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.locationCard}>
                        <View style={styles.locationIcon}>
                            <Ionicons name="location-outline" size={20} color="#666" />
                        </View>
                        <View style={styles.locationInfo}>
                            <Text style={styles.locationName}>Đại học Bách Khoa</Text>
                            <Text style={styles.locationAddress}>
                                Đại Cồ Việt, Hai Bà Trưng
                            </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#999" />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
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
        padding: 16,
        backgroundColor: '#FFF',
        paddingTop: 40,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginRight: 12,
        backgroundColor: '#E0E0E0',
    },
    greeting: {
        fontSize: 12,
        color: '#666',
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    notificationButton: {
        padding: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        margin: 16,
        marginTop: 8,
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchPlaceholder: {
        marginLeft: 8,
        color: '#999',
        fontSize: 14,
        flex: 1,
    },
    banner: {
        flexDirection: 'row',
        backgroundColor: '#FF6B35',
        margin: 16,
        marginTop: 8,
        borderRadius: 16,
        overflow: 'hidden',
        height: 200,
    },
    bannerImage: {
        width: 120,
        height: '100%',
    },
    bannerContent: {
        flex: 1,
        padding: 16,
        justifyContent: 'center',
    },
    bannerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFF',
        marginBottom: 4,
    },
    bannerSubtitle: {
        fontSize: 12,
        color: '#FFE0D6',
        marginBottom: 8,
    },
    ratingContainer: {
        flexDirection: 'row',
        gap: 4,
    },
    section: {
        marginTop: 8,
        backgroundColor: '#FFF',
        padding: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    seeAllText: {
        fontSize: 14,
        color: '#FF6B35',
        fontWeight: '500',
    },
    servicesGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    serviceCard: {
        alignItems: 'center',
        width: '30%',
    },
    serviceIcon: {
        width: 64,
        height: 64,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    serviceText: {
        fontSize: 14,
        color: '#333',
        textAlign: 'center',
    },
    badgeContainer: {
        position: 'absolute',
        top: -8,
        right: 8,
        zIndex: 1,
    },
    discountBadge: {
        backgroundColor: '#FF4444',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    discountText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '700',
    },
    locationCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    locationIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    locationInfo: {
        flex: 1,
    },
    locationName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        marginBottom: 2,
    },
    locationAddress: {
        fontSize: 13,
        color: '#666',
    },
});

export default Home;
