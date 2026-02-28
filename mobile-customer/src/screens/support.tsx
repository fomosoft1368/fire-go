import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { SPACING, COLORS_DARK, COLORS_LIGHT } from '../constants'
import { useState } from 'react'

export default function SupportScreen() {
  const navigation = useNavigation()
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null)

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

  const handleReportIssue = () => {
    Alert.alert(
      'Báo cáo sự cố',
      'Vui lòng mô tả chi tiết sự cố bạn gặp phải. Chúng tôi sẽ phản hồi trong vòng 24 giờ.',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Gửi email', onPress: () => Linking.openURL('mailto:support@firego.vn?subject=Báo cáo sự cố') }
      ]
    )
  }

  const contactMethods = [
    {
      icon: 'phone',
      title: 'Hotline 24/7',
      subtitle: '1900 xxxx',
      description: 'Gọi miễn phí mọi lúc',
      color: '#10b981',
      onPress: handleCall
    },
    {
      icon: 'email',
      title: 'Email',
      subtitle: 'support@firego.vn',
      description: 'Phản hồi trong 24h',
      color: '#3b82f6',
      onPress: handleEmail
    },
    {
      icon: 'chat',
      title: 'Chat trực tuyến',
      subtitle: 'Hỗ trợ nhanh',
      description: 'Thời gian: 8:00 - 22:00',
      color: '#8b5cf6',
      onPress: handleChat
    }
  ]

  const quickActions = [
    {
      icon: 'history',
      title: 'Lịch sử chuyến đi',
      description: 'Xem chi tiết các chuyến đã đi',
      color: '#f59e0b',
      route: 'History'
    },
    {
      icon: 'receipt-long',
      title: 'Hóa đơn & Thanh toán',
      description: 'Quản lý giao dịch',
      color: '#ec4899',
      route: 'Wallet'
    },
    {
      icon: 'account-circle',
      title: 'Tài khoản của tôi',
      description: 'Cập nhật thông tin cá nhân',
      color: '#06b6d4',
      route: 'Profile'
    },
    {
      icon: 'bug-report',
      title: 'Báo cáo sự cố',
      description: 'Gặp vấn đề? Hãy cho chúng tôi biết',
      color: '#ef4444',
      onPress: handleReportIssue
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
    <View style={[styles.safetyCard, { backgroundColor: themeMode === 'dark' ? '#1e293b' : '#fef2f2', borderColor: themeMode === 'dark' ? '#ef4444' : '#fecaca' }]}>
      <View style={styles.safetyHeader}>
        <MaterialIcons name="shield" size={32} color="#ef4444" />
        <View style={{ flex: 1, marginLeft: SPACING.md }}>
          <Text style={[styles.safetyTitle, { color: colors.text }]}>An toàn & Bảo mật</Text>
          <Text style={[styles.safetySubtitle, { color: colors.textSecondary }]}>
            Chúng tôi luôn đảm bảo an toàn cho bạn
          </Text>
        </View>
      </View>
      <View style={styles.safetyFeatures}>
        <View style={styles.safetyFeature}>
          <MaterialIcons name="verified-user" size={20} color="#10b981" />
          <Text style={[styles.safetyFeatureText, { color: colors.textSecondary }]}>
            Tài xế xác thực danh tính
          </Text>
        </View>
        <View style={styles.safetyFeature}>
          <MaterialIcons name="gps-fixed" size={20} color="#10b981" />
          <Text style={[styles.safetyFeatureText, { color: colors.textSecondary }]}>
            Theo dõi hành trình thời gian thực
          </Text>
        </View>
        <View style={styles.safetyFeature}>
          <MaterialIcons name="share-location" size={20} color="#10b981" />
          <Text style={[styles.safetyFeatureText, { color: colors.textSecondary }]}>
            Chia sẻ vị trí với người thân
          </Text>
        </View>
        <View style={styles.safetyFeature}>
          <MaterialIcons name="support-agent" size={20} color="#10b981" />
          <Text style={[styles.safetyFeatureText, { color: colors.textSecondary }]}>
            Hỗ trợ khẩn cấp 24/7
          </Text>
        </View>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: COLORS_LIGHT.primary, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hỗ trợ</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <MaterialIcons name="support-agent" size={64} color={COLORS_LIGHT.primary} />
            <Text style={[styles.heroTitle, { color: colors.text }]}>
              Chúng tôi có thể giúp gì cho bạn?
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Đội ngũ hỗ trợ 24/7 luôn sẵn sàng giải đáp thắc mắc
            </Text>
          </View>

          {/* Contact Methods */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Liên hệ với chúng tôi</Text>
            {contactMethods.map((method, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.contactCard, { backgroundColor: themeMode === 'dark' ? '#1e293b' : '#fff', borderColor: colors.border }]}
                onPress={method.onPress}
                activeOpacity={0.7}
              >
                <View style={[styles.contactIconContainer, { backgroundColor: `${method.color}15` }]}>
                  <MaterialIcons name={method.icon as any} size={28} color={method.color} />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactTitle, { color: colors.text }]}>{method.title}</Text>
                  <Text style={[styles.contactSubtitle, { color: method.color }]}>{method.subtitle}</Text>
                  <Text style={[styles.contactDescription, { color: colors.textSecondary }]}>
                    {method.description}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            ))}
          </View>

          {/* Quick Actions */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Truy cập nhanh</Text>
            <View style={styles.quickActionsGrid}>
              {quickActions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.quickActionCard, { backgroundColor: themeMode === 'dark' ? '#1e293b' : '#fff', borderColor: colors.border }]}
                  onPress={() => action.route ? navigation.navigate(action.route as never) : action.onPress?.()}
                  activeOpacity={0.7}
                >
                  <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}15` }]}>
                    <MaterialIcons name={action.icon as any} size={24} color={action.color} />
                  </View>
                  <Text style={[styles.quickActionTitle, { color: colors.text }]} numberOfLines={2}>
                    {action.title}
                  </Text>
                  <Text style={[styles.quickActionDescription, { color: colors.textSecondary }]} numberOfLines={2}>
                    {action.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* FAQ Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Câu hỏi thường gặp</Text>
            {faqs.map((faq, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.faqCard, { backgroundColor: themeMode === 'dark' ? '#1e293b' : '#fff', borderColor: colors.border }]}
                onPress={() => setExpandedFAQ(expandedFAQ === index ? null : index)}
                activeOpacity={0.8}
              >
                <View style={styles.faqHeader}>
                  <View style={styles.faqIconContainer}>
                    <MaterialIcons name="help-outline" size={20} color={COLORS_LIGHT.primary} />
                  </View>
                  <Text style={[styles.faqQuestion, { color: colors.text }]}>{faq.question}</Text>
                  <MaterialIcons
                    name={expandedFAQ === index ? 'expand-less' : 'expand-more'}
                    size={24}
                    color={colors.textSecondary}
                  />
                </View>
                {expandedFAQ === index && (
                  <View style={styles.faqAnswerContainer}>
                    <View style={[styles.faqDivider, { backgroundColor: colors.border }]} />
                    <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
                      {faq.answer}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Safety Card */}
          <SafetyCard />

          {/* Help Center Link */}
          <TouchableOpacity
            style={[styles.helpCenterCard, { backgroundColor: `${COLORS_LIGHT.primary}10`, borderColor: COLORS_LIGHT.primary }]}
            onPress={() => Alert.alert('Trung tâm trợ giúp', 'Tính năng đang được phát triển')}
          >
            <MaterialIcons name="menu-book" size={32} color={COLORS_LIGHT.primary} />
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={[styles.helpCenterTitle, { color: colors.text }]}>
                Trung tâm trợ giúp
              </Text>
              <Text style={[styles.helpCenterSubtitle, { color: colors.textSecondary }]}>
                Tìm hiểu thêm về các tính năng và dịch vụ
              </Text>
            </View>
            <MaterialIcons name="arrow-forward" size={24} color={COLORS_LIGHT.primary} />
          </TouchableOpacity>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Bạn không tìm thấy câu trả lời?
            </Text>
            <TouchableOpacity style={styles.footerButton} onPress={handleEmail}>
              <Text style={styles.footerButtonText}>Liên hệ hỗ trợ</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: SPACING.xxl }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    paddingTop: 50,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.lg,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
    paddingHorizontal: SPACING.xl,
    lineHeight: 22,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: SPACING.md,
    letterSpacing: -0.3,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: 16,
    marginBottom: SPACING.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  contactIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  contactSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 13,
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  quickActionCard: {
    width: '48%',
    padding: SPACING.lg,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 140,
  },
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  quickActionTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: SPACING.xs,
    lineHeight: 18,
  },
  quickActionDescription: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
  },
  faqCard: {
    padding: SPACING.lg,
    borderRadius: 16,
    marginBottom: SPACING.md,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: `${COLORS_LIGHT.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  faqAnswerContainer: {
    marginTop: SPACING.md,
  },
  faqDivider: {
    height: 1,
    marginBottom: SPACING.md,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  safetyCard: {
    padding: SPACING.lg,
    borderRadius: 16,
    marginBottom: SPACING.xl,
    borderWidth: 2,
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  safetyTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 2,
  },
  safetySubtitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  safetyFeatures: {
    gap: SPACING.md,
  },
  safetyFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  safetyFeatureText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  helpCenterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: 16,
    marginBottom: SPACING.xl,
    borderWidth: 2,
  },
  helpCenterTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  helpCenterSubtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  footerButton: {
    backgroundColor: COLORS_LIGHT.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 24,
  },
  footerButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})
