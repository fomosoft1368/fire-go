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
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS } from '../constants'
import MapViewComponent from '../components/MapView'
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
}

export default function TripActivities({ }: TripActivitiesProps) {

    return (
        <View style={styles.container}>
            <View style={StyleSheet.absoluteFillObject}>
                <MapViewComponent
                    height={'100%'}
                />
            </View>
            <View style={styles.header}>
                <TouchableOpacity style={[styles.backButton, { backgroundColor: "#fff" }]}>
                    <MaterialIcons name="arrow-back" size={24} color="#FF6B00" />
                </TouchableOpacity>
                <Text style={styles.logoText}>firego</Text>
            </View>
            <View style={styles.card}>
                <View style={styles.handleBar} />
                
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
                                <Text style={styles.customerName}>Nguyễn Văn A</Text>
                                <View style={styles.ratingRow}>
                                    <MaterialIcons name="star" size={14} color="#FFB800" />
                                    <Text style={styles.ratingText}>4.8</Text>
                                    <Text style={styles.tripCount}>• 127 chuyến</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.actionBtnCall}>
                                <MaterialIcons name="call" size={20} color="#fff" />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionBtnChat}>
                                <MaterialIcons name="chat-bubble" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Trip Status */}
                    <View style={styles.statusSection}>
                        <View style={styles.statusBadge}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>Đang đến điểm đón</Text>
                        </View>
                        <Text style={styles.etaText}>Còn 5 phút</Text>
                    </View>

                    {/* Distance to Pickup */}
                    <View style={styles.distanceToPickupCard}>
                        <View style={styles.distanceToPickupLeft}>
                            <MaterialIcons name="navigation" size={24} color="#FF6B00" />
                            <View style={styles.distanceToPickupInfo}>
                                <Text style={styles.distanceToPickupLabel}>Khoảng cách đến điểm đón</Text>
                                <Text style={styles.distanceToPickupValue}>2.3 km • 8 phút</Text>
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
                                <Text style={styles.tripInfoValue}>#ABC123</Text>
                            </View>
                            <View style={styles.tripInfoItem}>
                                <Text style={styles.tripInfoLabel}>Cước phí</Text>
                                <Text style={[styles.tripInfoValue, { color: '#FF6B00' }]}>75.000đ</Text>
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
                                    <View style={styles.distanceBadge}>
                                        <MaterialIcons name="straighten" size={12} color="#9CA3AF" />
                                        <Text style={styles.distanceText}>2.3 km</Text>
                                    </View>
                                </View>
                                <Text style={styles.locationAddress}>123 Đường Láng, Đống Đa, Hà Nội</Text>
                            </View>
                        </View>

                        {/* Dropoff */}
                        <View style={styles.locationItem}>
                            <View style={styles.locationIconWrapper}>
                                <MaterialIcons name="location-on" size={20} color="#EF4444" />
                            </View>
                            <View style={styles.locationContent}>
                                <Text style={styles.locationLabel}>Điểm trả</Text>
                                <Text style={styles.locationAddress}>456 Giải Phóng, Hai Bà Trưng, Hà Nội</Text>
                            </View>
                        </View>
                    </View>

                    {/* Trip Metrics */}
                    <View style={styles.metricsGrid}>
                        <View style={styles.metricCard}>
                            <MaterialIcons name="straighten" size={18} color="#9CA3AF" />
                            <Text style={styles.metricValue}>8.5 km</Text>
                            <Text style={styles.metricLabel}>Tổng quãng đường</Text>
                        </View>
                        <View style={styles.metricCard}>
                            <MaterialIcons name="schedule" size={18} color="#9CA3AF" />
                            <Text style={styles.metricValue}>25 phút</Text>
                            <Text style={styles.metricLabel}>Thời gian dự kiến</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Fixed Bottom Actions */}
                <View style={styles.actionContainer}>
                    <TouchableOpacity style={styles.secondaryButton}>
                        <MaterialIcons name="phone" size={20} color="#fff" />
                        <Text style={styles.secondaryButtonText}>Gọi khách</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.primaryButton}>
                        <MaterialIcons name="check-circle" size={20} color="#000" />
                        <Text style={styles.primaryButtonText}>Đã đến điểm đón</Text>
                    </TouchableOpacity>
                </View>
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
        backgroundColor: '#1a202c',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 15,
        maxHeight: '75%',
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
        backgroundColor: '#4B5563',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    // Customer Card
    customerCard: {
        backgroundColor: '#374151',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#4B5563',
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
        borderColor: '#4B5563',
    },
    customerDetails: {
        flex: 1,
    },
    customerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
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
        color: '#9CA3AF',
    },
    tripCount: {
        fontSize: 12,
        color: '#6B7280',
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
    },
    // Status Section
    statusSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#374151',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#4B5563',
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
        color: '#fff',
    },
    etaText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFB800',
    },
    // Distance to Pickup Card
    distanceToPickupCard: {
        backgroundColor: '#374151',
        borderRadius: 16,
        padding: 14,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#4B5563',
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
        color: '#9CA3AF',
        marginBottom: 4,
    },
    distanceToPickupValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
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
        color: '#9CA3AF',
    },
    // Trip Info Section
    tripInfoSection: {
        backgroundColor: '#374151',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#4B5563',
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
        color: '#9CA3AF',
        marginBottom: 4,
    },
    tripInfoValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    paymentBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1a202c',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
    },
    paymentText: {
        fontSize: 12,
        color: '#9CA3AF',
        fontWeight: '500',
    },
    // Route Section
    routeSection: {
        backgroundColor: '#374151',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#4B5563',
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
        borderColor: '#fff',
    },
    routeLine: {
        width: 2,
        height: 40,
        backgroundColor: '#4B5563',
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
        color: '#9CA3AF',
        marginBottom: 4,
    },
    locationAddress: {
        fontSize: 14,
        color: '#fff',
        lineHeight: 20,
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#1a202c',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    distanceText: {
        fontSize: 11,
        color: '#9CA3AF',
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
        backgroundColor: '#374151',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#4B5563',
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginTop: 6,
        marginBottom: 2,
    },
    metricLabel: {
        fontSize: 11,
        color: '#9CA3AF',
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
        borderTopColor: '#374151',
        backgroundColor: '#1a202c',
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
})
