import React, { useState, useEffect } from 'react'
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
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import { useSelector } from 'react-redux'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { driverService } from '../services/driverService'
import type { RootState } from '../redux/store'

interface WithdrawalRequest {
  _id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  bankAccount: string
  description?: string
  createdAt: string
  updatedAt: string
  transactionCode?: string
}

interface WalletBalance {
  balance: number
}

export default function WithdrawalScreen() {
  const navigation = useNavigation()
  const { user } = useSelector((state: RootState) => state.auth)

  const [walletBalance, setWalletBalance] = useState<number>(0)
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('')
  const [bankAccount, setBankAccount] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      // Fetch wallet balance
      const balanceRes = await driverService.getWalletBalance()
      setWalletBalance(balanceRes.balance || 0)

      // Fetch withdrawal history
      const historyRes = await driverService.getWithdrawalHistory(1, 20)
      setWithdrawalHistory(historyRes.data || historyRes.transactions || [])
    } catch (error: any) {
      console.error('❌ Error fetching data:', error)
      Alert.alert('Lỗi', 'Không thể tải dữ liệu ví')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestWithdrawal = async () => {
    // Validate
    if (!withdrawalAmount || isNaN(Number(withdrawalAmount))) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền hợp lệ')
      return
    }

    const amount = Number(withdrawalAmount)
    if (amount < 50000) {
      Alert.alert('Lỗi', 'Số tiền rút tối thiểu 50,000 VND')
      return
    }

    if (amount > walletBalance) {
      Alert.alert('Lỗi', 'Số dư không đủ')
      return
    }

    if (!bankAccount) {
      Alert.alert('Lỗi', 'Vui lòng nhập tài khoản ngân hàng')
      return
    }

    // Confirm
    Alert.alert(
      'Xác nhận rút tiền',
      `Bạn muốn rút ${amount.toLocaleString('vi-VN')}đ?\n\nLệnh rút sẽ được gửi đến admin để duyệt.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Rút tiền',
          style: 'destructive',
          onPress: async () => {
            setSubmitting(true)
            try {
              const result = await driverService.requestWithdrawal(
                amount,
                bankAccount,
                description || undefined
              )

              Alert.alert(
                'Thành công',
                'Lệnh rút tiền đã được gửi. Admin sẽ duyệt trong 24 giờ.',
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      setWithdrawalAmount('')
                      setBankAccount('')
                      setDescription('')
                      fetchData()
                      setActiveTab('history')
                    },
                  },
                ]
              )
            } catch (error: any) {
              console.error('❌ Error:', error)
              Alert.alert(
                'Lỗi',
                error.response?.data?.message || error.message || 'Lỗi hệ thống'
              )
            } finally {
              setSubmitting(false)
            }
          },
        },
      ]
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#FFA500'
      case 'approved':
        return '#2196F3'
      case 'completed':
        return '#4CAF50'
      case 'rejected':
        return '#f44336'
      default:
        return '#64748b'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Chờ duyệt'
      case 'approved':
        return 'Đã duyệt'
      case 'completed':
        return 'Hoàn thành'
      case 'rejected':
        return 'Từ chối'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleString('vi-VN')
    } catch {
      return dateString
    }
  }

  const renderWithdrawalCard = (item: WithdrawalRequest) => (
    <View style={styles.historyCard}>
      <View style={styles.historyHeader}>
        <View>
          <Text style={styles.historyAmount}>
            {item.amount.toLocaleString('vi-VN')}đ
          </Text>
          <Text style={styles.historyCode}>
            {item.transactionCode || item._id.slice(-8).toUpperCase()}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <MaterialIcons
            name={
              item.status === 'completed'
                ? 'check-circle'
                : item.status === 'rejected'
                ? 'cancel'
                : item.status === 'approved'
                ? 'schedule'
                : 'hourglass-empty'
            }
            size={16}
            color={getStatusColor(item.status)}
          />
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.historyDetails}>
        <View style={styles.detailRow}>
          <MaterialIcons name="account-balance" size={16} color="#64748b" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.detailLabel}>Tài khoản</Text>
            <Text style={styles.detailValue}>{item.bankAccount}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <MaterialIcons name="access-time" size={16} color="#64748b" />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.detailLabel}>Ngày yêu cầu</Text>
            <Text style={styles.detailValue}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        {item.description && (
          <View style={styles.detailRow}>
            <MaterialIcons name="notes" size={16} color="#64748b" />
            <View style={{ flex: 1, marginLeft: 8 }}>
              <Text style={styles.detailLabel}>Ghi chú</Text>
              <Text style={styles.detailValue}>{item.description}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Rút tiền</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Wallet Balance Card */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceContent}>
              <Text style={styles.balanceLabel}>Số dư ví</Text>
              <Text style={styles.balanceAmount}>
                {walletBalance.toLocaleString('vi-VN')}đ
              </Text>
              <Text style={styles.balanceSubtext}>
                Có thể rút tối thiểu 50,000đ
              </Text>
            </View>
            <View style={styles.balanceIcon}>
              <MaterialIcons name="account-balance-wallet" size={48} color={COLORS.primary} />
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'new' && styles.tabActive]}
              onPress={() => setActiveTab('new')}
            >
              <MaterialIcons
                name="send"
                size={20}
                color={activeTab === 'new' ? COLORS.primary : '#64748b'}
              />
              <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>
                Rút tiền mới
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}
            >
              <MaterialIcons
                name="history"
                size={20}
                color={activeTab === 'history' ? COLORS.primary : '#64748b'}
              />
              <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>
                Lịch sử
              </Text>
            </TouchableOpacity>
          </View>

          {/* New Withdrawal Form */}
          {activeTab === 'new' && (
            <View style={styles.formContainer}>
              {/* Amount Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Số tiền rút</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="currency-exchange" size={20} color={COLORS.primary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập số tiền (VND)"
                    keyboardType="number-pad"
                    value={withdrawalAmount}
                    onChangeText={setWithdrawalAmount}
                    placeholderTextColor="#999"
                  />
                </View>
                {withdrawalAmount && (
                  <Text style={styles.helperText}>
                    {Number(withdrawalAmount).toLocaleString('vi-VN')}đ
                  </Text>
                )}
              </View>

              {/* Bank Account Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Tài khoản ngân hàng</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="account-balance" size={20} color={COLORS.primary} />
                  <TextInput
                    style={styles.input}
                    placeholder="Nhập số tài khoản hoặc ACB/VCB..."
                    value={bankAccount}
                    onChangeText={setBankAccount}
                    placeholderTextColor="#999"
                  />
                </View>
                <Text style={styles.helperText}>
                  Nhập số tài khoản hoặc tên cửa hàng đã lưu (ACB, VCB, v.v.)
                </Text>
              </View>

              {/* Description Input */}
              <View style={styles.formGroup}>
                <Text style={styles.label}>Ghi chú (tùy chọn)</Text>
                <View style={styles.inputWrapper}>
                  <MaterialIcons name="notes" size={20} color={COLORS.primary} />
                  <TextInput
                    style={[styles.input, { minHeight: 100 }]}
                    placeholder="Nhập ghi chú..."
                    multiline
                    numberOfLines={4}
                    value={description}
                    onChangeText={setDescription}
                    placeholderTextColor="#999"
                    textAlignVertical="top"
                  />
                </View>
              </View>

              {/* Info Box */}
              <View style={styles.infoBox}>
                <MaterialIcons name="info" size={20} color="#2196F3" />
                <Text style={styles.infoText}>
                  Lệnh rút sẽ được gửi đến admin. Bạn sẽ nhận tiền trong 1-2 ngày làm việc.
                </Text>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleRequestWithdrawal}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <MaterialIcons name="send" size={20} color="#fff" />
                    <Text style={styles.submitBtnText}>Yêu cầu rút tiền</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Withdrawal History */}
          {activeTab === 'history' && (
            <View style={styles.historyContainer}>
              {withdrawalHistory.length > 0 ? (
                <FlatList
                  data={withdrawalHistory}
                  keyExtractor={(item) => item._id}
                  renderItem={({ item }) => renderWithdrawalCard(item)}
                  scrollEnabled={false}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <MaterialIcons name="inbox" size={64} color="#cbd5e1" />
                  <Text style={styles.emptyText}>Chưa có lệnh rút nào</Text>
                  <Text style={styles.emptySubtext}>
                    Các lệnh rút của bạn sẽ hiển thị ở đây
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: SPACING.xl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.lg,
    color: '#64748b',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  balanceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.lg,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  balanceContent: {
    flex: 1,
  },
  balanceLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  balanceSubtext: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },
  balanceIcon: {
    marginLeft: SPACING.lg,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: SPACING.xl,
    marginVertical: SPACING.lg,
    backgroundColor: '#f1f5f9',
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  tabTextActive: {
    color: COLORS.primary,
  },
  formContainer: {
    paddingHorizontal: SPACING.xl,
  },
  formGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 0,
  },
  helperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: SPACING.xs,
  },
  infoBox: {
    flexDirection: 'row',
    gap: SPACING.md,
    backgroundColor: '#e3f2fd',
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#1565c0',
    fontWeight: '500',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  historyContainer: {
    paddingHorizontal: SPACING.xl,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  historyAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  historyCode: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  historyDetails: {
    gap: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  detailLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  detailValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: '500',
    marginTop: SPACING.xs,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl * 2,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#64748b',
    marginTop: SPACING.sm,
  },
})
