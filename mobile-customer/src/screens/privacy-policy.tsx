import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { SPACING, COLORS_DARK, COLORS_LIGHT } from '../constants'
import { useEffect, useState } from 'react'
import { legalDocsService, LegalDocument } from '../services/legalDocsService'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation()
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT
  const insets = useSafeAreaInsets()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [document, setDocument] = useState<LegalDocument | null>(null)

  // Accent Colors
  const accentOrange = colors.primary
  const accentOrangeDark = '#ea580c'

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
          <ActivityIndicator size="large" color={accentOrange} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            Đang tải chính sách bảo mật...
          </Text>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.centerContainer}>
          <MaterialIcons name="error-outline" size={56} color="#ef4444" />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadDocument}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[accentOrange, accentOrangeDark]}
              style={styles.retryButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="refresh" size={20} color="#ffffff" />
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </LinearGradient>
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
        {/* Header Details */}
        <View style={[styles.titleSection]}>
          <Text style={[styles.mainTitle, { color: colors.text }]}>{document.title}</Text>
          
          <View style={[styles.updateBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.updateIconWrap, { backgroundColor: 'rgba(255,107,0,0.1)' }]}>
              <MaterialIcons name="security" size={18} color={accentOrange} />
            </View>
            <View style={styles.updateTextWrap}>
              <Text style={[styles.updateTextLabel, { color: colors.textSecondary }]}>Cập nhật lần cuối</Text>
              <Text style={[styles.updateText, { color: colors.text }]}>{formatDate(document.updatedAt)}</Text>
            </View>
            <View style={[styles.versionBadge, { backgroundColor: accentOrange }]}>
              <Text style={styles.versionText}>v{document.version}</Text>
            </View>
          </View>
        </View>

        {/* Introduction */}
        {document.content.introduction && (
          <View style={styles.section}>
            <Text style={[styles.paragraph, { color: colors.textSecondary, fontStyle: 'italic' }]}>
              {document.content.introduction}
            </Text>
          </View>
        )}

        {/* Sections */}
        {document.content.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.numberBadge, { backgroundColor: 'rgba(255,107,0,0.1)' }]}>
                <Text style={[styles.numberBadgeText, { color: accentOrange }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
            </View>
            
            <View style={styles.sectionContentWrap}>
              {section.content && (
                <Text style={[styles.paragraph, { color: colors.text }]}>
                  {section.content}
                </Text>
              )}

              {section.bulletPoints && section.bulletPoints.length > 0 && (
                <View style={styles.bulletList}>
                  {section.bulletPoints.map((bullet, bulletIndex) => (
                    <View key={bulletIndex} style={styles.bulletItem}>
                      <View style={[styles.bulletDot, { backgroundColor: accentOrange }]} />
                      <Text style={[styles.bulletText, { color: colors.text }]}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              )}

              {section.subsections && section.subsections.map((subsection, subIndex) => (
                <View key={subIndex} style={styles.subsection}>
                  <Text style={[styles.subHeading, { color: colors.text }]}>
                    {index + 1}.{subIndex + 1}. {subsection.title}
                  </Text>
                  {subsection.content && (
                    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
                      {subsection.content}
                    </Text>
                  )}
                  {subsection.bulletPoints && subsection.bulletPoints.length > 0 && (
                    <View style={styles.bulletList}>
                      {subsection.bulletPoints.map((bullet, bulletIndex) => (
                        <View key={bulletIndex} style={styles.bulletItem}>
                          <View style={[styles.bulletDot, { backgroundColor: accentOrange, opacity: 0.8 }]} />
                          <Text style={[styles.bulletText, { color: colors.textSecondary }]}>{bullet}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Contact Section */}
        {document.content.contactInfo && (
          <View style={[styles.contactSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <LinearGradient
              colors={['rgba(255,107,0,0.05)', 'rgba(255,107,0,0)']}
              style={StyleSheet.absoluteFillObject}
              borderRadius={20}
            />
            <View style={styles.contactHeader}>
              <View style={[styles.contactIconWrap, { backgroundColor: 'rgba(255,107,0,0.1)' }]}>
                <MaterialIcons name="contact-support" size={24} color={accentOrange} />
              </View>
              <Text style={[styles.contactTitle, { color: colors.text }]}>Liên hệ bảo mật bảo vệ dữ liệu</Text>
            </View>
            <View style={styles.contactList}>
              {document.content.contactInfo.email && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="email" size={18} color={accentOrange} />
                  <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                    {document.content.contactInfo.email}
                  </Text>
                </View>
              )}
              {document.content.contactInfo.phone && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="phone" size={18} color={accentOrange} />
                  <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                    {document.content.contactInfo.phone}
                  </Text>
                </View>
              )}
              {document.content.contactInfo.address && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="location-on" size={18} color={accentOrange} />
                  <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                    {document.content.contactInfo.address}
                  </Text>
                </View>
              )}
              {document.content.contactInfo.dataProtectionOfficer && (
                <View style={styles.contactItem}>
                  <MaterialIcons name="security" size={18} color={accentOrange} />
                  <Text style={[styles.contactText, { color: colors.textSecondary }]}>
                    DPO: {document.content.contactInfo.dataProtectionOfficer}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Compliance Footer */}
        {document.content.compliance && (
          <View style={[styles.footerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.footerIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <MaterialIcons name="verified-user" size={24} color="#10b981" />
            </View>
            <Text style={[styles.footerText, { color: colors.text }]}>
              {document.content.compliance}
            </Text>
          </View>
        )}
      </ScrollView>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: '#ffffff' }]}>
      {/* Header */}
      <LinearGradient
        colors={['#ffffff', '#ffffff']}
        style={[styles.headerGradient, { paddingTop: insets.top + SPACING.sm }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back-ios" size={20} color={colors.text} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Chính sách bảo mật</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </LinearGradient>

      {/* Content */}
      <View style={styles.mainArea}>
        {renderContent()}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  retryButton: {
    width: 140,
    shadowColor: '#ea580c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  headerGradient: {
    paddingBottom: SPACING.md,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl + 40,
  },
  titleSection: {
    marginBottom: SPACING.lg,
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '800',
    marginBottom: SPACING.xl,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  updateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: 16,
    borderWidth: 1,
  },
  updateIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  updateTextWrap: {
    flex: 1,
  },
  updateTextLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 2,
  },
  updateText: {
    fontSize: 15,
    fontWeight: '700',
  },
  versionBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: 10,
  },
  versionText: {
    color: '#ffffff',
    fontSize: 12,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBadgeText: {
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
  },
  sectionContentWrap: {
    paddingLeft: 18,
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(0,0,0,0.03)',
    marginLeft: 17,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
    fontWeight: '500',
  },
  subsection: {
    marginTop: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.01)',
    padding: SPACING.md,
    borderRadius: 12,
  },
  subHeading: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: SPACING.sm,
  },
  bulletList: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
    marginRight: SPACING.md,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  contactSection: {
    borderRadius: 20,
    padding: SPACING.xl,
    borderWidth: 1,
    marginTop: SPACING.md,
    overflow: 'hidden',
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  contactIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  contactList: {
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
    backgroundColor: 'rgba(0,0,0,0.02)',
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
  },
  contactText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: SPACING.xxl,
    gap: SPACING.md,
  },
  footerIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
  },
})
