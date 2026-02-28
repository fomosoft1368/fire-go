import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { SPACING, COLORS_DARK, COLORS_LIGHT } from '../constants'

export default function TermsOfServiceScreen() {
  const navigation = useNavigation()
  const themeMode = useSelector((state: RootState) => state.theme.mode)
  const colors = themeMode === 'dark' ? COLORS_DARK : COLORS_LIGHT

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  )

  const Paragraph = ({ children }: { children: React.ReactNode }) => (
    <Text style={[styles.paragraph, { color: colors.textSecondary }]}>{children}</Text>
  )

  const ListItem = ({ children }: { children: React.ReactNode }) => (
    <View style={styles.listItem}>
      <View style={[styles.bullet, { backgroundColor: COLORS_LIGHT.primary }]} />
      <Text style={[styles.listText, { color: colors.textSecondary }]}>{children}</Text>
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#FF6B00', borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Điều khoản dịch vụ</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Introduction */}
          <View style={styles.introBox}>
            <MaterialIcons name="description" size={48} color="#FF6B00" />
            <Text style={[styles.introTitle, { color: colors.text }]}>
              Điều khoản sử dụng dịch vụ FireGo
            </Text>
            <Text style={[styles.introDate, { color: colors.textSecondary }]}>
              Cập nhật lần cuối: 10 tháng 2, 2026
            </Text>
          </View>

          <Paragraph>
            Chào mừng bạn đến với FireGo! Bằng việc sử dụng ứng dụng và dịch vụ của chúng tôi, bạn đồng ý 
            tuân thủ và bị ràng buộc bởi các điều khoản và điều kiện sau đây. Vui lòng đọc kỹ trước khi 
            sử dụng dịch vụ.
          </Paragraph>

          {/* Section 1 */}
          <Section title="1. Chấp nhận điều khoản">
            <Paragraph>
              Khi truy cập và sử dụng ứng dụng FireGo, bạn xác nhận rằng bạn đã đọc, hiểu và đồng ý bị 
              ràng buộc bởi các điều khoản này. Nếu bạn không đồng ý với bất kỳ phần nào của các điều 
              khoản, vui lòng không sử dụng dịch vụ của chúng tôi.
            </Paragraph>
          </Section>

          {/* Section 2 */}
          <Section title="2. Dịch vụ cung cấp">
            <Paragraph>FireGo cung cấp các dịch vụ sau:</Paragraph>
            <ListItem>Dịch vụ gọi xe (xe máy, ô tô)</ListItem>
            <ListItem>Dịch vụ ghép xe (rideshare)</ListItem>
            <ListItem>Dịch vụ giao hàng (delivery)</ListItem>
            <ListItem>Dịch vụ lái xe hộ (hire driver)</ListItem>
            <Paragraph>
              Chúng tôi kết nối người dùng với tài xế độc lập và không trực tiếp cung cấp dịch vụ vận 
              chuyển. FireGo đóng vai trò là nền tảng công nghệ kết nối.
            </Paragraph>
          </Section>

          {/* Section 3 */}
          <Section title="3. Đăng ký tài khoản">
            <Paragraph>Để sử dụng dịch vụ, bạn cần:</Paragraph>
            <ListItem>Cung cấp thông tin chính xác và đầy đủ</ListItem>
            <ListItem>Từ đủ 18 tuổi trở lên</ListItem>
            <ListItem>Có số điện thoại và email hợp lệ</ListItem>
            <ListItem>Bảo mật thông tin đăng nhập của bạn</ListItem>
            <ListItem>Chịu trách nhiệm về mọi hoạt động dưới tài khoản của bạn</ListItem>
          </Section>

          {/* Section 4 */}
          <Section title="4. Quy định sử dụng">
            <Paragraph>Người dùng cam kết:</Paragraph>
            <ListItem>Không sử dụng dịch vụ cho mục đích bất hợp pháp</ListItem>
            <ListItem>Tôn trọng tài xế và người dùng khác</ListItem>
            <ListItem>Cung cấp thông tin chính xác về địa điểm đón/trả</ListItem>
            <ListItem>Thanh toán đầy đủ chi phí dịch vụ</ListItem>
            <ListItem>Không gây rối, quấy rối hoặc đe dọa tài xế</ListItem>
            <ListItem>Tuân thủ quy định an toàn giao thông</ListItem>
          </Section>

          {/* Section 5 */}
          <Section title="5. Giá cả và thanh toán">
            <Paragraph>
              Giá cước được tính dựa trên khoảng cách, thời gian và loại dịch vụ. Các yếu tố ảnh hưởng:
            </Paragraph>
            <ListItem>Phí cơ bản theo km</ListItem>
            <ListItem>Phụ phí giờ cao điểm (nếu có)</ListItem>
            <ListItem>Phụ phí thời tiết xấu (nếu có)</ListItem>
            <ListItem>Phí chờ (nếu có)</ListItem>
            <Paragraph>
              Thanh toán được thực hiện qua tiền mặt, ví điện tử hoặc thẻ ngân hàng. Bạn đồng ý thanh 
              toán đầy đủ các khoản phí phát sinh.
            </Paragraph>
          </Section>

          {/* Section 6 */}
          <Section title="6. Hủy chuyến">
            <Paragraph>
              Người dùng có thể hủy chuyến trước khi tài xế đến điểm đón. Tuy nhiên, có thể áp dụng 
              phí hủy nếu:
            </Paragraph>
            <ListItem>Hủy sau khi tài xế đã chấp nhận và đang di chuyển đến</ListItem>
            <ListItem>Hủy quá nhiều lần trong thời gian ngắn</ListItem>
            <ListItem>Tài xế đã đến điểm đón nhưng không liên lạc được với bạn</ListItem>
          </Section>

          {/* Section 7 */}
          <Section title="7. An toàn và bảo hiểm">
            <Paragraph>
              FireGo cam kết đảm bảo an toàn cho người dùng:
            </Paragraph>
            <ListItem>Xác minh và kiểm tra lý lịch tài xế</ListItem>
            <ListItem>Tài xế có giấy phép lái xe hợp lệ</ListItem>
            <ListItem>Xe có bảo hiểm trách nhiệm dân sự bắt buộc</ListItem>
            <ListItem>Hệ thống theo dõi hành trình real-time</ListItem>
            <ListItem>Nút SOS khẩn cấp trong ứng dụng</ListItem>
          </Section>

          {/* Section 8 */}
          <Section title="8. Quyền riêng tư">
            <Paragraph>
              Chúng tôi thu thập và sử dụng dữ liệu cá nhân theo Chính sách bảo mật. Thông tin được 
              sử dụng để:
            </Paragraph>
            <ListItem>Cung cấp và cải thiện dịch vụ</ListItem>
            <ListItem>Kết nối bạn với tài xế</ListItem>
            <ListItem>Xử lý thanh toán</ListItem>
            <ListItem>Hỗ trợ khách hàng</ListItem>
            <ListItem>Tuân thủ quy định pháp luật</ListItem>
          </Section>

          {/* Section 9 */}
          <Section title="9. Giới hạn trách nhiệm">
            <Paragraph>
              FireGo không chịu trách nhiệm cho:
            </Paragraph>
            <ListItem>Hành vi của tài xế độc lập</ListItem>
            <ListItem>Mất mát hoặc hư hỏng tài sản cá nhân</ListItem>
            <ListItem>Tai nạn hoặc thương tích xảy ra trong chuyến đi</ListItem>
            <ListItem>Lỗi kỹ thuật hoặc gián đoạn dịch vụ</ListItem>
            <ListItem>Tranh chấp giữa người dùng và tài xế</ListItem>
          </Section>

          {/* Section 10 */}
          <Section title="10. Thay đổi điều khoản">
            <Paragraph>
              Chúng tôi có quyền thay đổi các điều khoản này bất kỳ lúc nào. Những thay đổi sẽ có hiệu 
              lực ngay khi được đăng tải trên ứng dụng. Việc bạn tiếp tục sử dụng dịch vụ sau khi thay 
              đổi có nghĩa là bạn chấp nhận các điều khoản mới.
            </Paragraph>
          </Section>

          {/* Section 11 */}
          <Section title="11. Chấm dứt dịch vụ">
            <Paragraph>
              Chúng tôi có quyền tạm ngưng hoặc chấm dứt tài khoản của bạn nếu:
            </Paragraph>
            <ListItem>Vi phạm các điều khoản sử dụng</ListItem>
            <ListItem>Có hành vi gian lận hoặc lừa đảo</ListItem>
            <ListItem>Cung cấp thông tin sai lệch</ListItem>
            <ListItem>Có hành vi gây rối, xúc phạm tài xế</ListItem>
            <ListItem>Không thanh toán các khoản phí</ListItem>
          </Section>

          {/* Section 12 */}
          <Section title="12. Luật áp dụng">
            <Paragraph>
              Các điều khoản này được điều chỉnh bởi luật pháp Việt Nam. Mọi tranh chấp sẽ được giải 
              quyết tại tòa án có thẩm quyền tại Việt Nam.
            </Paragraph>
          </Section>

          {/* Section 13 */}
          <Section title="13. Liên hệ">
            <Paragraph>
              Nếu bạn có bất kỳ câu hỏi nào về các điều khoản này, vui lòng liên hệ với chúng tôi:
            </Paragraph>
            <View style={styles.contactBox}>
              <View style={styles.contactItem}>
                <MaterialIcons name="email" size={20} color="#FF6B00" />
                <Text style={[styles.contactText, { color: colors.text }]}>support@firego.vn</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="phone" size={20} color="#FF6B00" />
                <Text style={[styles.contactText, { color: colors.text }]}>1900 xxxx</Text>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="location-on" size={20} color="#FF6B00" />
                <Text style={[styles.contactText, { color: colors.text }]}>
                  Hà Nội, Việt Nam
                </Text>
              </View>
            </View>
          </Section>

          {/* Footer */}
          <View style={styles.footer}>
            <MaterialIcons name="verified-user" size={32} color="#10b981" />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              Bằng việc sử dụng FireGo, bạn đồng ý với các điều khoản trên
            </Text>
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
    paddingTop: SPACING.lg,
  },
  introBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  introTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  introDate: {
    fontSize: 13,
    fontWeight: '600',
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
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: SPACING.md,
    fontWeight: '500',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
    paddingLeft: SPACING.md,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 9,
    marginRight: SPACING.md,
  },
  listText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '500',
  },
  contactBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
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
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    marginTop: SPACING.lg,
  },
  footerText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: SPACING.md,
    fontWeight: '600',
    lineHeight: 20,
    paddingHorizontal: SPACING.lg,
  },
})
