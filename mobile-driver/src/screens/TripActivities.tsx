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
                <View style={styles.infoCard}>
                    <View style={styles.avatar}>
                        <MaterialIcons name="person" size={40} color={"#fff"} />

                    </View>
                    <Text>Khách hàng</Text>
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.actionBtnCall}>
                            <MaterialIcons name="call" size={20} color="#FF6B00" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtnChat}>
                            <MaterialIcons name="chat-bubble" size={20} color="#FF6B00" />
                        </TouchableOpacity>
                    </View>
                </View>
                <View style={styles.headerCard}>
                    <View>
                        <Text style={styles.title}>Cuốc xe hiện tại</Text>
                        <Text style={styles.subtitle}>Mã cuốc: </Text>
                    </View>
                    <View style={styles.priceBox}>
                        <Text style={styles.price}>Giá: </Text>
                        <Text style={styles.payment}>tiền mặt</Text>
                    </View>
                </View>
                <View style={styles.divider} />
                <View style={styles.locationRow}>
                    <View style={styles.dotPickup} />
                    <Text style={styles.locationText}>

                    </Text>
                </View>
                <View style={styles.locationRow}>
                    <View style={styles.dotDropoff} />
                    <Text style={styles.locationText}>

                    </Text>
                </View>
                <TouchableOpacity style={styles.acceptButton}>
                    <Text>Đã đến điểm đón</Text>
                </TouchableOpacity>
                <View>
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
    card: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1a202c',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10,
        width: '100%',
        height: 500,
    },
    handleBar: {
        width: 50,
        height: 5,
        backgroundColor: '#ccc',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    headerCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111827',
    },
    subtitle: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    priceBox: {
        alignItems: 'flex-end',
    },
    price: {
        fontSize: 20,
        fontWeight: '700',
        color: '#16A34A',
    },
    payment: {
        fontSize: 12,
        color: '#6B7280',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 12,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    dotPickup: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22C55E',
        marginRight: 8,
    },
    dotDropoff: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        marginRight: 8,
    },
    locationText: {
        flex: 1,
        fontSize: 14,
        color: '#374151',
    },
    acceptButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 14,
        borderRadius: 14,
        marginTop: 12,
        alignItems: 'center',
    },
    infoCard: {
        backgroundColor: '#6B7280',
        borderRadius: 16,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 6,
        marginVertical: 8,
    },
    logoText: {
        fontSize: 30,
        fontWeight: '700',
        letterSpacing: -0.5,
        color: '#FF6B00',
    },
    avatar: {
        width: 75,
        height: 75,
        borderRadius: 37.5,
        backgroundColor: COLORS.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 10,
    },
    actions: {
        flexDirection: 'row',
    },
    actionBtnCall: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#22C55E',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    actionBtnChat: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#4F46E5',
        alignItems: 'center',
        justifyContent: 'center',
    },
})
