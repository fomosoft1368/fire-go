import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { walletService } from '../services/walletService'
import { paymentMethodService, PaymentMethod } from '../services/paymentMethodService'
import { pricingService } from '../services/pricingService'

interface BankInfo {
  accountNumber: string
  bankName: string
  accountHolderName: string
}

const POPULAR_BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'BIDV', name: 'BIDV' },
]

export default function WithdrawScreen({ navigation }: any) {
  const [amount, setAmount] = useState('')
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    accountNumber: '',
    bankName: '',
    accountHolderName: '',
  })
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(false)
  const [fetchingBalance, setFetchingBalance] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null)
  const [useNewAccount, setUseNewAccount] = useState(false)
  const [minWithdrawAmount, setMinWithdrawAmount] = useState(50000)

  useEffect(() => {
    fetchBalance()
    fetchPaymentMethods()
    loadPricingConfig()
  }, [])

  const fetchBalance = async () => {
    try {
      const walletBalance = await walletService.getBalance()
      setBalance(walletBalance)
    } catch (error: any) {
      Alert.alert('Lỗi', error.message)
    } finally {
      setFetchingBalance(false)
    }
  }

  const fetchPaymentMethods = async () => {
    try {
      const methods = await paymentMethodService.getPaymentMethods()
      const bankAccounts = methods.filter((m) => m.type === 'bank_account' && m.isActive)
      setPaymentMethods(bankAccounts)
      
      // Auto-select default method
      const defaultMethod = bankAccounts.find((m) => m.isDefault)
      if (defaultMethod) {
        setSelectedMethod(defaultMethod)
      }
    } catch (error: any) {
      console.error('[WithdrawScreen] Error fetching payment methods:', error?.message || error)
      // Don't show error to user - they can still use manual entry
      setPaymentMethods([])
    }
  }

  const loadPricingConfig = async () => {
    try {
      const minAmount = await pricingService.getMinWithdrawAmountCustomer()
      setMinWithdrawAmount(minAmount)
      console.log('[WithdrawScreen] Min withdraw amount loaded:', minAmount)
    } catch (error) {
      console.error('[WithdrawScreen] Error loading pricing config:', error)
      // Keep default 50000
    }
  }

  const getValidationError = (): string | null => {
    const withdrawAmount = parseInt(amount)
    if (!withdrawAmount || withdrawAmount <= 0) {
      return null // Don't show error for empty input
    }
    if (withdrawAmount < minWithdrawAmount) {
      return `Số tiền rút tối thiểu là ${minWithdrawAmount.toLocaleString('vi-VN')}đ`
    }
    if (withdrawAmount > balance) {
      return 'Số dư không đủ để thực hiện giao dịch'
    }
    return null
  }

  const handleWithdraw = async () => {
    const withdrawAmount = parseInt(amount)

    const validationError = getValidationError()
    if (validationError) {
      Alert.alert('Lỗi', validationError)
      return
    }

    if (!withdrawAmount || withdrawAmount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền rút')
      return
    }

    // Determine if using manual entry or saved method
    const isManualEntry = useNewAccount || paymentMethods.length === 0

    // Check if using saved method - only validate if payment methods exist
    if (paymentMethods.length > 0 && !useNewAccount && !selectedMethod) {
      Alert.alert('Lỗi', 'Vui lòng chọn tài khoản ngân hàng')
      return
    }

    // Check manual entry fields - only validate if using manual entry
    if (isManualEntry && (!bankInfo.accountNumber || !bankInfo.bankName || !bankInfo.accountHolderName)) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin ngân hàng')
      return
    }

    const bankDisplay = isManualEntry 
      ? `${bankInfo.bankName} - STK: ${bankInfo.accountNumber}`
      : `${selectedMethod?.bankName} - STK: ${selectedMethod?.accountNumber}`

    Alert.alert(
      'Xác nhận rút tiền',
      `Rút ${withdrawAmount.toLocaleString('vi-VN')}đ về ${bankDisplay}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              setLoading(true)
              
              if (isManualEntry) {
                // Use manual bank details
                await walletService.withdrawManual(
                  withdrawAmount,
                  bankInfo.accountNumber,
                  bankInfo.bankName,
                  bankInfo.accountHolderName,
                  `Rút tiền về ${bankInfo.bankName}`
                )
              } else {
                // Use saved payment method
                await walletService.withdraw(
                  withdrawAmount,
                  selectedMethod!._id,
                  `Rút tiền về ${selectedMethod!.bankName}`
                )
              }

              Alert.alert('Thành công', 'Yêu cầu rút tiền đã được tạo.\nTiền sẽ về tài khoản trong 1-2 ngày làm việc.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ])
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Rút tiền thất bại')
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Rút tiền về ngân hàng</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Số dư khả dụng</Text>
          {fetchingBalance ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.balanceAmount}>{balance.toLocaleString('vi-VN')}đ</Text>
          )}
        </View>

        {/* Withdraw Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Số tiền rút</Text>
          <View style={styles.amountInput}>
            <TextInput
              style={styles.input}
              placeholder="Nhập số tiền"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <Text style={styles.currency}>VNĐ</Text>
          </View>
          {amount && parseInt(amount) > 0 && (
            <Text style={styles.amountPreview}>{parseInt(amount).toLocaleString('vi-VN')} đồng</Text>
          )}

          {/* Validation Error */}
          {getValidationError() && (
            <View style={styles.errorContainer}>
              <MaterialIcons name="error-outline" size={16} color={COLORS.error} />
              <Text style={styles.errorText}>{getValidationError()}</Text>
            </View>
          )}

          {/* Quick Withdraw All */}
          <TouchableOpacity
            style={styles.withdrawAllBtn}
            onPress={() => setAmount(balance.toString())}
          >
            <MaterialIcons name="account-balance-wallet" size={16} color={COLORS.primary} />
            <Text style={styles.withdrawAllText}>Rút toàn bộ</Text>
          </TouchableOpacity>
        </View>

        {/* Saved Payment Methods */}
        {paymentMethods.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Tài khoản ngân hàng</Text>
              <TouchableOpacity onPress={() => navigation.navigate('PaymentMethods')}>
                <Text style={styles.manageLinkText}>Quản lý</Text>
              </TouchableOpacity>
            </View>

            {paymentMethods.map((method) => (
              <TouchableOpacity
                key={method._id}
                style={[
                  styles.paymentMethodCard,
                  selectedMethod?._id === method._id && !useNewAccount && styles.paymentMethodCardSelected,
                ]}
                onPress={() => {
                  setSelectedMethod(method)
                  setUseNewAccount(false)
                }}
                disabled={useNewAccount}
              >
                <View style={styles.radioCircle}>
                  {selectedMethod?._id === method._id && !useNewAccount && (
                    <View style={styles.radioCircleInner} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentMethodName}>{method.bankName}</Text>
                  <Text style={styles.paymentMethodDetails}>STK: {method.accountNumber}</Text>
                  <Text style={styles.paymentMethodDetails}>{method.accountHolder}</Text>
                </View>
                {method.isDefault && (
                  <View style={styles.defaultBadge}>
                    <Text style={styles.defaultBadgeText}>Mặc định</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}

            {/* Add new account option */}
            <TouchableOpacity
              style={[
                styles.paymentMethodCard,
                useNewAccount && styles.paymentMethodCardSelected,
              ]}
              onPress={() => {
                setUseNewAccount(true)
                setSelectedMethod(null)
              }}
            >
              <View style={styles.radioCircle}>
                {useNewAccount && <View style={styles.radioCircleInner} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.paymentMethodName}>Thêm tài khoản mới</Text>
                <Text style={styles.paymentMethodDetails}>Nhập thông tin ngân hàng</Text>
              </View>
              <MaterialIcons name="add-circle-outline" size={24} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Bank Information (Manual Entry) */}
        {(useNewAccount || paymentMethods.length === 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin ngân hàng</Text>

            {/* Bank Name */}
            <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Ngân hàng</Text>
            <TextInput
              style={styles.textInput}
              placeholder="VD: Vietcombank, Techcombank..."
              placeholderTextColor={COLORS.textSecondary}
              value={bankInfo.bankName}
              onChangeText={(text) => setBankInfo({ ...bankInfo, bankName: text })}
            />
          </View>

          {/* Popular Banks */}
          <View style={styles.bankGrid}>
            {POPULAR_BANKS.map((bank) => (
              <TouchableOpacity
                key={bank.code}
                style={[
                  styles.bankChip,
                  bankInfo.bankName === bank.name && styles.bankChipActive,
                ]}
                onPress={() => setBankInfo({ ...bankInfo, bankName: bank.name })}
              >
                <Text
                  style={[
                    styles.bankChipText,
                    bankInfo.bankName === bank.name && styles.bankChipTextActive,
                  ]}
                >
                  {bank.code}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Account Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Số tài khoản</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Nhập số tài khoản"
              placeholderTextColor={COLORS.textSecondary}
              keyboardType="numeric"
              value={bankInfo.accountNumber}
              onChangeText={(text) => setBankInfo({ ...bankInfo, accountNumber: text })}
            />
          </View>

          {/* Account Holder Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tên chủ tài khoản</Text>
            <TextInput
              style={styles.textInput}
              placeholder="NGUYEN VAN A"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="characters"
              value={bankInfo.accountHolderName}
              onChangeText={(text) => setBankInfo({ ...bankInfo, accountHolderName: text.toUpperCase() })}
            />
          </View>
          </View>
        )}

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialIcons name="info-outline" size={20} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoText}>• Thời gian xử lý: 1-2 ngày làm việc</Text>
            <Text style={styles.infoText}>• Phí rút tiền: Miễn phí</Text>
            <Text style={styles.infoText}>• Số tiền tối thiểu: {minWithdrawAmount.toLocaleString('vi-VN')}đ</Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, (loading || getValidationError()) && styles.confirmBtnDisabled]}
          onPress={handleWithdraw}
          disabled={loading || !!getValidationError()}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <MaterialIcons name="send" size={20} color="#ffffff" />
              <Text style={styles.confirmBtnText}>Xác nhận rút tiền</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.md,
    paddingTop: 45,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  balanceCard: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.primary,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.primary,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  manageLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: SPACING.md,
  },
  paymentMethodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioCircleInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  paymentMethodName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  paymentMethodDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  defaultBadge: {
    backgroundColor: COLORS.primary + '20',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  defaultBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primary,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: SPACING.lg,
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  amountPreview: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'right',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.error + '15',
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.error,
    fontWeight: '500',
  },
  withdrawAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
  },
  withdrawAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  bankGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  bankChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bankChipActive: {
    backgroundColor: COLORS.primary + '20',
    borderColor: COLORS.primary,
  },
  bankChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bankChipTextActive: {
    color: COLORS.primary,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.primary + '20',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
})
