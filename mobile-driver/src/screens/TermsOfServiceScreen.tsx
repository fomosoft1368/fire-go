import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING } from '../constants'
import { useEffect, useState } from 'react'
import { legalDocsService, LegalDocument } from '../services/legalDocsService'

interface TermsOfServiceScreenProps {
  navigation: any
}

export default function TermsOfServiceScreen({ navigation }: TermsOfServiceScreenProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<LegalDocument | null>(null)

  useEffect(() => {
    loadDocument()
  }, [])

  const loadDocument = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await legalDocsService.getTermsOfService('vi')
      setDocument(data)
    } catch (err: any) {
      console.error('Failed to load terms:', err)
      setError(err.message || 'Không thể tải điều khoản dịch vụ')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>
            Đang tải điều khoản dịch vụ...
          </Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadDocument}
          >
            <MaterialIcons name="refresh" size={20} color="#fff" />
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      )
    }

    if (!document) {
      return null
    }

    return (
      <ScrollView 
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {/* Last Updated */}
        <View style={styles.updateBox}>
          <MaterialIcons name="update" size={16} color="#64748b" />
          <Text style={styles.updateText}>
            Cập nhật lần cuối: {formatDate(document.updatedAt)}
          </Text>
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>v{document.version}</Text>
          </View>
        </View>

        {/* Introduction */}
        {document.content.introduction && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{document.title}</Text>
            <Text style={styles.paragraph}>
              {document.content.introduction}
            </Text>
          </View>
        )}

        {/* Sections */}
        {document.content.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>{index + 1}</Text>
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            
            {section.content && (
              <Text style={styles.paragraph}>
                {section.content}
              </Text>
            )}

            {section.bulletPoints && section.bulletPoints.length > 0 && (
              <View style={styles.bulletList}>
                {section.bulletPoints.map((bullet, bulletIndex) => (
                  <View key={bulletIndex} style={styles.bulletItem}>
                    <View style={styles.bulletDot} />
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            )}

            {section.subsections && section.subsections.map((subsection, subIndex) => (
              <View key={subIndex} style={styles.subsection}>
                <Text style={styles.subHeading}>
                  {index + 1}.{subIndex + 1}. {subsection.title}
                </Text>
                {subsection.content && (
                  <Text style={styles.paragraph}>
                    {subsection.content}
                  </Text>
                )}
                {subsection.bulletPoints && subsection.bulletPoints.length > 0 && (
                  <View style={styles.bulletList}>
                    {subsection.bulletPoints.map((bullet, bulletIndex) => (
                      <View key={bulletIndex} style={styles.bulletItem}>
                        <View style={styles.bulletDot} />
                        <Text style={styles.bulletText}>{bullet}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        ))}

        {/* Contact Section */}
        {document.content.contactInfo && (
          <View style={[styles.section, styles.contactSection]}>
            <View style={styles.contactHeader}>
              <MaterialIcons name="support-agent" size={24} color="#FF6B00" />
              <Text style={styles.contactTitle}>Liên hệ hỗ trợ</Text>
            </View>
            <Text style={styles.paragraph}>
              Nếu bạn có bất kỳ câu hỏi nào về điều khoản dịch vụ, vui lòng liên hệ với chúng tôi:
            </Text>
            <View style={styles.contactList}>
              {document.content.contactInfo.email && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="email" size={18} color="#64748b" />
                  <Text style={styles.contactText}>
                    {document.content.contactInfo.email}
                  </Text>
                </View>
              )}
              {document.content.contactInfo.phone && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="phone" size={18} color="#64748b" />
                  <Text style={styles.contactText}>
                    {document.content.contactInfo.phone}
                  </Text>
                </View>
              )}
              {document.content.contactInfo.address && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="location-on" size={18} color="#64748b" />
                  <Text style={styles.contactText}>
                    {document.content.contactInfo.address}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <MaterialIcons name="verified-user" size={20} color="#10b981" />
          <Text style={styles.footerText}>
            Bằng việc sử dụng dịch vụ, bạn xác nhận đã đọc và đồng ý với các điều khoản trên.
          </Text>
        </View>
      </ScrollView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Điều khoản dịch vụ</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {/* Content */}
        {renderContent()}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.lg,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.md,
    color: '#64748b',
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.md,
    color: '#0f172a',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#FF6B00',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    marginTop: SPACING.md,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#fff',
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
    backgroundColor: '#f1f5f9',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
    color: '#0f172a',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  updateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    marginBottom: SPACING.lg,
  },
  updateText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  versionBadge: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 8,
  },
  versionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  numberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBadgeText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'white',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
    color: '#0f172a',
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: SPACING.md,
    fontWeight: '500',
    color: '#64748b',
  },
  subsection: {
    marginTop: SPACING.md,
    marginLeft: SPACING.md,
  },
  subHeading: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
    color: '#0f172a',
  },
  bulletList: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.md,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B00',
    marginTop: 9,
    marginRight: SPACING.md,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    color: '#64748b',
  },
  contactSection: {
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  contactTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  contactList: {
    marginTop: SPACING.sm,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  contactText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#86efac',
    backgroundColor: '#f0fdf4',
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.sm,
    fontWeight: '600',
    lineHeight: 20,
    color: '#166534',
  },
})
