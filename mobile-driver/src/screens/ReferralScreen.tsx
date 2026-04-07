import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Share,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING } from '../constants';
import { apiClient } from '../services/apiClient';
import { useNavigation } from '@react-navigation/native';

export default function ReferralScreen() {
  const navigation = useNavigation();

  const [referralData, setReferralData] = useState({
    referralCode: 'ĐANG TẢI...',
    totalReferrals: 0,
    totalEarnings: 0,
    completedRides: 0
  });

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        const res = await apiClient.get('/drivers/me/referral');
        setReferralData({
          referralCode: res.data.referralCode,
          totalReferrals: res.data.totalReferrals || 0,
          totalEarnings: res.data.totalReferralEarnings || 0,
          completedRides: res.data.completedRides || 0
        });
      } catch (error) {
        console.log('Error fetching referral data:', error);
      }
    };
    fetchReferral();
  }, []);

  const { referralCode, totalReferrals, totalEarnings, completedRides } = referralData;
  const minTripsRequired = 5; // Có thể lấy từ config API nếu có
  const isEligible = completedRides >= minTripsRequired;

  // Xóa copyToClipboard vì sử dụng Share là đủ và tránh lỗi native module

  const shareCode = async () => {
    if (referralCode === 'ĐANG TẢI...') return;
    try {
      await Share.share({
        message: `Đăng ký làm đối tác FireGo ngay hôm nay và nhập mã giới thiệu ${referralCode} để cả hai cùng nhận thưởng lớn nhé!`,
      });
    } catch (error) {
      console.log('Error sharing code', error);
    }
  };

  const TierItem = ({ level, percent, color }: { level: string; percent: string; color: string }) => (
    <View style={styles.tierItem}>
      <View style={[styles.tierIconContainer, { backgroundColor: color }]}>
        <Text style={styles.tierLevelText}>{level}</Text>
      </View>
      <View style={styles.tierInfo}>
        <Text style={styles.tierTitle}>Bạn bè cấp {level}</Text>
        <Text style={styles.tierDesc}>Nhận {percent} phần phí nền tảng</Text>
      </View>
      <Text style={[styles.tierPercentText, { color }]}>{percent}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#FF6B00" />

      {/* Header Modal-like */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Giới thiệu bạn bè</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={['#FF6B00', '#FF8A3D']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.heroBanner}
        >
          <MaterialIcons name="groups" size={64} color="#fff" style={styles.heroIcon} />
          <Text style={styles.heroTitle}>Giới Thiệu Liền Tay</Text>
          <Text style={styles.heroTitle}>Nhận Thưởng Trao Tay</Text>
          <Text style={styles.heroDesc}>
            Lan toả FireGo tới đồng nghiệp và nhận hoa hồng lên tới 3 cấp độ từ nền tảng.
          </Text>

          <View style={styles.codeContainer}>
            <Text style={styles.codeLabel}>Mã giới thiệu của bạn:</Text>
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{referralCode}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
            <MaterialIcons name="share" size={20} color="#fff" />
            <Text style={styles.shareBtnText}>Chia sẻ ngay</Text>
          </TouchableOpacity>
        </LinearGradient>

        {/* Eligibility Status */}
        <View style={styles.eligibilityContainer}>
          <View style={styles.eligibilityHeader}>
            <MaterialIcons 
              name={isEligible ? "check-circle" : "pending-actions"} 
              size={24} 
              color={isEligible ? "#10b981" : "#f59e0b"} 
            />
            <Text style={styles.eligibilityTitle}>Điều kiện nhận thưởng</Text>
          </View>
          {isEligible ? (
            <Text style={styles.eligibilityDescSuccess}>
              Bạn đã đủ điều kiện nhận hoa hồng hệ thống (Đã hoàn thành {completedRides} cuốc xe).
            </Text>
          ) : (
            <Text style={styles.eligibilityDescPending}>
              Bạn cần hoàn thành ít nhất {minTripsRequired} cuốc xe để bắt đầu nhận hoa hồng từ bạn bè. (Đã chạy: {completedRides}/{minTripsRequired})
            </Text>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.sectionTitle}>Tiến độ của bạn</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={[styles.statIconBox, { backgroundColor: '#e0e7ff' }]}>
                <MaterialIcons name="people" size={24} color="#4f46e5" />
              </View>
              <Text style={styles.statLabel}>Đã giới thiệu</Text>
              <Text style={styles.statValue}>{totalReferrals} <Text style={styles.statUnit}>người</Text></Text>
            </View>
            <View style={styles.statBox}>
              <View style={[styles.statIconBox, { backgroundColor: '#ecfdf5' }]}>
                <MaterialIcons name="account-balance-wallet" size={24} color="#10b981" />
              </View>
              <Text style={styles.statLabel}>Tổng thu nhập</Text>
              <Text style={styles.statValue}>
                {totalEarnings.toLocaleString('vi-VN')} <Text style={styles.statUnit}>đ</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* How it works */}
        <View style={styles.rulesContainer}>
          <Text style={styles.sectionTitle}>Cơ chế hoa hồng 3 tầng</Text>
          <Text style={styles.rulesDesc}>
            Khi bạn của bạn hoàn thành cuốc xe (từ cuốc thứ 5), hệ thống sẽ trích một phần chiết khấu nền tảng để trả thẳng vào Ví của bạn.
          </Text>

          <TierItem level="F1" percent="8%" color="#FF6B00" />
          <TierItem level="F2" percent="3%" color="#10b981" />
          <TierItem level="F3" percent="1%" color="#3b82f6" />

          <View style={styles.noteBox}>
            <MaterialIcons name="info-outline" size={20} color="#f59e0b" />
            <Text style={styles.noteText}>
              Lưu ý: Hoa hồng hoàn toàn được trích từ CHIẾT KHẤU CỦA ỨNG DỤNG, không làm giảm thu nhập thực tế của bạn bè chạy xe.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FF6B00',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#FF6B00',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  heroBanner: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    alignItems: 'center',
  },
  heroIcon: {
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
    lineHeight: 20,
    paddingHorizontal: SPACING.md,
  },
  codeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    padding: SPACING.lg,
    borderRadius: 20,
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  codeLabel: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: SPACING.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    gap: SPACING.lg,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: 2,
  },
  copyBtn: {
    padding: 8,
    backgroundColor: '#fff5eb',
    borderRadius: 8,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 14,
    borderRadius: 16,
    marginTop: SPACING.xl,
    gap: SPACING.sm,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  shareBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  statsContainer: {
    paddingHorizontal: SPACING.xl,
    marginTop: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#fff',
    padding: SPACING.lg,
    borderRadius: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  statIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  statUnit: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
  },
  rulesContainer: {
    padding: SPACING.xl,
  },
  rulesDesc: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  tierItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  tierIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  tierLevelText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
  },
  tierInfo: {
    flex: 1,
  },
  tierTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  tierDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  tierPercentText: {
    fontSize: 18,
    fontWeight: '900',
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#fffbeb',
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  noteText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 12,
    color: '#b45309',
    lineHeight: 18,
    fontWeight: '500',
  },
  eligibilityContainer: {
    backgroundColor: '#fff',
    marginHorizontal: SPACING.xl,
    marginTop: -SPACING.xl,
    padding: SPACING.lg,
    borderRadius: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  eligibilityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  eligibilityTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginLeft: SPACING.sm,
  },
  eligibilityDescPending: {
    fontSize: 13,
    color: '#b45309',
    lineHeight: 20,
    fontWeight: '500',
  },
  eligibilityDescSuccess: {
    fontSize: 13,
    color: '#10b981',
    lineHeight: 20,
    fontWeight: '500',
  },
});
