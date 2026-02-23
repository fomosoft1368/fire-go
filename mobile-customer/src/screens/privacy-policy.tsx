import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { SPACING, COLORS_DARK, COLORS_LIGHT } from '../constants'

export default function PrivacyPolicyScreen() {
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

  const InfoBox = ({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) => (
    <View style={[styles.infoBox, { backgroundColor: themeMode === 'dark' ? '#1e293b' : '#f8fafc', borderColor: themeMode === 'dark' ? '#334155' : '#e2e8f0' }]}>
      <View style={styles.infoHeader}>
        <MaterialIcons name={icon as any} size={24} color="#FF6B00" />
        <Text style={[styles.infoTitle, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  )

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: '#10b981', borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chính sách bảo mật</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Introduction */}
          <View style={styles.introBox}>
            <MaterialIcons name="privacy-tip" size={48} color="#10b981" />
            <Text style={[styles.introTitle, { color: colors.text }]}>
              Chính sách bảo mật FireGo
            </Text>
            <Text style={[styles.introDate, { color: colors.textSecondary }]}>
              Cập nhật lần cuối: 10 tháng 2, 2026
            </Text>
          </View>

          <Paragraph>
            FireGo cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của bạn. Chính sách này giải thích 
            cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin của bạn khi sử dụng dịch vụ.
          </Paragraph>

          {/* Section 1 */}
          <Section title="1. Thông tin chúng tôi thu thập">
            <Paragraph>
              Chúng tôi thu thập các loại thông tin sau để cung cấp và cải thiện dịch vụ:
            </Paragraph>

            <InfoBox icon="person" title="Thông tin cá nhân">
              <ListItem>Họ tên, email, số điện thoại</ListItem>
              <ListItem>Ảnh đại diện (tùy chọn)</ListItem>
              <ListItem>Ngày sinh (nếu cung cấp)</ListItem>
              <ListItem>Thông tin xác thực danh tính</ListItem>
            </InfoBox>

            <InfoBox icon="location-on" title="Thông tin vị trí">
              <ListItem>Vị trí GPS khi sử dụng dịch vụ</ListItem>
              <ListItem>Địa chỉ đón và trả khách</ListItem>
              <ListItem>Lịch sử di chuyển trong chuyến đi</ListItem>
              <ListItem>Địa điểm yêu thích đã lưu</ListItem>
            </InfoBox>

            <InfoBox icon="payment" title="Thông tin thanh toán">
              <ListItem>Phương thức thanh toán đã liên kết</ListItem>
              <ListItem>Lịch sử giao dịch</ListItem>
              <ListItem>Thông tin thẻ (được mã hóa)</ListItem>
              <ListItem>Hóa đơn và biên lai</ListItem>
            </InfoBox>

            <InfoBox icon="phone-android" title="Thông tin thiết bị">
              <ListItem>Loại thiết bị và hệ điều hành</ListItem>
              <ListItem>ID thiết bị duy nhất</ListItem>
              <ListItem>Địa chỉ IP</ListItem>
              <ListItem>Thông tin mạng và kết nối</ListItem>
            </InfoBox>

            <InfoBox icon="directions-car" title="Thông tin chuyến đi">
              <ListItem>Chi tiết lộ trình và thời gian</ListItem>
              <ListItem>Loại dịch vụ đã sử dụng</ListItem>
              <ListItem>Thông tin tài xế</ListItem>
              <ListItem>Đánh giá và nhận xét</ListItem>
            </InfoBox>
          </Section>

          {/* Section 2 */}
          <Section title="2. Cách chúng tôi sử dụng thông tin">
            <Paragraph>
              Thông tin của bạn được sử dụng cho các mục đích sau:
            </Paragraph>
            <ListItem>Cung cấp và duy trì dịch vụ</ListItem>
            <ListItem>Kết nối bạn với tài xế phù hợp</ListItem>
            <ListItem>Xử lý thanh toán và hoàn tiền</ListItem>
            <ListItem>Cung cấp hỗ trợ khách hàng</ListItem>
            <ListItem>Cải thiện chất lượng dịch vụ</ListItem>
            <ListItem>Gửi thông báo về chuyến đi và khuyến mãi</ListItem>
            <ListItem>Phát hiện và ngăn chặn gian lận</ListItem>
            <ListItem>Tuân thủ nghĩa vụ pháp lý</ListItem>
            <ListItem>Phân tích và nghiên cứu thị trường</ListItem>
          </Section>

          {/* Section 3 */}
          <Section title="3. Chia sẻ thông tin">
            <Paragraph>
              Chúng tôi có thể chia sẻ thông tin của bạn với:
            </Paragraph>

            <InfoBox icon="people" title="Tài xế">
              <Paragraph>
                Khi bạn đặt chuyến, tài xế sẽ nhận được tên, số điện thoại, ảnh đại diện và vị trí 
                đón/trả của bạn để thực hiện dịch vụ.
              </Paragraph>
            </InfoBox>

            <InfoBox icon="business" title="Đối tác dịch vụ">
              <Paragraph>
                Chúng tôi làm việc với các đối tác xử lý thanh toán, lưu trữ dữ liệu, gửi tin nhắn 
                và cung cấp dịch vụ khác. Họ chỉ được truy cập thông tin cần thiết và phải bảo mật.
              </Paragraph>
            </InfoBox>

            <InfoBox icon="gavel" title="Cơ quan pháp luật">
              <Paragraph>
                Khi pháp luật yêu cầu hoặc để bảo vệ quyền lợi hợp pháp, chúng tôi có thể cung cấp 
                thông tin cho cơ quan có thẩm quyền.
              </Paragraph>
            </InfoBox>

            <InfoBox icon="merge-type" title="Sáp nhập hoặc mua bán">
              <Paragraph>
                Trong trường hợp sáp nhập, mua lại, thông tin có thể được chuyển giao cho đơn vị 
                kế thừa với các cam kết bảo mật tương tự.
              </Paragraph>
            </InfoBox>
          </Section>

          {/* Section 4 */}
          <Section title="4. Bảo mật thông tin">
            <Paragraph>
              Chúng tôi áp dụng các biện pháp bảo mật để bảo vệ dữ liệu của bạn:
            </Paragraph>
            <ListItem>Mã hóa dữ liệu khi truyền tải (SSL/TLS)</ListItem>
            <ListItem>Mã hóa dữ liệu nhạy cảm khi lưu trữ</ListItem>
            <ListItem>Kiểm soát truy cập nghiêm ngặt</ListItem>
            <ListItem>Giám sát và phát hiện xâm nhập</ListItem>
            <ListItem>Sao lưu và phục hồi dữ liệu định kỳ</ListItem>
            <ListItem>Đào tạo nhân viên về bảo mật</ListItem>
            <ListItem>Kiểm tra bảo mật thường xuyên</ListItem>
          </Section>

          {/* Section 5 */}
          <Section title="5. Lưu trữ thông tin">
            <Paragraph>
              Chúng tôi lưu trữ thông tin của bạn:
            </Paragraph>
            <ListItem>Trong thời gian bạn sử dụng dịch vụ</ListItem>
            <ListItem>Theo yêu cầu của pháp luật (thường là 3-5 năm)</ListItem>
            <ListItem>Cho đến khi bạn yêu cầu xóa tài khoản</ListItem>
            <Paragraph>
              Dữ liệu được lưu trữ trên máy chủ an toàn tại Việt Nam và có thể sao lưu ở nước ngoài 
              với các tiêu chuẩn bảo mật tương đương.
            </Paragraph>
          </Section>

          {/* Section 6 */}
          <Section title="6. Quyền của bạn">
            <Paragraph>
              Bạn có các quyền sau đối với dữ liệu cá nhân:
            </Paragraph>

            <InfoBox icon="visibility" title="Quyền truy cập">
              <Paragraph>
                Xem thông tin cá nhân mà chúng tôi đang lưu giữ về bạn.
              </Paragraph>
            </InfoBox>

            <InfoBox icon="edit" title="Quyền chỉnh sửa">
              <Paragraph>
                Cập nhật hoặc sửa đổi thông tin cá nhân không chính xác.
              </Paragraph>
            </InfoBox>

            <InfoBox icon="delete" title="Quyền xóa">
              <Paragraph>
                Yêu cầu xóa tài khoản và dữ liệu cá nhân (trừ khi pháp luật yêu cầu lưu giữ).
              </Paragraph>
            </InfoBox>

            <InfoBox icon="block" title="Quyền từ chối">
              <Paragraph>
                Từ chối xử lý dữ liệu cho mục đích marketing hoặc quảng cáo.
              </Paragraph>
            </InfoBox>

            <InfoBox icon="file-download" title="Quyền xuất dữ liệu">
              <Paragraph>
                Yêu cầu xuất dữ liệu cá nhân dưới dạng file có cấu trúc.
              </Paragraph>
            </InfoBox>

            <Paragraph>
              Để thực hiện các quyền này, vui lòng liên hệ với chúng tôi qua email support@firego.vn
            </Paragraph>
          </Section>

          {/* Section 7 */}
          <Section title="7. Cookies và công nghệ theo dõi">
            <Paragraph>
              Chúng tôi sử dụng cookies và công nghệ tương tự để:
            </Paragraph>
            <ListItem>Ghi nhớ thông tin đăng nhập</ListItem>
            <ListItem>Cá nhân hóa trải nghiệm</ListItem>
            <ListItem>Phân tích cách sử dụng ứng dụng</ListItem>
            <ListItem>Cung cấp quảng cáo phù hợp</ListItem>
            <Paragraph>
              Bạn có thể quản lý cookies trong cài đặt trình duyệt hoặc ứng dụng.
            </Paragraph>
          </Section>

          {/* Section 8 */}
          <Section title="8. Quyền riêng tư của trẻ em">
            <Paragraph>
              Dịch vụ của chúng tôi dành cho người từ 18 tuổi trở lên. Chúng tôi không cố ý thu thập 
              thông tin từ trẻ em dưới 18 tuổi. Nếu phát hiện, chúng tôi sẽ xóa ngay lập tức.
            </Paragraph>
          </Section>

          {/* Section 9 */}
          <Section title="9. Chuyển dữ liệu quốc tế">
            <Paragraph>
              Dữ liệu của bạn có thể được chuyển và xử lý ở các quốc gia khác Việt Nam. Chúng tôi 
              đảm bảo các quốc gia này có mức độ bảo vệ dữ liệu tương đương hoặc áp dụng các biện 
              pháp bảo vệ phù hợp.
            </Paragraph>
          </Section>

          {/* Section 10 */}
          <Section title="10. Thay đổi chính sách">
            <Paragraph>
              Chúng tôi có thể cập nhật chính sách này theo thời gian. Những thay đổi quan trọng sẽ 
              được thông báo qua ứng dụng hoặc email. Việc bạn tiếp tục sử dụng dịch vụ sau khi thay 
              đổi có nghĩa là bạn chấp nhận chính sách mới.
            </Paragraph>
          </Section>

          {/* Section 11 */}
          <Section title="11. Liên hệ">
            <Paragraph>
              Nếu bạn có câu hỏi về chính sách bảo mật hoặc muốn thực hiện quyền của mình:
            </Paragraph>
            <View style={styles.contactBox}>
              <View style={styles.contactItem}>
                <MaterialIcons name="email" size={20} color="#10b981" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Email</Text>
                  <Text style={[styles.contactText, { color: colors.text }]}>privacy@firego.vn</Text>
                </View>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="support-agent" size={20} color="#10b981" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Hotline</Text>
                  <Text style={[styles.contactText, { color: colors.text }]}>1900 xxxx</Text>
                </View>
              </View>
              <View style={styles.contactItem}>
                <MaterialIcons name="location-on" size={20} color="#10b981" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactLabel, { color: colors.textSecondary }]}>Địa chỉ</Text>
                  <Text style={[styles.contactText, { color: colors.text }]}>
                    Hà Nội, Việt Nam
                  </Text>
                </View>
              </View>
            </View>
          </Section>

          {/* Footer */}
          <View style={styles.footer}>
            <MaterialIcons name="security" size={32} color="#10b981" />
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>
              FireGo cam kết bảo vệ quyền riêng tư và dữ liệu cá nhân của bạn
            </Text>
            <View style={styles.certBadges}>
              <View style={[styles.certBadge, { backgroundColor: themeMode === 'dark' ? '#1e293b' : '#f0fdf4', borderColor: '#10b981' }]}>
                <MaterialIcons name="verified" size={16} color="#10b981" />
                <Text style={[styles.certText, { color: colors.text }]}>ISO 27001</Text>
              </View>
              <View style={[styles.certBadge, { backgroundColor: themeMode === 'dark' ? '#1e293b' : '#f0fdf4', borderColor: '#10b981' }]}>
                <MaterialIcons name="shield" size={16} color="#10b981" />
                <Text style={[styles.certText, { color: colors.text }]}>SSL Secure</Text>
              </View>
            </View>
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
  infoBox: {
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    letterSpacing: -0.2,
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
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  contactLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactText: {
    fontSize: 15,
    fontWeight: '700',
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
  certBadges: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  certBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
    borderWidth: 1,
  },
  certText: {
    fontSize: 12,
    fontWeight: '700',
  },
})
