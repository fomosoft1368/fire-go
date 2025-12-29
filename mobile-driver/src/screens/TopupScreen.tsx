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
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { paymentService } from '../services/paymentService'

const PRESET_AMOUNTS = [100000, 200000, 500000, 1000000, 2000000, 5000000]

interface PaymentMethod {
  id: string
  name: string
  icon: string
  description: string
}

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'vnpay',
    name: 'VNPay',
    icon: 'credit-card',
    description: 'Thẻ tín dụng / Thẻ ghi nợ',
  },
  {
    id: 'wallet',
    name: 'Ví điện tử',
    icon: 'account-balance-wallet',
    description: 'Ví điện tử phổ biến',
  },
  {
    id: 'bank',
    name: 'Chuyển khoản ngân hàng',
    icon: 'apartment',
    description: 'Chuyển khoản trực tiếp',
  },
]

export default function TopupScreen({ navigation }: any) {
  const [customAmount, setCustomAmount] = useState('')
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('vnpay')
  const [isProcessing, setIsProcessing] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

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

      if (selectedPaymentMethod === 'vnpay') {
        // Gọi VNpay payment
        const paymentUrl = await paymentService.createVNPayPayment(amount)
        
        if (paymentUrl) {
          console.log('[TopupScreen] VNPay URL received:', paymentUrl)
          // Mở WebView với VNpay URL
          navigation?.navigate('PaymentWebView', {
            paymentUrl,
            amount,
            type: 'topup',
          })
          setShowPaymentModal(false)
        }
      } else {
        Alert.alert('Thông báo', 'Phương thức này đang được phát triển')
      }
    } catch (error: any) {
      console.error('[TopupScreen] Payment error:', error)
      Alert.alert('Lỗi', error.message || 'Lỗi trong quá trình thanh toán')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
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
                  <MaterialIcons name="close" size={24} color={COLORS.text} />
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
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.xl,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  customAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
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
    color: COLORS.primary,
  },
  customAmountInput: {
    flex: 1,
    paddingVertical: SPACING.md,
    paddingRight: SPACING.md,
    fontSize: 16,
    color: COLORS.text,
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
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    alignItems: 'center',
  },
  presetButtonActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  presetText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  presetTextActive: {
    color: COLORS.primary,
  },
  selectedAmountCard: {
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
    marginTop: SPACING.lg,
  },
  selectedAmountLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  selectedAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
  },
  paymentMethodsContainer: {
    gap: SPACING.md,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  paymentMethodCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
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
    backgroundColor: COLORS.darkBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentMethodIconActive: {
    backgroundColor: COLORS.primary + '20',
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  paymentMethodDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.darkBorder,
  },
  radioButtonActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '20',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '10',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.xl,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.text,
    lineHeight: 18,
  },
  feeSection: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  feeLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  feeValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  feeDivider: {
    height: 1,
    backgroundColor: COLORS.darkBorder,
    marginVertical: SPACING.md,
  },
  feeTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
  },
  feeTotalValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.darkBg,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkBorder,
  },
  payButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  payButtonDisabled: {
    opacity: 0.5,
  },
  payButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.darkCard,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
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
    color: COLORS.text,
  },
  confirmationContent: {
    alignItems: 'center',
  },
  confirmIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  confirmLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  confirmAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.lg,
  },
  confirmDetails: {
    width: '100%',
    backgroundColor: COLORS.darkBg,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  detailLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
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
    borderColor: COLORS.darkBorder,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
})
