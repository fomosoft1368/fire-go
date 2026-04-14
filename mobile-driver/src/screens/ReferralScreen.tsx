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
  ActivityIndicator,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING } from '../constants';
import { apiClient } from '../services/apiClient';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// Kiểu dữ liệu downline
interface Downline {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  joinedDate: string;
  tier: string;
  totalRides: number;
  totalEarned: number;
  totalPending: number;
}

export default function ReferralScreen() {
  const navigation = useNavigation();

  const [referralCode, setReferralCode] = useState('ĐANG TẢI...');
  const [totalReferrals, setTotalReferrals] = useState(0);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [myLevel, setMyLevel] = useState('Đang tải...');
  const [downlines, setDownlines] = useState<Downline[]>([]);
  const [loading, setLoading] = useState(true);

  // State quản lý tab đang mở (Rules hay Network)
  const [activeTab, setActiveTab] = useState<'network' | 'rules'>('network');

  // State quản lý accordion mở rộng của downline
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [refRes, downlinesRes] = await Promise.all([
          apiClient.get('/drivers/me/referral'),
          apiClient.get('/drivers/me/downlines'),
        ]);

        if (refRes.data) {
          setReferralCode(refRes.data.referralCode);
          setTotalReferrals(refRes.data.totalReferrals || 0);
          setTotalEarnings(refRes.data.totalReferralEarnings || 0);
        }

        if (downlinesRes.data) {
          setMyLevel(downlinesRes.data.myLevel || 'Thành viên Gốc');
          setDownlines(downlinesRes.data.downlines || []);
        }
      } catch (error) {
        console.log('Error fetching referral data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'F1': return '#EAB308'; // Vàng gold
      case 'F2': return '#9CA3AF'; // Bạc
      case 'F3': return '#D97706'; // Đồng
      default: return '#EAB308';
    }
  };

  const renderDownlineItem = (item: Downline) => {
    const isExpanded = expandedId === item.id;
    const tierColor = getTierColor(item.tier);

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.downlineCard}
        activeOpacity={0.8}
        onPress={() => setExpandedId(isExpanded ? null : item.id)}
      >
        <View style={styles.downlineHeader}>
          <View style={styles.avatarContainer}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: `${tierColor}20` }]}>
                <FontAwesome5 name="user-tie" size={24} color={tierColor} />
              </View>
            )}
            <View style={[styles.tierBadge, { backgroundColor: tierColor }]}>
              <Text style={styles.tierBadgeText}>{item.tier}</Text>
            </View>
          </View>

          <View style={styles.downlineInfo}>
            <Text style={styles.downlineName}>{item.name}</Text>
            <Text style={styles.downlineDate}>
              Gia nhập: {new Date(item.joinedDate).toLocaleDateString('vi-VN')}
            </Text>
          </View>

          <View style={styles.downlineRight}>
            <MaterialIcons
              name={isExpanded ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={28}
              color="#F59E0B"
            />
          </View>
        </View>

        {isExpanded && (
          <View style={styles.expandedContent}>
            <View style={styles.expandedDivider} />

            <View style={styles.statDetailRow}>
              <View style={styles.statDetailCol}>
                <Text style={styles.statDetailLabel}>Cuốc hoàn thành</Text>
                <Text style={styles.statDetailValue}>{item.totalRides} cuốc</Text>
              </View>
            </View>

            <View style={styles.commissionBox}>
              <View style={styles.commissionRow}>
                <MaterialIcons name="hourglass-empty" size={18} color="#F59E0B" />
                <Text style={styles.commissionLabel}>Chờ mở khóa (24h):</Text>
                <Text style={styles.commissionPending}>+{item.totalPending.toLocaleString('vi-VN')} đ</Text>
              </View>
              <View style={styles.commissionRow}>
                <MaterialIcons name="check-circle" size={18} color="#10B981" />
                <Text style={styles.commissionLabel}>Đã cộng vào ví:</Text>
                <Text style={styles.commissionCompleted}>+{item.totalEarned.toLocaleString('vi-VN')} đ</Text>
              </View>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const TierRuleItem = ({ level, percent, color }: { level: string; percent: string; color: string }) => (
    <View style={styles.ruleItem}>
      <View style={[styles.ruleIconContainer, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.ruleLevelText, { color }]}>{level}</Text>
      </View>
      <View style={styles.ruleInfo}>
        <Text style={styles.ruleTitle}>Đối tác {level}</Text>
        <Text style={styles.ruleDesc}>Hoa hồng từ khoản chiết khấu nền tảng (Sau 24h chờ cộng)</Text>
      </View>
      <Text style={[styles.rulePercentText, { color }]}>{percent}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      {/* Header Modal-like */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#EAB308" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CHƯƠNG TRÌNH ĐẠI SỨ</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EAB308" />
          <Text style={styles.loadingText}>Đang tải dữ liệu mạng lưới...</Text>
        </View>
      ) : (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

          {/* Luxury Hero Banner */}
          <LinearGradient
            colors={['#1F2937', '#111827', '#030712']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.badgeContainer}>
              <MaterialIcons name="workspace-premium" size={20} color="#FEF08A" />
              <Text style={styles.badgeText}>PHÂN HẠNG: {myLevel.toUpperCase()}</Text>
            </View>

            <Text style={styles.heroTitle}>FIREGO TECH</Text>
            <Text style={styles.heroSubtitle}>Mạng Lưới Đặc Quyền - Nhận Thưởng Vô Hạn</Text>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>TỔNG ĐỐI TÁC</Text>
                <Text style={styles.statValue}>{totalReferrals}</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statLabel}>TỔNG HOA HỒNG (VNĐ)</Text>
                <Text style={styles.statValueGold}>{totalEarnings.toLocaleString('vi-VN')}</Text>
              </View>
            </View>

            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>MÃ GIỚI THIỆU VIP</Text>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{referralCode}</Text>
                <TouchableOpacity style={styles.shareBtnIcon} onPress={shareCode}>
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    style={styles.shareBtnGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <MaterialIcons name="ios-share" size={22} color="#FFFFFF" />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Tab Selection */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'network' && styles.tabActive]}
              onPress={() => setActiveTab('network')}
            >
              <Text style={[styles.tabText, activeTab === 'network' && styles.tabTextActive]}>Mạng Lưới Của Tối</Text>
              {activeTab === 'network' && <View style={styles.tabActiveIndicator} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, activeTab === 'rules' && styles.tabActive]}
              onPress={() => setActiveTab('rules')}
            >
              <Text style={[styles.tabText, activeTab === 'rules' && styles.tabTextActive]}>Cơ Chế Khởi Nghiệp</Text>
              {activeTab === 'rules' && <View style={styles.tabActiveIndicator} />}
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          <View style={styles.tabContent}>
            {activeTab === 'network' ? (
              <View style={styles.networkContainer}>
                {downlines.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <FontAwesome5 name="network-wired" size={48} color="#D1D5DB" />
                    <Text style={styles.emptyTitle}>Chưa có đối tác tuyến dưới</Text>
                    <Text style={styles.emptyDesc}>Chia sẻ mã giới thiệu để xây dựng mạng lưới thu nhập thụ động của bạn.</Text>
                  </View>
                ) : (
                  downlines.map(renderDownlineItem)
                )}
              </View>
            ) : (
              <View style={styles.rulesContainer}>
                <Text style={styles.rulesDesc}>
                  Xây dựng hệ thống và nhận hoa hồng dựa trên <Text style={styles.rulesHighlight}>Phí nền tảng (Chiết khấu ứng dụng)</Text> của mỗi chuyến đi do mạng lưới của bạn hoàn thành. Thu nhập được bảo lưu <Text style={styles.rulesHighlight}>24 Giờ (Pending)</Text> trước khi cộng thẳng vào ví.
                </Text>

                <TierRuleItem level="F1" percent="8%" color="#F59E0B" />
                <TierRuleItem level="F2" percent="3%" color="#9CA3AF" />
                <TierRuleItem level="F3" percent="1%" color="#D97706" />

                <View style={styles.noteBox}>
                  <MaterialIcons name="verified-user" size={20} color="#F59E0B" />
                  <Text style={styles.noteText}>
                    Thu nhập hoàn toàn tách biệt, <Text style={{ fontWeight: '700' }}>KHÔNG TRỪ</Text> vào thu nhập của đối tác cấp dưới. Hệ thống công bằng, minh bạch, duyệt tự động mỗi ngày.
                  </Text>
                </View>
              </View>
            )}
          </View>

          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#111827',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EAB308',
    letterSpacing: 2,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111827',
  },
  loadingText: {
    color: '#9CA3AF',
    marginTop: SPACING.md,
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  heroBanner: {
    padding: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl * 1.5,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#374151',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(253, 230, 138, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(253, 230, 138, 0.3)',
    marginBottom: SPACING.lg,
  },
  badgeText: {
    color: '#FEF08A',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginLeft: 6,
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 1,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
    marginBottom: SPACING.xl,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 24,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    width: '100%',
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: SPACING.xl,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#374151',
  },
  statLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  statValueGold: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F59E0B',
  },
  codeContainer: {
    width: '100%',
    alignItems: 'center',
  },
  codeLabel: {
    color: '#9CA3AF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: SPACING.sm,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingLeft: SPACING.xl,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 100,
    width: '100%',
    justifyContent: 'space-between',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
  },
  codeText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 3,
  },
  shareBtnIcon: {
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  shareBtnGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginTop: -24,
    marginHorizontal: SPACING.lg,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    position: 'relative',
  },
  tabActive: {
    backgroundColor: '#FFFBEB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  tabTextActive: {
    color: '#B45309',
  },
  tabActiveIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 24,
    height: 3,
    backgroundColor: '#F59E0B',
    borderRadius: 2,
  },
  tabContent: {
    padding: SPACING.xl,
  },

  // Custom Card for Downline
  networkContainer: {
    gap: SPACING.md,
  },
  downlineCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  downlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    width: 56,
    height: 56,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tierBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
  },
  tierBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '900',
  },
  downlineInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  downlineName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  downlineDate: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  downlineRight: {
    padding: SPACING.xs,
  },
  expandedContent: {
    marginTop: SPACING.md,
  },
  expandedDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginBottom: SPACING.md,
  },
  statDetailRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: SPACING.sm,
  },
  statDetailCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDetailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 2,
  },
  statDetailValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  commissionBox: {
    backgroundColor: '#FFFBEB',
    padding: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FEF08A',
    gap: 8,
  },
  commissionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commissionLabel: {
    fontSize: 13,
    color: '#92400E',
    flex: 1,
    marginLeft: 6,
    fontWeight: '500',
  },
  commissionPending: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  commissionCompleted: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10B981',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: SPACING.lg,
  },
  emptyDesc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    lineHeight: 20,
  },

  // Rules
  rulesContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  rulesDesc: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 22,
    marginBottom: SPACING.xl,
  },
  rulesHighlight: {
    fontWeight: '700',
    color: '#111827',
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: SPACING.md,
    borderRadius: 16,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  ruleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  ruleLevelText: {
    fontSize: 18,
    fontWeight: '900',
  },
  ruleInfo: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  ruleDesc: {
    fontSize: 11,
    color: '#6B7280',
  },
  rulePercentText: {
    fontSize: 18,
    fontWeight: '900',
  },
  noteBox: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    padding: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FEF08A',
    borderStyle: 'dashed',
  },
  noteText: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 12,
    color: '#92400E',
    lineHeight: 18,
  },
});
