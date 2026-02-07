import { useState } from 'react'
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { SPACING } from '../constants'

interface SupportOption {
  id: string
  icon: string
  title: string
  description: string
  action: () => void
  iconColor: string
  iconBg: string
}

interface FAQ {
  id: string
  question: string
  answer: string
}

const mockFAQs: FAQ[] = [
  {
    id: '1',
    question: 'Làm sao để nhận chuyến xe?',
    answer: 'Bật trạng thái "Trực tuyến" trên màn hình chính. Hệ thống sẽ tự động gửi yêu cầu chuyến xe phù hợp với vị trí của bạn.',
  },
  {
    id: '2',
    question: 'Khi nào tôi nhận được tiền?',
    answer: 'Tiền từ các chuyến hoàn thành sẽ được chuyển vào ví của bạn ngay lập tức. Bạn có thể rút tiền về tài khoản ngân hàng bất cứ lúc nào.',
  },
  {
    id: '3',
    question: 'Làm sao để liên hệ khách hàng?',
    answer: 'Trong chi tiết chuyến xe, nhấn vào biểu tượng điện thoại hoặc tin nhắn để liên hệ trực tiếp với khách hàng.',
  },
  {
    id: '4',
    question: 'Tôi có thể hủy chuyến không?',
    answer: 'Bạn có thể hủy chuyến trước khi đón khách. Tuy nhiên, việc hủy nhiều chuyến có thể ảnh hưởng đến điểm đánh giá của bạn.',
  },
]

export default function SupportScreen({ navigation }: any) {
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)

  const handleCall = () => {
    Linking.openURL('tel:1900xxxx')
  }

  const handleEmail = () => {
    Linking.openURL('mailto:support@firego.vn')
  }

  const handleChat = () => {
    // Navigate to chat screen or open chat
    Alert.alert('Chat hỗ trợ', 'Chức năng chat đang được phát triển')
  }

  const handleGuide = () => {
    Alert.alert('Hướng dẫn', 'Mở tài liệu hướng dẫn sử dụng')
  }

  const supportOptions: SupportOption[] = [
    {
      id: '1',
      icon: 'phone',
      title: 'Gọi hotline',
      description: '1900 xxxx (Miễn phí)',
      action: handleCall,
      iconColor: '#10b981',
      iconBg: '#d1fae5',
    },
    {
      id: '2',
      icon: 'chat',
      title: 'Chat trực tuyến',
      description: 'Hỗ trợ 24/7',
      action: handleChat,
      iconColor: '#3b82f6',
      iconBg: '#dbeafe',
    },
    {
      id: '3',
      icon: 'email',
      title: 'Gửi email',
      description: 'support@firego.vn',
      action: handleEmail,
      iconColor: '#f59e0b',
      iconBg: '#fef3c7',
    },
    {
      id: '4',
      icon: 'menu-book',
      title: 'Hướng dẫn sử dụng',
      description: 'Tài liệu chi tiết',
      action: handleGuide,
      iconColor: '#8b5cf6',
      iconBg: '#ede9fe',
    },
  ]

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation?.goBack()}
          >
            <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Trợ giúp</Text>
            <Text style={styles.headerSubtitle}>Hỗ trợ tài xế 24/7</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Hero Card */}
        <View style={styles.heroCardWrapper}>
          <LinearGradient
            colors={['#FF8A3D', '#FF6B00', '#E85D00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            
            <View style={styles.heroIconBox}>
              <MaterialIcons name="headset-mic" size={40} color="#fff" />
            </View>
            <Text style={styles.heroTitle}>Chúng tôi luôn sẵn sàng hỗ trợ bạn</Text>
            <Text style={styles.heroDescription}>
              Đội ngũ hỗ trợ 24/7 luôn sẵn sàng giải đáp mọi thắc mắc của bạn
            </Text>
          </LinearGradient>
        </View>

        {/* Quick Support Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Liên hệ nhanh</Text>
          <View style={styles.optionsGrid}>
            {supportOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={styles.optionCard}
                onPress={option.action}
                activeOpacity={0.7}
              >
                <View style={[styles.optionIconBox, { backgroundColor: option.iconBg }]}>
                  <MaterialIcons name={option.icon as any} size={28} color={option.iconColor} />
                </View>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
                <View style={styles.optionArrow}>
                  <MaterialIcons name="arrow-forward" size={16} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <View style={styles.faqHeader}>
            <Text style={styles.sectionTitle}>Câu hỏi thường gặp</Text>
            <View style={styles.faqBadge}>
              <Text style={styles.faqBadgeText}>{mockFAQs.length} câu hỏi</Text>
            </View>
          </View>

          {mockFAQs.map((faq) => (
            <TouchableOpacity
              key={faq.id}
              style={styles.faqItem}
              onPress={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
              activeOpacity={0.7}
            >
              <View style={styles.faqQuestionRow}>
                <View style={styles.faqIconBox}>
                  <MaterialIcons name="help-outline" size={20} color="#FF6B00" />
                </View>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <MaterialIcons
                  name={expandedFAQ === faq.id ? 'expand-less' : 'expand-more'}
                  size={24}
                  color="#64748b"
                />
              </View>
              {expandedFAQ === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Emergency Contact Card */}
        <View style={styles.section}>
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <View style={styles.emergencyIconBox}>
                <MaterialIcons name="warning" size={24} color="#ef4444" />
              </View>
              <View style={styles.emergencyContent}>
                <Text style={styles.emergencyTitle}>Trường hợp khẩn cấp</Text>
                <Text style={styles.emergencyDescription}>
                  Gọi ngay số hotline nếu gặp sự cố nghiêm trọng
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.emergencyButton} onPress={handleCall}>
              <MaterialIcons name="phone" size={20} color="#fff" />
              <Text style={styles.emergencyButtonText}>Gọi ngay</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.xl,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    marginTop: 2,
  },
  headerRight: {
    width: 44,
  },
  heroCardWrapper: {
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  heroCard: {
    borderRadius: 24,
    padding: SPACING.xxl,
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  decorCircle1: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  decorCircle2: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  heroIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    zIndex: 1,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#fff',
    textAlign: 'center',
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
    zIndex: 1,
  },
  heroDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
    zIndex: 1,
  },
  section: {
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
    marginBottom: SPACING.lg,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  optionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: SPACING.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  optionIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  optionDescription: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 16,
  },
  optionArrow: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  faqBadge: {
    backgroundColor: '#fff5eb',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: 12,
  },
  faqBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF6B00',
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  faqQuestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faqIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff5eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  faqAnswer: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingLeft: 52,
  },
  faqAnswerText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    fontWeight: '500',
  },
  emergencyCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 2,
    borderColor: '#fee2e2',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  emergencyIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fee2e2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  emergencyContent: {
    flex: 1,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: SPACING.xs,
    letterSpacing: -0.3,
  },
  emergencyDescription: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
    lineHeight: 18,
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: '#ef4444',
    paddingVertical: SPACING.md,
    borderRadius: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emergencyButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
  bottomSpacing: {
    height: SPACING.xxl,
  },
})
