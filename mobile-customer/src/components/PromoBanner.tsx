import { View, Text, StyleSheet } from 'react-native';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';

const PromoBanner = () => {
    return (
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
    );
};

const styles = StyleSheet.create({
    bannerContainer: {
        paddingHorizontal: 16,
    },
    banner: {
        flexDirection: 'row',
        backgroundColor: '#FF7046',
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
        backgroundColor: 'rgba(255,255,255,0.3)',
        alignSelf: 'flex-start',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16,
        gap: 6,
    },
    bannerBadgeText: {
        fontSize: 12,
        fontWeight: '900',
        color: '#FFF',
        letterSpacing: 0.8,
    },
    bannerIconContainer: {
        position: 'absolute',
        right: -10,
        top: '50%',
        transform: [{ translateY: -30 }, { rotate: '-15deg' }],
        zIndex: 1,
    },
    bannerTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: '#FFF',
        marginBottom: 12,
        letterSpacing: -0.6,
        lineHeight: 32,
    },
    bannerSubtitle: {
        fontSize: 15,
        color: '#FFE0D6',
        marginBottom: 16,
        fontWeight: '600',
    },
    ratingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    ratingText: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFF',
        marginLeft: 6,
        letterSpacing: -0.2,
    },
});

export default PromoBanner;
