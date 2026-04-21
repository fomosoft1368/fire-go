import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Platform, UIManager, LayoutAnimation } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { SPACING, COLORS_DARK, COLORS_LIGHT } from '../constants'
import { useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

export default function SupportScreen() {
  const navigation = useNavigation()
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const insets = useSafeAreaInsets()
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

  // Accent Colors
  const accentOrange = colors.primary
  const accentOrangeDark = '#ea580c' // A slight gradient step down from primary

  const handleCall = () => {
    Linking.openURL('tel:1900xxxx')
  }

  const handleEmail = () => {
    Linking.openURL('mailto:support@firego.vn?subject=Yêu cầu hỗ trợ')
  }

  const handleChat = () => {
    Alert.alert(
      'Chat trực tuyến',
      'Tính năng chat đang được phát triển. Vui lòng liên hệ qua hotline hoặc email.',
      [{ text: 'Đóng' }]
    )
  }

  const handleFAQPress = (index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedFAQ(expandedFAQ === index ? null : index);
  }

  const contactMethods = [
    {
      icon: 'support-agent',
      title: 'Hotline 24/7',
      subtitle: '1900 xxxx',
      description: 'Gọi miễn phí mọi lúc',
      onPress: handleCall
    },
    {
      icon: 'email',
      title: 'Gửi Email',
      subtitle: 'support@firego.vn',
      description: 'Phản hồi trong 24h',
      onPress: handleEmail
    },
    {
      icon: 'chat-bubble',
      title: 'Chat trực tuyến',
      subtitle: 'Hỗ trợ nhanh',
      description: 'Từ 8:00 đến 22:00',
      onPress: handleChat
    }
  ]

  const faqs = [
    {
      question: 'Làm sao để đặt chuyến đi?',
      answer: 'Chọn điểm đón và điểm đến trên bản đồ, chọn loại xe phù hợp, sau đó nhấn "Đặt xe". Hệ thống sẽ tự động tìm tài xế gần bạn nhất.'
    },
    {
      question: 'Tôi có thể hủy chuyến không?',
      answer: 'Có, bạn có thể hủy chuyến trước khi tài xế đến điểm đón. Lưu ý: Hủy sau 2 phút có thể bị tính phí hủy chuyến.'
    },
    {
      question: 'Các hình thức thanh toán nào được chấp nhận?',
      answer: 'FireGo hỗ trợ thanh toán tiền mặt, thẻ ATM/Visa/Mastercard, ví điện tử (Momo, ZaloPay), và ví FireGo.'
    },
    {
      question: 'Làm sao để liên hệ tài xế?',
      answer: 'Sau khi tài xế nhận chuyến, bạn có thể nhấn nút "Gọi" hoặc "Nhắn tin" trên màn hình chi tiết chuyến đi.'
    },
    {
      question: 'Tôi quên đồ trên xe, phải làm sao?',
      answer: 'Vào "Lịch sử chuyến đi", chọn chuyến đi gần nhất, nhấn "Liên hệ tài xế" hoặc gọi hotline 1900 xxxx để được hỗ trợ.'
    },
    {
      question: 'Làm sao để áp dụng mã khuyến mãi?',
      answer: 'Trước khi đặt xe, nhấn vào "Mã khuyến mãi", nhập mã hoặc chọn từ danh sách có sẵn, sau đó nhấn "Áp dụng".'
    },
    {
      question: 'Giá cước được tính như thế nào?',
      answer: 'Giá cước = Giá mở cửa + (Quãng đường × Giá/km) + (Thời gian × Giá/phút). Giá có thể tăng trong giờ cao điểm.'
    },
    {
      question: 'FireGo có dịch vụ giao hàng không?',
      answer: 'Có, FireGo cung cấp dịch vụ FireGo Delivery cho giao hàng nhanh trong nội thành với giá cước hấp dẫn.'
    },
    {
      question: 'Tôi làm sao để đánh giá tài xế?',
      answer: 'Sau khi kết thúc chuyến đi, bạn sẽ được yêu cầu đánh giá từ 1-5 sao và có thể để lại nhận xét về dịch vụ.'
    },
    {
      question: 'Tài khoản của tôi bị khóa, phải làm sao?',
      answer: 'Liên hệ ngay với bộ phận hỗ trợ qua hotline 1900 xxxx hoặc email support@firego.vn để được xử lý.'
    }
  ]

  const SafetyCard = () => (
    <View style={[styles.safetyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <LinearGradient
        colors={['rgba(255,107,0,0.05)', 'rgba(255,107,0,0)']}
        style={StyleSheet.absoluteFillObject}
        borderRadius={24}
      />
      <View style={styles.safetyHeader}>
        <View style={[styles.safetyIconWrapper, { backgroundColor: 'rgba(255,107,0,0.1)' }]}>
          <MaterialIcons name="security" size={28} color={accentOrange} />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={[styles.safetyTitle, { color: colors.text }]}>An toàn & Bảo mật</Text>
          <Text style={[styles.safetySubtitle, { color: colors.textSecondary }]}>
            Chúng tôi luôn ưu tiên an toàn của bạn
          </Text>
        </View>
      </View>
      <View style={styles.safetyFeatures}>
        {[
          { icon: 'verified-user', text: 'Tài xế xác thực danh tính' },
          { icon: 'gps-fixed', text: 'Theo dõi hành trình thời gian thực' },
          { icon: 'share-location', text: 'Chia sẻ chuyến đi với người thân' },
          { icon: 'emergency', text: 'Hỗ trợ khẩn cấp 24/7' }
        ].map((item, idx) => (
          <View key={idx} style={styles.safetyFeatureItem}>
            <View style={[styles.safetyCheckIcon, { backgroundColor: accentOrange }]}>
              <MaterialIcons name="check" size={14} color="#ffffff" />
            </View>
            <Text style={[styles.safetyFeatureText, { color: colors.text }]}>{item.text}</Text>
          </View>
        ))}
      </View>
    </View>
  )

  return (
    <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Dynamic Header & Hero */}
        <LinearGradient
          colors={['#ffffff', '#ffffff']}
          style={[styles.headerGradient, { paddingTop: insets.top + SPACING.sm }]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <MaterialIcons name="arrow-back-ios" size={20} color={colors.text} style={{ marginLeft: 6 }} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Hỗ trợ & CSKH</Text>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.heroSection}>
            <View style={[styles.heroIconWrapper, { backgroundColor: colors.card }]}>
              <MaterialIcons name="headset-mic" size={50} color={accentOrange} />
            </View>
            <Text style={[styles.heroTitle, { color: colors.text }]}>Chúng tôi có thể giúp gì?</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Mọi thắc mắc của bạn đều sẽ được giải quyết nhanh chóng và tận tâm nhất.
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.content}>

          {/* Support Contacts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactListWrapper} contentContainerStyle={styles.contactList}>
            {contactMethods.map((method, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.contactCard, { backgroundColor: colors.card, shadowColor: colors.text, borderColor: colors.border, borderWidth: 1 }]}
                onPress={method.onPress}
                activeOpacity={0.8}
              >
                <View style={[styles.contactIconGradient, { backgroundColor: 'rgba(255,107,0,0.08)' }]}>
                  <MaterialIcons name={method.icon as any} size={28} color={accentOrange} />
                </View>
                <Text style={[styles.contactTitle, { color: colors.text }]}>{method.title}</Text>
                <Text style={[styles.contactDesc, { color: colors.textSecondary }]}>{method.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* FAQ Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Câu hỏi thường gặp</Text>
              <TouchableOpacity>
                <Text style={[styles.viewAllText, { color: accentOrange }]}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.faqListWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {faqs.map((faq, index) => {
                const isExpanded = expandedFAQ === index;
                return (
                  <TouchableOpacity
                    key={index}
                    style={[styles.faqCard, index !== faqs.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    onPress={() => handleFAQPress(index)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.faqHeader}>
                      <Text style={[styles.faqQuestion, { color: isExpanded ? accentOrange : colors.text }]}>{faq.question}</Text>
                      <View style={[styles.faqToggleIcon, { backgroundColor: isExpanded ? `${accentOrange}15` : colors.background }]}>
                        <MaterialIcons
                          name={isExpanded ? 'remove' : 'add'}
                          size={20}
                          color={isExpanded ? accentOrange : colors.textSecondary}
                        />
                      </View>
                    </View>
                    {isExpanded && (
                      <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                        {faq.answer}
                      </Text>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          {/* Safety Context */}
          <SafetyCard />

          {/* Footer Area */}
          <View style={styles.footer}>
            <View style={[styles.footerIconWrap, { backgroundColor: 'rgba(255,107,0,0.05)' }]}>
              <MaterialIcons name="help-outline" size={32} color={accentOrange} />
            </View>
            <Text style={[styles.footerText, { color: colors.text }]}>
              Vẫn cần thêm trợ giúp?
            </Text>
            <Text style={[styles.footerSubText, { color: colors.textSecondary }]}>
              Chia sẻ vấn đề của bạn, chúng tôi sẽ hỗ trợ ngay!
            </Text>
            <TouchableOpacity style={styles.footerButton} onPress={handleEmail} activeOpacity={0.8}>
              <LinearGradient
                colors={[accentOrange, accentOrangeDark]}
                style={styles.footerButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name="edit-square" size={20} color="#ffffff" />
                <Text style={styles.footerButtonText}>Gửi yêu cầu hỗ trợ</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  headerGradient: {
    paddingBottom: 40,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 56,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  heroSection: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  heroIconWrapper: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    shadowColor: '#ff6b00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  heroSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  content: {
    flex: 1,
  },
  contactListWrapper: {
    marginTop: -30,
    marginBottom: SPACING.xxl,
  },
  contactList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  contactCard: {
    width: 140,
    padding: SPACING.lg,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
    elevation: 4,
    marginRight: SPACING.sm,
  },
  contactIconGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  contactTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  contactDesc: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 16,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '700',
  },
  faqListWrapper: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
  },
  faqCard: {
    padding: SPACING.lg,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    marginRight: SPACING.md,
  },
  faqToggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faqAnswer: {
    marginTop: SPACING.md,
    fontSize: 14,
    lineHeight: 24,
    fontWeight: '500',
  },
  safetyCard: {
    marginHorizontal: SPACING.lg,
    borderRadius: 24,
    padding: SPACING.xl,
    borderWidth: 1,
    marginBottom: SPACING.xl,
    overflow: 'hidden',
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  safetyIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  safetyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  safetySubtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  safetyFeatures: {
    gap: SPACING.md,
  },
  safetyFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  safetyCheckIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  safetyFeatureText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl + 40,
    paddingTop: SPACING.lg,
  },
  footerIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  footerText: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: SPACING.xs,
  },
  footerSubText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.xl,
    fontWeight: '500',
  },
  footerButton: {
    width: '100%',
    shadowColor: '#ff6b00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  footerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    gap: SPACING.sm,
  },
  footerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
})
