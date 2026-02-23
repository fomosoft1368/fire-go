import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
  RefreshControl,
  Modal,
  Image,
  Clipboard,
} from 'react-native'
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { walletService, Wallet, Transaction } from '../services/walletService'
import { paymentMethodService, PaymentMethod } from '../services/paymentMethodService'

interface WalletScreenProps {
  navigation: any
}

interface DepositRequest {
  _id: string
  transactionCode: string
  amount: number
  status: string
  qrCodeUrl?: string
}

export default function WalletScreen({ navigation }: WalletScreenProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showDepositModal, setShowDepositModal] = useState(false)
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [showQRModal, setShowQRModal] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [bankAccounts, setBankAccounts] = useState<PaymentMethod[]>([])
  const [topupDiscount, setTopupDiscount] = useState<number>(0)

  // Deposit form state
  const [depositAmount, setDepositAmount] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null)
  const [depositLoading, setDepositLoading] = useState(false)
  const [depositRequest, setDepositRequest] = useState<DepositRequest | null>(null)

  // Withdraw form state
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [selectedBankAccount, setSelectedBankAccount] = useState<PaymentMethod | null>(null)
  const [withdrawLoading, setWithdrawLoading] = useState(false)
  const [withdrawRequest, setWithdrawRequest] = useState<DepositRequest | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([loadWallet(), loadTransactions(), loadPaymentMethods(), loadTopupDiscount()])
    } finally {
      setLoading(false)
    }
  }

  const loadWallet = async () => {
    try {
      const data = await walletService.getWalletBalance()
      setWallet(data)
    } catch (error) {
      console.error('Error loading wallet:', error)
    }
  }

  const loadTransactions = async () => {
    try {
      const data = await walletService.getTransactionHistory(1, 5)
      setTransactions(data.data)
    } catch (error) {
      console.error('Error loading transactions:', error)
    }
  }

  const loadPaymentMethods = async () => {
    try {
      const methods = await paymentMethodService.getPaymentMethods()
      setPaymentMethods(methods)
      const accounts = methods.filter(m => m.type === 'bank_account')
      setBankAccounts(accounts)
    } catch (error) {
      console.error('Error loading payment methods:', error)
    }
  }

  const loadTopupDiscount = async () => {
    try {
      const discount = await walletService.getTopupDiscount()
      setTopupDiscount(discount)
    } catch (error) {
      console.error('Error loading topup discount:', error)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [])

  const handleDeposit = async () => {
    if (!depositAmount || !selectedPaymentMethod) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền và chọn phương thức thanh toán')
      return
    }

    const amount = parseInt(depositAmount)
    if (amount < 10000) {
      Alert.alert('Lỗi', 'Số tiền tối thiểu 10,000 VND')
      return
    }

    try {
      setDepositLoading(true)
      const response = await walletService.deposit(amount, selectedPaymentMethod._id)
      
      // Show QR code modal - không cần generate QR, dùng QR cố định
      setDepositRequest({
        _id: response._id,
        transactionCode: response.transactionCode,
        amount: response.amount,
        status: response.status,
      })
      
      setShowDepositModal(false)
      setShowQRModal(true)
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tạo lệnh nạp tiền')
    } finally {
      setDepositLoading(false)
    }
  }

  const handleWithdraw = async () => {
    if (!withdrawAmount || !selectedBankAccount) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền và chọn tài khoản ngân hàng')
      return
    }

    const amount = parseInt(withdrawAmount)
    if (amount < 50000) {
      Alert.alert('Lỗi', 'Số tiền tối thiểu 50,000 VND')
      return
    }

    if (wallet && amount > wallet.balance) {
      Alert.alert('Lỗi', `Số dư không đủ. Hiện có: ${walletService.formatCurrency(wallet.balance)}`)
      return
    }

    Alert.alert(
      'Xác nhận rút tiền',
      `Bạn muốn rút ${walletService.formatCurrency(amount)} sang ${selectedBankAccount.name}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              setWithdrawLoading(true)
              const response = await walletService.withdraw(amount, selectedBankAccount._id)
              
              // Show withdrawal confirmation
              setWithdrawRequest({
                _id: response._id,
                transactionCode: response.transactionCode,
                amount: response.amount,
                status: response.status,
              })
              
              setShowWithdrawModal(false)
              setShowQRModal(true)
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể tạo lệnh rút tiền')
            } finally {
              setWithdrawLoading(false)
            }
          },
        },
      ],
    )
  }

  const renderTransaction = (item: Transaction) => {
    const isDeposit = item.type === 'deposit' || item.type === 'topup' || item.type === 'earning'
    const typeLabel = walletService.getTransactionTypeLabel(item.type)
    const statusLabel = walletService.getStatusLabel(item.status)
    const typeColor = walletService.getTransactionTypeColor(item.type)
    const statusColor = walletService.getStatusColor(item.status)

    return (
      <View key={item._id} style={styles.transactionItem}>
        <View style={[styles.transactionIcon, { backgroundColor: `${typeColor}20` }]}>
          <MaterialIcons
            name={isDeposit ? 'arrow-downward' : 'arrow-upward'}
            size={20}
            color={typeColor}
          />
        </View>

        <View style={styles.transactionContent}>
          <Text style={styles.transactionType}>{typeLabel}</Text>
          <Text style={styles.transactionDate}>{walletService.formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.transactionRight}>
          <Text style={[styles.transactionAmount, { color: isDeposit ? '#4CAF50' : '#F44336' }]}>
            {isDeposit ? '+' : '-'}{walletService.formatCurrency(item.amount)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ví của tôi</Text>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Wallet Card */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View>
              <Text style={styles.walletLabel}>Số dư ví</Text>
              <Text style={styles.walletBalance}>
                {walletService.formatCurrency(wallet?.balance || 0)}
              </Text>
            </View>
            <FontAwesome5 name="wallet" size={40} color="#fff" />
          </View>

          <View style={styles.walletStats}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Đã nạp</Text>
              <Text style={styles.statValue}>{walletService.formatCurrency(wallet?.totalTopUps || 0)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Đã chi</Text>
              <Text style={styles.statValue}>{walletService.formatCurrency(wallet?.totalSpent || 0)}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.depositBtn]}
              onPress={() => setShowDepositModal(true)}
            >
              <MaterialIcons name="arrow-downward" size={20} color="#FF6B00" />
              <Text style={styles.actionBtnText}>Nạp tiền</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, styles.withdrawBtn]}
              onPress={() => setShowWithdrawModal(true)}
            >
              <MaterialIcons name="arrow-upward" size={20} color="#fff" />
              <Text style={[styles.actionBtnText, { color: '#fff' }]}>Rút tiền</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Transactions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
            {transactions.length > 0 && (
              <TouchableOpacity onPress={() => navigation.navigate('TransactionHistory')}>
                <Text style={styles.seeAll}>Xem tất cả</Text>
              </TouchableOpacity>
            )}
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="receipt" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>Chưa có giao dịch nào</Text>
            </View>
          ) : (
            <View style={styles.transactionsList}>
              {transactions.slice(0, 5).map(transaction => renderTransaction(transaction))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Deposit Modal */}
      {showDepositModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nạp tiền</Text>
              <TouchableOpacity 
                onPress={() => setShowDepositModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#f1f5f9',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Amount Input */}
              <Text style={styles.formLabel}>Số tiền nạp (VND)</Text>
              <View style={styles.formInput}>
                <MaterialIcons name="attach-money" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập số tiền (tối thiểu 10,000)"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={depositAmount}
                  onChangeText={setDepositAmount}
                />
              </View>

              {/* Discount Info */}
              {depositAmount && topupDiscount > 0 && (
                <View style={styles.discountInfo}>
                  <View style={styles.discountRow}>
                    <Text style={styles.discountLabel}>Số tiền nạp:</Text>
                    <Text style={styles.discountValue}>{walletService.formatCurrency(parseInt(depositAmount) || 0)}</Text>
                  </View>
                  <View style={styles.discountRow}>
                    <Text style={styles.discountLabel}>Chiết khấu ({topupDiscount}%):</Text>
                    <Text style={[styles.discountValue, styles.discountAmount]}>-{walletService.formatCurrency(Math.round((parseInt(depositAmount) || 0) * topupDiscount / 100))}</Text>
                  </View>
                  <View style={styles.discountRow}>
                    <Text style={styles.discountLabelBold}>Bạn nhận:</Text>
                    <Text style={styles.discountValueBold}>{walletService.formatCurrency(Math.round((parseInt(depositAmount) || 0) * (100 - topupDiscount) / 100))}</Text>
                  </View>
                </View>
              )}

              {/* Payment Method Selection */}
              <Text style={styles.formLabel}>Phương thức thanh toán</Text>
              {paymentMethods.length === 0 ? (
                <TouchableOpacity
                  style={styles.addPaymentMethodBtn}
                  onPress={() => {
                    setShowDepositModal(false)
                    navigation.navigate('PaymentMethods')
                  }}
                >
                  <MaterialIcons name="add" size={20} color={COLORS.primary} />
                  <Text style={styles.addPaymentMethodText}>Thêm phương thức thanh toán</Text>
                </TouchableOpacity>
              ) : (
                <ScrollView style={styles.methodSelector} scrollEnabled={false}>
                  {paymentMethods.map(method => (
                    <TouchableOpacity
                      key={method._id}
                      style={[
                        styles.methodOption,
                        selectedPaymentMethod?._id === method._id && styles.methodOptionSelected,
                      ]}
                      onPress={() => setSelectedPaymentMethod(method)}
                    >
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodName}>{method.name}</Text>
                        <Text style={styles.methodDetails}>
                          {method.type === 'credit_card' || method.type === 'debit_card'
                            ? method.cardNumber
                            : method.bankName}
                        </Text>
                      </View>
                      {selectedPaymentMethod?._id === method._id && (
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerBtn, styles.cancelBtn]}
                onPress={() => setShowDepositModal(false)}
                disabled={depositLoading}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, styles.submitBtn]}
                onPress={handleDeposit}
                disabled={depositLoading || !depositAmount || !selectedPaymentMethod}
              >
                {depositLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Nạp tiền</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rút tiền</Text>
              <TouchableOpacity 
                onPress={() => setShowWithdrawModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: '#f1f5f9',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <MaterialIcons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Current Balance */}
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceLabel}>Số dư hiện tại</Text>
                <Text style={styles.balanceValue}>
                  {walletService.formatCurrency(wallet?.balance || 0)}
                </Text>
              </View>

              {/* Amount Input */}
              <Text style={styles.formLabel}>Số tiền rút (VND)</Text>
              <View style={styles.formInput}>
                <MaterialIcons name="attach-money" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập số tiền (tối thiểu 50,000)"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="numeric"
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                />
              </View>

              {/* Bank Account Selection */}
              <Text style={styles.formLabel}>Tài khoản rút tiền</Text>
              {bankAccounts.length === 0 ? (
                <TouchableOpacity
                  style={styles.addPaymentMethodBtn}
                  onPress={() => {
                    setShowWithdrawModal(false)
                    navigation.navigate('PaymentMethods')
                  }}
                >
                  <MaterialIcons name="add" size={20} color={COLORS.primary} />
                  <Text style={styles.addPaymentMethodText}>Thêm tài khoản ngân hàng</Text>
                </TouchableOpacity>
              ) : (
                <ScrollView style={styles.methodSelector} scrollEnabled={false}>
                  {bankAccounts.map(account => (
                    <TouchableOpacity
                      key={account._id}
                      style={[
                        styles.methodOption,
                        selectedBankAccount?._id === account._id && styles.methodOptionSelected,
                      ]}
                      onPress={() => setSelectedBankAccount(account)}
                    >
                      <View style={styles.methodInfo}>
                        <Text style={styles.methodName}>{account.name}</Text>
                        <Text style={styles.methodDetails}>
                          {account.bankName} - {account.accountNumber}
                        </Text>
                      </View>
                      {selectedBankAccount?._id === account._id && (
                        <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerBtn, styles.cancelBtn]}
                onPress={() => setShowWithdrawModal(false)}
                disabled={withdrawLoading}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, styles.submitBtn]}
                onPress={handleWithdraw}
                disabled={withdrawLoading || !withdrawAmount || !selectedBankAccount}
              >
                {withdrawLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Rút tiền</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* QR Code Modal for Deposit/Withdraw Confirmation */}
      <Modal visible={showQRModal} transparent animationType="slide">
        <SafeAreaView style={styles.qrModalContainer}>
          <View style={styles.qrModalContent}>
            <TouchableOpacity
              style={styles.qrCloseBtn}
              onPress={() => {
                setShowQRModal(false)
                setDepositRequest(null)
                setWithdrawRequest(null)
                setDepositAmount('')
                setWithdrawAmount('')
                setSelectedPaymentMethod(null)
                setSelectedBankAccount(null)
                loadData()
              }}
            >
              <MaterialIcons name="close" size={24} color="#64748b" />
            </TouchableOpacity>

            <ScrollView style={styles.qrScrollView}>
              {depositRequest ? (
                <View style={styles.qrContent}>
                  <View style={styles.qrHeader}>
                    <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
                    <Text style={styles.qrTitle}>Lệnh nạp tiền đã tạo</Text>
                  </View>

                  <View style={styles.qrInfo}>
                    <Text style={styles.qrLabel}>Số tiền</Text>
                    <Text style={styles.qrValue}>{walletService.formatCurrency(depositRequest.amount)}</Text>
                  </View>

                  <View style={styles.qrInfo}>
                    <Text style={styles.qrLabel}>Mã tham chiếu (nội dung chuyển khoản)</Text>
                    <Text style={styles.qrValue}>{depositRequest.transactionCode}</Text>
                  </View>

                  {/* QR Code Display - Fixed QR Image */}
                  <View style={styles.qrCodeContainer}>
                    <Text style={styles.qrCodeLabel}>Quét mã QR để chuyển khoản:</Text>
                    <View style={styles.qrCodeBox}>
                      <Image
                        source={{ uri: 'https://img.vietqr.io/image/MB-0986190053-qr_only.png' }}
                        style={styles.qrCodeImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={styles.qrCodeNote}>
                      Quét mã QR bằng app ngân hàng hoặc chuyển khoản thủ công với thông tin dưới đây
                    </Text>
                    
                    {/* Bank Information - Easy to Copy */}
                    <View style={styles.bankInfo}>
                      <View style={styles.bankInfoRow}>
                        <View style={styles.bankInfoColumn}>
                          <Text style={styles.bankInfoLabel}>Ngân hàng</Text>
                          <Text style={styles.bankInfoValue}>Quân Đội (MB)</Text>
                        </View>
                      </View>
                      
                      <View style={styles.bankInfoRow}>
                        <View style={styles.bankInfoColumn}>
                          <Text style={styles.bankInfoLabel}>Số tài khoản</Text>
                          <Text style={styles.bankInfoValue}>0986190053</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => {
                            Clipboard.setString('0986190053')
                            Alert.alert('Thành công', 'Đã copy số tài khoản')
                          }}
                        >
                          <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.bankInfoRow}>
                        <View style={styles.bankInfoColumn}>
                          <Text style={styles.bankInfoLabel}>Số tiền</Text>
                          <Text style={styles.bankInfoValue}>{walletService.formatCurrency(depositRequest.amount)}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => {
                            Clipboard.setString(depositRequest.amount.toString())
                            Alert.alert('Thành công', 'Đã copy số tiền')
                          }}
                        >
                          <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.bankInfoRow}>
                        <View style={styles.bankInfoColumn}>
                          <Text style={styles.bankInfoLabel}>Nội dung chuyển khoản</Text>
                          <Text style={styles.bankInfoValue}>{depositRequest.transactionCode}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.copyButton}
                          onPress={() => {
                            Clipboard.setString(depositRequest.transactionCode)
                            Alert.alert('Thành công', 'Đã copy nội dung chuyển khoản')
                          }}
                        >
                          <MaterialIcons name="content-copy" size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <View style={styles.qrBox}>
                    <Text style={styles.qrBoxTitle}>📱 Hướng dẫn:</Text>
                    <Text style={styles.qrBoxText}>1. Mở ứng dụng ngân hàng của bạn</Text>
                    <Text style={styles.qrBoxText}>2. Quét mã QR hoặc chuyển khoản thủ công</Text>
                    <Text style={styles.qrBoxText}>3. <Text style={{ fontWeight: 'bold' }}>Nhập mã tham chiếu: {depositRequest.transactionCode}</Text> trong nội dung chuyển khoản</Text>
                    <Text style={styles.qrBoxText}>4. Admin sẽ duyệt và cộng tiền vào ví của bạn</Text>
                  </View>

                  <View style={styles.qrWarning}>
                    <MaterialIcons name="info" size={20} color="#FF9800" />
                    <Text style={styles.qrWarningText}>
                      Tiền sẽ được cộng vào ví sau khi admin xác nhận. Vui lòng kiểm tra lịch sử giao dịch.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.qrActionBtn}
                    onPress={() => {
                      setShowQRModal(false)
                      setDepositRequest(null)
                      loadData()
                    }}
                  >
                    <Text style={styles.qrActionBtnText}>Đã hiểu</Text>
                  </TouchableOpacity>
                </View>
              ) : withdrawRequest ? (
                <View style={styles.qrContent}>
                  <View style={styles.qrHeader}>
                    <MaterialIcons name="check-circle" size={80} color="#4CAF50" />
                    <Text style={styles.qrTitle}>Lệnh rút tiền đã tạo</Text>
                  </View>

                  <View style={styles.qrInfo}>
                    <Text style={styles.qrLabel}>Số tiền</Text>
                    <Text style={styles.qrValue}>{walletService.formatCurrency(withdrawRequest.amount)}</Text>
                  </View>

                  <View style={styles.qrInfo}>
                    <Text style={styles.qrLabel}>Mã tham chiếu</Text>
                    <Text style={styles.qrValue}>{withdrawRequest.transactionCode}</Text>
                  </View>

                  <View style={styles.qrBox}>
                    <Text style={styles.qrBoxTitle}>💳 Thông tin:</Text>
                    <Text style={styles.qrBoxText}>
                      Lệnh rút tiền của bạn đã được gửi. Admin sẽ xử lý và chuyển tiền vào tài khoản ngân hàng
                      của bạn trong vòng 1-3 ngày làm việc.
                    </Text>
                  </View>

                  <View style={styles.qrWarning}>
                    <MaterialIcons name="info" size={20} color="#2196F3" />
                    <Text style={styles.qrWarningText}>
                      Bạn có thể theo dõi trạng thái rút tiền trong lịch sử giao dịch.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.qrActionBtn}
                    onPress={() => {
                      setShowQRModal(false)
                      setWithdrawRequest(null)
                      loadData()
                    }}
                  >
                    <Text style={styles.qrActionBtnText}>Xong</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff5eb',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Wallet Card
  walletCard: {
    margin: SPACING.xl,
    backgroundColor: '#FF6B00',
    borderRadius: 20,
    padding: SPACING.xl,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xl,
  },
  walletLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.9,
    marginBottom: SPACING.sm,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  walletBalance: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -1,
  },

  walletStats: {
    flexDirection: 'row',
    marginBottom: SPACING.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    padding: SPACING.lg,
  },
  statBox: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
    marginBottom: SPACING.xs,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.5,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    marginHorizontal: SPACING.lg,
  },

  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  depositBtn: {
    backgroundColor: '#fff',
  },
  withdrawBtn: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  actionBtnText: {
    color: '#FF6B00',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: -0.2,
  },

  // Section
  section: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '700',
    letterSpacing: -0.2,
  },

  // Transactions
  transactionsList: {
    gap: SPACING.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.sm,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  transactionContent: {
    flex: 1,
  },
  transactionType: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  transactionDate: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  transactionRight: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
  },
  transactionAmount: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 15,
    color: '#64748b',
    marginTop: SPACING.md,
    fontWeight: '500',
  },

  // Modal
  modal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.5,
  },
  modalBody: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
  },

  formLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    letterSpacing: -0.2,
  },
  formInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: SPACING.md,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },

  discountInfo: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#22c55e',
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  discountLabel: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '600',
  },
  discountAmount: {
    color: '#ef4444',
  },
  discountLabelBold: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
  },
  discountValueBold: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '800',
  },

  balanceInfo: {
    backgroundColor: '#fff5eb',
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: SPACING.sm,
    fontWeight: '600',
  },
  balanceValue: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    letterSpacing: -0.5,
  },

  methodSelector: {
    maxHeight: 300,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    marginBottom: SPACING.md,
  },
  methodOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff5eb',
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  methodDetails: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  addPaymentMethodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    gap: SPACING.md,
  },
  addPaymentMethodText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: -0.2,
  },

  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#64748b',
    letterSpacing: -0.2,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },

  // QR Modal
  qrModalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  qrModalContent: {
    flex: 1,
    paddingTop: SPACING.xl,
  },
  qrCloseBtn: {
    alignSelf: 'flex-end',
    paddingRight: SPACING.xl,
    paddingBottom: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  qrScrollView: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
  },
  qrContent: {
    paddingVertical: SPACING.xl,
  },
  qrHeader: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  qrTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: SPACING.lg,
    letterSpacing: -0.5,
  },
  qrInfo: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  qrLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: SPACING.sm,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  qrValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.primary,
    fontFamily: 'monospace',
    letterSpacing: -0.3,
  },
  qrCodeContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  qrCodeLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: SPACING.lg,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  qrCodeBox: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  qrCodeImage: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#e2e8f0',
  },
  qrCodeLoading: {
    width: 240,
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 3,
    borderColor: '#e2e8f0',
  },
  qrCodeLoadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: SPACING.md,
    fontWeight: '500',
  },
  qrCodeNote: {
    fontSize: 13,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: SPACING.lg,
    textAlign: 'center',
    lineHeight: 20,
    fontWeight: '500',
  },
  bankInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bankInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  bankInfoColumn: {
    flex: 1,
  },
  bankInfoLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: SPACING.xs,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  bankInfoValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '800',
    fontFamily: 'monospace',
    letterSpacing: -0.2,
  },
  copyButton: {
    padding: SPACING.md,
    backgroundColor: '#fff5eb',
    borderRadius: 8,
  },
  qrBox: {
    backgroundColor: '#fff5eb',
    borderRadius: 16,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  qrBoxTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#F57C00',
    marginBottom: SPACING.md,
    letterSpacing: -0.2,
  },
  qrBoxText: {
    fontSize: 14,
    color: '#E65100',
    lineHeight: 22,
    marginBottom: SPACING.sm,
    fontWeight: '500',
  },
  qrWarning: {
    flexDirection: 'row',
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    padding: SPACING.xl,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  qrWarningText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 22,
    fontWeight: '500',
  },
  qrActionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  qrActionBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
  },
})
