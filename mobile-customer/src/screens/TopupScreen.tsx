import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Clipboard,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { walletService } from '../services/walletService'

const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000]

interface PaymentMethod {
  id: string
  name: string
  icon: string
  description: string
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'bank',
    name: 'Chuyển khoản ngân hàng',
    icon: 'account-balance-wallet',
    description: 'Quét mã QR hoặc chuyển khoản',
  },
]

export default function TopupScreen({ navigation }: any) {
  const [customAmount, setCustomAmount] = useState('')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('bank')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSepayModal, setShowSepayModal] = useState(false)
  const [topupDiscount, setTopupDiscount] = useState<number>(0)
  const [isCheckingPayment, setIsCheckingPayment] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'completed'>('pending')
  const [sepayData, setSepayData] = useState<{
    qrCodeUrl: string;
    accountNo: string;
    accountName: string;
    bankName: string;
    amount: number;
    content: string;
    transactionId: string;
  } | null>(null)

  React.useEffect(() => {
    loadTopupDiscount()
  }, [])

  // ⭐ Auto-check payment status when Sepay modal is open
  React.useEffect(() => {
    if (!showSepayModal || !sepayData?.transactionId) {
      return
    }

    console.log('[TopupScreen] Starting auto-check for transaction:', sepayData.transactionId)
    setIsCheckingPayment(true)
    setPaymentStatus('checking')

    // Poll every 3 seconds
    const intervalId = setInterval(async () => {
      try {
        console.log('[TopupScreen] Checking transaction status...')
        const status = await walletService.checkTransactionStatus(sepayData.transactionId)
        console.log('[TopupScreen] Transaction status:', status)

        // Accept both 'completed' and 'success' status
        if (status === 'completed' || status === 'success') {
          console.log('[TopupScreen] ✅ Payment completed!')
          setPaymentStatus('completed')
          setIsCheckingPayment(false)
          
          // Clear interval first
          clearInterval(intervalId)
          
          // Show success message
          Alert.alert(
            'Nạp tiền thành công',
            `Số dư đã được cập nhật. Bạn đã nạp ${sepayData.amount.toLocaleString('vi-VN')}đ`,
            [
              {
                text: 'OK',
                onPress: () => {
                  setShowSepayModal(false)
                  navigation?.goBack()
                }
              }
            ]
          )
        }
      } catch (error) {
        console.error('[TopupScreen] Error checking payment:', error)
      }
    }, 3000) // Check every 3 seconds

    // Cleanup
    return () => {
      console.log('[TopupScreen] Stopping auto-check')
      clearInterval(intervalId)
      setIsCheckingPayment(false)
    }
  }, [showSepayModal, sepayData?.transactionId])

  const loadTopupDiscount = async () => {
    try {
      console.log('[TopupScreen] Loading topup discount...')
      const discount = await walletService.getTopupDiscount()
      console.log('[TopupScreen] Topup discount loaded:', discount)
      setTopupDiscount(discount)
    } catch (error: any) {
      console.error('[TopupScreen] ❌ Error loading topup discount:')
      console.error('[TopupScreen] Error message:', error?.message)
      console.error('[TopupScreen] Full error:', error)
      // Set discount to 0 if failed
      setTopupDiscount(0)
    }
  }

  const amount = selectedAmount || (customAmount ? parseInt(customAmount) : 0)

  const handleAmountSelect = (value: number) => {
    setSelectedAmount(value)
    setCustomAmount('')
  }

  const handleCustomAmountChange = (text: string) => {
    setCustomAmount(text)
    setSelectedAmount(null)
  }

  const handleProcessPayment = async () => {
    if (amount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ')
      return
    }

    if (amount < 50000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối thiểu là 50.000đ')
      return
    }

    if (amount > 100000000) {
      Alert.alert('Lỗi', 'Số tiền nạp tối đa là 100.000.000đ')
      return
    }

    setShowPaymentModal(true)
  }

  const handleConfirmPayment = async () => {
    setIsProcessing(true)
    try {
      console.log('[TopupScreen] Processing payment:', {
        amount,
        paymentMethod: selectedPaymentMethod,
      })

      // Sepay bank transfer QR code
      const result = await walletService.createSepayPayment(amount)
      console.log('[TopupScreen] Sepay payment created:', result)
      
      setSepayData({
        qrCodeUrl: result.qrCodeUrl,
        accountNo: result.accountNo,
        accountName: result.accountName,
        bankName: result.bankName,
        amount: result.amount,
        content: result.content,
        transactionId: result.transactionId,
      })
      
      setShowPaymentModal(false)
      setShowSepayModal(true)
    } catch (error: any) {
      console.error('[TopupScreen] Payment error:', error)
      Alert.alert('Lỗi', error.message || 'Lỗi trong quá trình thanh toán')
    } finally {
      setIsProcessing(false)
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    Clipboard.setString(text)
    Alert.alert('Thành công', `Đã sao chép ${label}`)
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Nạp tiền</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Amount Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chọn số tiền nạp</Text>

          {/* Custom Amount Input */}
          <View style={styles.customAmountContainer}>
            <View style={styles.currencyPrefix}>
              <Text style={styles.currencyText}>đ</Text>
            </View>
            <TextInput
              style={styles.customAmountInput}
              placeholder="Nhập số tiền"
              placeholderTextColor={COLORS.textSecondary}
              value={customAmount}
              onChangeText={handleCustomAmountChange}
              keyboardType="number-pad"
            />
          </View>

          {/* Preset Amounts */}
          <View style={styles.presetsContainer}>
            {PRESET_AMOUNTS.map((value) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.presetButton,
                  selectedAmount === value && styles.presetButtonActive,
                ]}
                onPress={() => handleAmountSelect(value)}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedAmount === value && styles.presetTextActive,
                  ]}
                >
                  {(value / 1000000).toFixed(1)}tr
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Selected Amount Display */}
          {amount > 0 && (
            <View style={styles.selectedAmountCard}>
              <Text style={styles.selectedAmountLabel}>Số tiền nạp</Text>
              <Text style={styles.selectedAmount}>
                {amount.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          )}

          {/* Discount Info */}
          {amount > 0 && topupDiscount > 0 && (
            <View style={styles.discountInfo}>
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>Số tiền nạp:</Text>
                <Text style={styles.discountValue}>{amount.toLocaleString('vi-VN')}đ</Text>
              </View>
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>Chiết khấu ({topupDiscount}%):</Text>
                <Text style={[styles.discountValue, styles.discountAmount]}>-{Math.round((amount * topupDiscount) / 100).toLocaleString('vi-VN')}đ</Text>
              </View>
              <View style={styles.discountRow}>
                <Text style={styles.discountLabelBold}>Bạn nhận:</Text>
                <Text style={styles.discountValueBold}>{Math.round((amount * (100 - topupDiscount)) / 100).toLocaleString('vi-VN')}đ</Text>
              </View>
            </View>
          )}
        </View>

        {/* Payment Method Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>

          <View style={styles.paymentMethodsContainer}>
            {PAYMENT_METHODS.map((method) => (
              <TouchableOpacity
                key={method.id}
                style={[
                  styles.paymentMethodCard,
                  selectedPaymentMethod === method.id &&
                    styles.paymentMethodCardActive,
                ]}
                onPress={() => setSelectedPaymentMethod(method.id)}
              >
                <View style={styles.paymentMethodLeft}>
                  <View
                    style={[
                      styles.paymentMethodIcon,
                      selectedPaymentMethod === method.id &&
                        styles.paymentMethodIconActive,
                    ]}
                  >
                    <MaterialIcons
                      name={method.icon as any}
                      size={24}
                      color={
                        selectedPaymentMethod === method.id
                          ? COLORS.primary
                          : COLORS.textSecondary
                      }
                    />
                  </View>
                  <View>
                    <Text style={styles.paymentMethodName}>{method.name}</Text>
                    <Text style={styles.paymentMethodDescription}>
                      {method.description}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.radioButton,
                    selectedPaymentMethod === method.id &&
                      styles.radioButtonActive,
                  ]}
                >
                  {selectedPaymentMethod === method.id && (
                    <MaterialIcons name="check" size={16} color={COLORS.primary} />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <MaterialIcons name="info" size={18} color={COLORS.primary} />
          <Text style={styles.infoText}>
            Tiền nạp sẽ được cập nhật vào tài khoản trong vòng 1-2 phút
          </Text>
        </View>

        {/* Fee Info */}
        <View style={styles.feeSection}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Phí nạp tiền</Text>
            <Text style={styles.feeValue}>0đ</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Phí dịch vụ</Text>
            <Text style={styles.feeValue}>0đ</Text>
          </View>
          <View style={styles.feeDivider} />
          <View style={styles.feeRow}>
            <Text style={styles.feeTotalLabel}>Tổng thanh toán</Text>
            <Text style={styles.feeTotalValue}>
              {amount.toLocaleString('vi-VN')}đ
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Footer Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.payButton, amount <= 0 && styles.payButtonDisabled]}
          onPress={handleProcessPayment}
          disabled={amount <= 0}
        >
          <Text style={styles.payButtonText}>
            Tiếp tục với {amount.toLocaleString('vi-VN')}đ
          </Text>
        </TouchableOpacity>
      </View>

      {/* Confirmation Modal */}
      <Modal
        visible={showPaymentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardAvoidingView}
          >
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Xác nhận nạp tiền</Text>
                <TouchableOpacity onPress={() => setShowPaymentModal(false)}>
                  <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              <View style={styles.confirmationContent}>
                <View style={styles.confirmIcon}>
                  <MaterialIcons
                    name="account-balance-wallet"
                    size={40}
                    color={COLORS.primary}
                  />
                </View>

                <Text style={styles.confirmLabel}>Số tiền nạp</Text>
                <Text style={styles.confirmAmount}>
                  {amount.toLocaleString('vi-VN')}đ
                </Text>

                <View style={styles.confirmDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phương thức</Text>
                    <Text style={styles.detailValue}>
                      {PAYMENT_METHODS.find((m) => m.id === selectedPaymentMethod)?.name}
                    </Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Phí</Text>
                    <Text style={styles.detailValue}>0đ</Text>
                  </View>
                </View>

                <View style={styles.confirmButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowPaymentModal(false)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.cancelButtonText}>Hủy</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.confirmButton}
                    onPress={handleConfirmPayment}
                    disabled={isProcessing}
                  >
                    {isProcessing ? (
                      <ActivityIndicator size="small" color={COLORS.text} />
                    ) : (
                      <Text style={styles.confirmButtonText}>Xác nhận</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Sepay QR Code Modal */}
      <Modal
        visible={showSepayModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSepayModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sepayModalContent}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Chuyển khoản ngân hàng</Text>
              <TouchableOpacity onPress={() => {
                setShowSepayModal(false)
                navigation?.goBack()
              }}>
                <MaterialIcons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Payment Status Indicator */}
              {isCheckingPayment && (
                <View style={styles.paymentStatusCard}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                  <Text style={styles.paymentStatusText}>
                    Đang chờ xác nhận thanh toán...
                  </Text>
                </View>
              )}

              {/* QR Code */}
              {sepayData && (
                <>
                  <View style={styles.qrContainer}>
                    <Image
                      source={{ uri: sepayData.qrCodeUrl }}
                      style={styles.qrCode}
                      resizeMode="contain"
                    />
                    <Text style={styles.qrHint}>Quét mã QR để chuyển khoản</Text>
                  </View>

                  {/* Bank Info */}
                  <View style={styles.bankInfoSection}>
                    <Text style={styles.bankInfoTitle}>Hoặc chuyển khoản thủ công</Text>

                    {/* Bank Name */}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Ngân hàng</Text>
                      <View style={styles.infoValueContainer}>
                        <Text style={styles.infoValue}>{sepayData.bankName}</Text>
                      </View>
                    </View>

                    {/* Account Number */}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Số tài khoản</Text>
                      <View style={styles.infoValueContainer}>
                        <Text style={styles.infoValue}>{sepayData.accountNo}</Text>
                        <TouchableOpacity
                          onPress={() => copyToClipboard(sepayData.accountNo, 'số tài khoản')}
                        >
                          <MaterialIcons name="content-copy" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Account Name */}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Chủ tài khoản</Text>
                      <View style={styles.infoValueContainer}>
                        <Text style={styles.infoValue}>{sepayData.accountName}</Text>
                      </View>
                    </View>

                    {/* Amount */}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Số tiền</Text>
                      <View style={styles.infoValueContainer}>
                        <Text style={[styles.infoValue, styles.amountHighlight]}>
                          {sepayData.amount.toLocaleString('vi-VN')}đ
                        </Text>
                        <TouchableOpacity
                          onPress={() => copyToClipboard(sepayData.amount.toString(), 'số tiền')}
                        >
                          <MaterialIcons name="content-copy" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Transfer Content */}
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Nội dung</Text>
                      <View style={styles.infoValueContainer}>
                        <Text style={[styles.infoValue, styles.contentHighlight]}>
                          {sepayData.content}
                        </Text>
                        <TouchableOpacity
                          onPress={() => copyToClipboard(sepayData.content, 'nội dung chuyển khoản')}
                        >
                          <MaterialIcons name="content-copy" size={18} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {/* Warning Box */}
                  <View style={styles.warningBox}>
                    <MaterialIcons name="warning" size={20} color="#FFA726" />
                    <Text style={styles.warningText}>
                      Vui lòng nhập chính xác nội dung chuyển khoản để hệ thống tự động cập nhật số dư
                    </Text>
                  </View>

                  {/* Instructions */}
                  <View style={styles.instructionsBox}>
                    <Text style={styles.instructionsTitle}>Hướng dẫn:</Text>
                    <Text style={styles.instructionItem}>1. Quét mã QR hoặc nhập thông tin thủ công</Text>
                    <Text style={styles.instructionItem}>2. Kiểm tra kỹ nội dung chuyển khoản</Text>
                    <Text style={styles.instructionItem}>3. Hoàn tất giao dịch trên app ngân hàng</Text>
                    <Text style={styles.instructionItem}>4. Số dư sẽ được cập nhật trong 1-2 phút</Text>
                  </View>

                  {/* Done Button */}
                  <TouchableOpacity
                    style={styles.doneButton}
                    onPress={() => {
                      setShowSepayModal(false)
                      navigation?.goBack()
                    }}
                  >
                    <Text style={styles.doneButtonText}>Đã chuyển khoản</Text>
                  </TouchableOpacity>

                  <View style={{ height: 40 }} />
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ...existing code...

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff', // Changed from dark
  },
  container: {
    flex: 1,
    backgroundColor: '#fff', // Changed from dark
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.xl,
    paddingTop: 40,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0', // Light border
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a', // Dark text
    marginBottom: SPACING.lg,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa', // Light card
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Light border
    marginBottom: SPACING.lg,
    paddingLeft: SPACING.md,
  },
  currencyPrefix: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyText: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary, // Keep orange
  },
  customAmountInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    fontSize: 16,
    color: '#1a1a1a', // Dark text
  },
  presetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  presetButton: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: SPACING.md,
    backgroundColor: '#f8f9fa', // Light card
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#e0e0e0', // Light border
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: '#FFF5F0', // Light orange background
    borderColor: COLORS.primary, // Orange border
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666', // Gray text
  },
  presetTextActive: {
    color: COLORS.primary, // Orange text
  },
  selectedAmountCard: {
    backgroundColor: '#FFF5F0', // Light orange
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FFE5DB', // Light orange border
  },
  selectedAmountLabel: {
    fontSize: 12,
    color: '#666', // Gray text
    marginBottom: SPACING.sm,
  },
  selectedAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary, // Orange
  },
  discountInfo: {
    backgroundColor: '#f8f9fa', // Light card
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginTop: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  discountLabel: {
    fontSize: 13,
    color: '#666', // Gray text
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 13,
    color: '#1a1a1a', // Dark text
    fontWeight: '600',
  },
  discountAmount: {
    color: '#ef4444', // Red (keep for negative)
  },
  discountLabelBold: {
    fontSize: 14,
    color: '#1a1a1a', // Dark text
    fontWeight: '700',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  discountValueBold: {
    fontSize: 16,
    color: COLORS.primary, // Orange
    fontWeight: '800',
    marginTop: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  paymentMethodsContainer: {
    gap: SPACING.md,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa', // Light card
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  paymentMethodCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#FFF5F0', // Light orange
  },
  paymentMethodLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff', // White background
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodIconActive: {
    backgroundColor: COLORS.primary + '15', // Light orange
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a', // Dark text
    marginBottom: SPACING.xs,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: '#666', // Gray text
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  radioButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F0', // Light orange
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderLeftWidth: 4,
    borderColor: '#FFE5DB',
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#FF6B35', // Orange text
    lineHeight: 18,
  },
  feeSection: {
    backgroundColor: '#f8f9fa', // Light card
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  feeLabel: {
    fontSize: 13,
    color: '#666', // Gray text
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a', // Dark text
  },
  feeDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: SPACING.md,
  },
  feeTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
  },
  feeTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary, // Orange
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: '#fff', // White
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  payButton: {
    backgroundColor: COLORS.primary, // Orange
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Lighter overlay
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', // White
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
  },
  confirmationContent: {
    alignItems: 'center',
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '15', // Light orange
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  confirmLabel: {
    fontSize: 13,
    color: '#666', // Gray text
    marginBottom: SPACING.xs,
  },
  confirmAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary, // Orange
    marginBottom: SPACING.lg,
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: '#f8f9fa', // Light card
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666', // Gray text
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a', // Dark text
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    backgroundColor: '#f8f9fa', // Light card
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a', // Dark text
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary, // Orange
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  
  // Sepay Modal Styles
  sepayModalContent: {
    backgroundColor: '#fff', // White
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: '95%',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    backgroundColor: '#f8f9fa', // Light card
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  qrCode: {
    width: 280,
    height: 280,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: '#fff',
    padding: SPACING.md,
  },
  qrHint: {
    fontSize: 13,
    color: '#666', // Gray text
    marginTop: SPACING.md,
  },
  bankInfoSection: {
    backgroundColor: '#f8f9fa', // Light card
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bankInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
    marginBottom: SPACING.md,
  },
  infoRow: {
    marginBottom: SPACING.md,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666', // Gray text
    marginBottom: SPACING.xs,
  },
  infoValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff', // White
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a', // Dark text
    flex: 1,
  },
  amountHighlight: {
    color: COLORS.primary, // Orange
    fontSize: 16,
  },
  contentHighlight: {
    color: COLORS.primary, // Orange
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF5F0', // Light orange
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FFE5DB',
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#FF6B35', // Orange text
    lineHeight: 18,
  },
  instructionsBox: {
    backgroundColor: '#f8f9fa', // Light card
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a', // Dark text
    marginBottom: SPACING.sm,
  },
  instructionItem: {
    fontSize: 13,
    color: '#666', // Gray text
    marginBottom: SPACING.xs,
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: COLORS.primary, // Orange
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  doneButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  paymentStatusCard: {
    backgroundColor: '#FFF5F0', // Light orange
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: '#FFE5DB',
  },
  paymentStatusText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary, // Orange
    flex: 1,
  },
})
