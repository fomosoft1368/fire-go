import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING } from '../constants'
import { useEffect, useState } from 'react'
import { legalDocsService, LegalDocument } from '../services/legalDocsService'

interface PrivacyPolicyScreenProps {
  navigation: any
}

export default function PrivacyPolicyScreen({ navigation }: PrivacyPolicyScreenProps) {
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
      const data = await legalDocsService.getPrivacyPolicy('vi')
      setDocument(data)
    } catch (err: any) {
      console.error('Failed to load privacy policy:', err)
      setError(err.message || 'Không thể tải chính sách bảo mật')
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
          <ActivityIndicator size="large" color="#10b981" />
          <Text style={styles.loadingText}>
            Đang tải chính sách bảo mật...
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
        style={styles.scrollView} 
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Introduction Box */}
          <View style={styles.introBox}>
            <MaterialIcons name="privacy-tip" size={48} color="#10b981" />
            <Text style={styles.introTitle}>
              {document.title}
            </Text>
            <Text style={styles.introDate}>
              Cập nhật lần cuối: {formatDate(document.updatedAt)}
            </Text>
            <View style={styles.versionBadge}>
              <Text style={styles.versionText}>v{document.version}</Text>
            </View>
          </View>

          {/* Introduction */}
          {document.content.introduction && (
            <Text style={styles.paragraph}>
              {document.content.introduction}
            </Text>
          )}

          {/* Sections */}
          {document.content.sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {index + 1}. {section.title}
              </Text>
              
              {section.content && (
                <Text style={styles.paragraph}>
                  {section.content}
                </Text>
              )}

              {section.bulletPoints && section.bulletPoints.length > 0 && (
                <View style={styles.bulletList}>
                  {section.bulletPoints.map((bullet, bulletIndex) => (
                    <View key={bulletIndex} style={styles.listItem}>
                      <View style={styles.bullet} />
                      <Text style={styles.listText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              )}

              {section.subsections && section.subsections.map((subsection, subIndex) => (
                <View key={subIndex} style={styles.subsection}>
                  <View style={styles.infoBox}>
                    <View style={styles.infoHeader}>
                      <MaterialIcons name="info" size={24} color="#10b981" />
                      <Text style={styles.infoTitle}>
                        {subsection.title}
                      </Text>
                    </View>
                    {subsection.content && (
                      <Text style={styles.paragraph}>
                        {subsection.content}
                      </Text>
                    )}
                    {subsection.bulletPoints && subsection.bulletPoints.length > 0 && (
                      <View style={styles.bulletList}>
                        {subsection.bulletPoints.map((bullet, bulletIndex) => (
                          <View key={bulletIndex} style={styles.listItem}>
                            <View style={styles.bullet} />
                            <Text style={styles.listText}>{bullet}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              ))}
            </View>
          ))}

          {/* Contact Section */}
          {document.content.contactInfo && (
            <View style={styles.contactBox}>
              <View style={styles.contactHeader}>
                <MaterialIcons name="contact-support" size={24} color="#10b981" />
                <Text style={styles.contactTitle}>Liên hệ</Text>
              </View>
              {document.content.contactInfo.email && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="email" size={18} color="#64748b" />
                  <Text style={styles.contactText}>
                    Email: {document.content.contactInfo.email}
                  </Text>
                </View>
              )}
              {document.content.contactInfo.phone && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="phone" size={18} color="#64748b" />
                  <Text style={styles.contactText}>
                    Hotline: {document.content.contactInfo.phone}
                  </Text>
                </View>
              )}
              {document.content.contactInfo.address && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="location-on" size={18} color="#64748b" />
                  <Text style={styles.contactText}>
                    {document. content.contactInfo.address}
                  </Text>
                </View>
              )}
              {document.content.contactInfo.dataProtectionOfficer && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="security" size={18} color="#64748b" />
                  <Text style={styles.contactText}>
                    DPO: {document.content.contactInfo.dataProtectionOfficer}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Compliance */}
          {document.content.compliance && (
            <View style={styles.complianceBox}>
              <MaterialIcons name="verified-user" size={20} color="#10b981" />
              <Text style={styles.complianceText}>
                {document.content.compliance}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chính sách bảo mật</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      {renderContent()}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
    backgroundColor: '#10b981',
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: '#10b981',
    borderBottomWidth: 1,
    borderBottomColor: '#059669',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
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
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
  },
  introBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    letterSpacing: -0.5,
    color: '#0f172a',
  },
  introDate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.sm,
    color: '#64748b',
  },
  versionBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: SPACING.sm,
  },
  versionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginBottom: SPACING.md,
    letterSpacing: -0.3,
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
  },
  bulletList: {
    marginVertical: SPACING.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
    marginTop: 9,
    marginRight: SPACING.md,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
    color: '#64748b',
  },
  infoBox: {
    padding: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: SPACING.sm,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    color: '#0f172a',
  },
  contactBox: {
    padding: SPACING.lg,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: SPACING.md,
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
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
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  contactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  complianceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: SPACING.lg,
    gap: SPACING.md,
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  complianceText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    color: '#166534',
  },
})
