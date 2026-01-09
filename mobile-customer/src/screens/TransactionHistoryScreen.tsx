import { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  FlatList,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import { walletService, Transaction } from '../services/walletService'

interface TransactionHistoryScreenProps {
  navigation: any
}

export default function TransactionHistoryScreen({ navigation }: TransactionHistoryScreenProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  // Filter states
  const [selectedDateRange, setSelectedDateRange] = useState<'all' | '7days' | 'today'>('all')
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)

  // Filter dropdown
  const [dateFilterOpen, setDateFilterOpen] = useState(false)
  const [typeFilterOpen, setTypeFilterOpen] = useState(false)
  const [statusFilterOpen, setStatusFilterOpen] = useState(false)

  // Detail modal
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [cancelLoading, setCancelLoading] = useState(false)

  const dateFilterOptions = [
    { label: 'Tất cả', value: 'all' },
    { label: '7 ngày', value: '7days' },
    { label: 'Hôm nay', value: 'today' },
  ]

  const typeFilterOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Nạp tiền', value: 'deposit' },
    { label: 'Rút tiền', value: 'withdraw' },
  ]

  const statusFilterOptions = [
    { label: 'Tất cả', value: null },
    { label: 'Chờ duyệt', value: 'pending' },
    { label: 'Thành công', value: 'success' },
    { label: 'Thất bại', value: 'failed' },
  ]

  useEffect(() => {
    loadTransactions(1)
  }, [])

  const loadTransactions = async (page: number) => {
    try {
      setLoading(true)
      const data = await walletService.getTransactionHistory(page, itemsPerPage)
      setTransactions(data.data)
      setTotalPages(data.pages)
      setCurrentPage(page)
      applyFilters(data.data)
    } catch (error) {
      console.error('Error loading transactions:', error)
      Alert.alert('Lỗi', 'Không thể tải lịch sử giao dịch')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = (data: Transaction[]) => {
    let filtered = [...data]

    // Filter by date range
    const now = new Date()
    if (selectedDateRange === '7days') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      filtered = filtered.filter(t => new Date(t.createdAt) >= sevenDaysAgo)
    } else if (selectedDateRange === 'today') {
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      filtered = filtered.filter(t => new Date(t.createdAt) >= startOfToday)
    }

    // Filter by type
    if (selectedType) {
      filtered = filtered.filter(t => t.type === selectedType)
    }

    // Filter by status
    if (selectedStatus) {
      filtered = filtered.filter(t => t.status === selectedStatus)
    }

    setFilteredTransactions(filtered)
  }

  useEffect(() => {
    applyFilters(transactions)
  }, [selectedDateRange, selectedType, selectedStatus, transactions])

  const handleCancelWithdraw = () => {
    if (!selectedTransaction) return

    Alert.alert(
      'Hủy rút tiền',
      `Hủy yêu cầu rút tiền ${walletService.formatCurrency(selectedTransaction.amount)}?\n\nSố tiền sẽ được hoàn lại vào ví của bạn.`,
      [
        { text: 'Không', style: 'cancel' },
        {
          text: 'Hủy yêu cầu',
          onPress: async () => {
            try {
              setCancelLoading(true)
              await walletService.cancelWithdraw(selectedTransaction._id)
              Alert.alert('Thành công', 'Yêu cầu rút tiền đã được hủy. Tiền đã hoàn lại vào ví.')
              setDetailModalVisible(false)
              loadTransactions(currentPage)
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Không thể hủy rút tiền')
            } finally {
              setCancelLoading(false)
            }
          },
        },
      ]
    )
  }

  const renderTransactionItem = (item: Transaction) => {
    const isIncome = ['deposit', 'topup', 'earning', 'refund'].includes(item.type)
    const typeLabel = walletService.getTransactionTypeLabel(item.type)
    const statusLabel = walletService.getStatusLabel(item.status)
    const statusColor = walletService.getStatusColor(item.status)

    return (
      <TouchableOpacity
        style={styles.transactionItem}
        onPress={() => {
          setSelectedTransaction(item)
          setDetailModalVisible(true)
        }}
      >
        <View style={[styles.icon, { backgroundColor: isIncome ? '#4CAF5020' : '#F4433620' }]}>
          <MaterialIcons
            name={isIncome ? 'arrow-downward' : 'arrow-upward'}
            size={20}
            color={isIncome ? '#4CAF50' : '#F44336'}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.type}>{typeLabel}</Text>
          <Text style={styles.date}>{walletService.formatDate(item.createdAt)}</Text>
        </View>

        <View style={styles.right}>
          <Text style={[styles.amount, { color: isIncome ? '#4CAF50' : '#F44336' }]}>
            {isIncome ? '+' : '-'}{walletService.formatCurrency(item.amount)}
          </Text>
          <View style={[styles.badge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
          <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Lịch sử giao dịch</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filters */}
      <View style={styles.filtersBox}>
        {/* Date Filter */}
        <View style={styles.filterItem}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setDateFilterOpen(!dateFilterOpen)}
          >
            <Text style={styles.filterLabel}>Ngày:</Text>
            <Text style={styles.filterValue}>
              {dateFilterOptions.find(o => o.value === selectedDateRange)?.label}
            </Text>
            <MaterialIcons
              name={dateFilterOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
          {dateFilterOpen && (
            <View style={styles.dropdownMenu}>
              {dateFilterOptions.map(option => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.dropdownItem, selectedDateRange === option.value && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedDateRange(option.value as any)
                    setDateFilterOpen(false)
                    setCurrentPage(1)
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedDateRange === option.value && styles.dropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Type Filter */}
        <View style={styles.filterItem}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setTypeFilterOpen(!typeFilterOpen)}
          >
            <Text style={styles.filterLabel}>Loại:</Text>
            <Text style={styles.filterValue}>
              {typeFilterOptions.find(o => o.value === selectedType)?.label}
            </Text>
            <MaterialIcons
              name={typeFilterOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
          {typeFilterOpen && (
            <View style={styles.dropdownMenu}>
              {typeFilterOptions.map(option => (
                <TouchableOpacity
                  key={option.value || 'all'}
                  style={[styles.dropdownItem, selectedType === option.value && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedType(option.value)
                    setTypeFilterOpen(false)
                    setCurrentPage(1)
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedType === option.value && styles.dropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Status Filter */}
        <View style={styles.filterItem}>
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setStatusFilterOpen(!statusFilterOpen)}
          >
            <Text style={styles.filterLabel}>Trạng thái:</Text>
            <Text style={styles.filterValue}>
              {statusFilterOptions.find(o => o.value === selectedStatus)?.label}
            </Text>
            <MaterialIcons
              name={statusFilterOpen ? 'arrow-drop-up' : 'arrow-drop-down'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
          {statusFilterOpen && (
            <View style={styles.dropdownMenu}>
              {statusFilterOptions.map(option => (
                <TouchableOpacity
                  key={option.value || 'all'}
                  style={[styles.dropdownItem, selectedStatus === option.value && styles.dropdownItemActive]}
                  onPress={() => {
                    setSelectedStatus(option.value)
                    setStatusFilterOpen(false)
                    setCurrentPage(1)
                  }}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      selectedStatus === option.value && styles.dropdownItemTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* Results Info */}
      {!loading && (
        <View style={styles.resultInfo}>
          <Text style={styles.resultText}>{filteredTransactions.length} giao dịch</Text>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : filteredTransactions.length === 0 ? (
        <View style={styles.centerContainer}>
          <MaterialIcons name="receipt" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>Không có giao dịch</Text>
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          <View style={styles.listContent}>
            {filteredTransactions.map((item) => (
              <View key={item._id}>
                {renderTransactionItem(item)}
              </View>
            ))}
          </View>

          {/* Pagination */}
          {totalPages > 1 && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[styles.pageBtn, currentPage === 1 && styles.pageBtnDisabled]}
                onPress={() => loadTransactions(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <MaterialIcons
                  name="chevron-left"
                  size={20}
                  color={currentPage === 1 ? COLORS.textSecondary : COLORS.primary}
                />
              </TouchableOpacity>

              <Text style={styles.pageText}>
                {currentPage} / {totalPages}
              </Text>

              <TouchableOpacity
                style={[styles.pageBtn, currentPage === totalPages && styles.pageBtnDisabled]}
                onPress={() => loadTransactions(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={currentPage === totalPages ? COLORS.textSecondary : COLORS.primary}
                />
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.headerBtn}>
              <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Chi tiết giao dịch</Text>
            <View style={{ width: 24 }} />
          </View>

          {selectedTransaction && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Info Card */}
              <View style={styles.infoCard}>
                <View
                  style={[
                    styles.iconLarge,
                    {
                      backgroundColor: ['deposit', 'topup', 'earning', 'refund'].includes(selectedTransaction.type)
                        ? '#4CAF5020'
                        : '#F4433620',
                    },
                  ]}
                >
                  <MaterialIcons
                    name={
                      ['deposit', 'topup', 'earning', 'refund'].includes(selectedTransaction.type)
                        ? 'arrow-downward'
                        : 'arrow-upward'
                    }
                    size={32}
                    color={
                      ['deposit', 'topup', 'earning', 'refund'].includes(selectedTransaction.type)
                        ? '#4CAF50'
                        : '#F44336'
                    }
                  />
                </View>

                <Text style={styles.amountLarge}>
                  {['deposit', 'topup', 'earning', 'refund'].includes(selectedTransaction.type)
                    ? '+'
                    : '-'}
                  {walletService.formatCurrency(selectedTransaction.amount)}
                </Text>

                <View style={[styles.statusBadgeLarge, { backgroundColor: `${walletService.getStatusColor(selectedTransaction.status)}20` }]}>
                  <Text style={[styles.statusBadgeLargeText, { color: walletService.getStatusColor(selectedTransaction.status) }]}>
                    {walletService.getStatusLabel(selectedTransaction.status)}
                  </Text>
                </View>
              </View>

              {/* Details Grid */}
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Mã giao dịch</Text>
                  <Text style={styles.detailRowValue}>{selectedTransaction.transactionCode}</Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Loại</Text>
                  <Text style={styles.detailRowValue}>
                    {walletService.getTransactionTypeLabel(selectedTransaction.type)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.detailRowLabel}>Ngày tạo</Text>
                  <Text style={styles.detailRowValue}>{walletService.formatDate(selectedTransaction.createdAt)}</Text>
                </View>

                {selectedTransaction.fee > 0 && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Phí giao dịch</Text>
                    <Text style={styles.detailRowValue}>
                      {walletService.formatCurrency(selectedTransaction.fee)}
                    </Text>
                  </View>
                )}

                {selectedTransaction.description && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailRowLabel}>Ghi chú</Text>
                    <Text style={styles.detailRowValue}>{selectedTransaction.description}</Text>
                  </View>
                )}
              </View>

              {/* Bank Account Info */}
              {selectedTransaction.type === 'withdraw' && selectedTransaction.bankAccount && (
                <View style={styles.bankSection}>
                  <Text style={styles.sectionTitle}>Tài khoản rút tiền</Text>
                  <View style={styles.bankInfo}>
                    {selectedTransaction.bankAccount.bankName && (
                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Ngân hàng</Text>
                        <Text style={styles.bankValue}>
                          {selectedTransaction.bankAccount.bankName}
                        </Text>
                      </View>
                    )}
                    {selectedTransaction.bankAccount.accountHolder && (
                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Chủ tài khoản</Text>
                        <Text style={styles.bankValue}>
                          {selectedTransaction.bankAccount.accountHolder}
                        </Text>
                      </View>
                    )}
                    {selectedTransaction.bankAccount.accountNumber && (
                      <View style={styles.bankRow}>
                        <Text style={styles.bankLabel}>Số tài khoản</Text>
                        <Text style={styles.bankValue}>
                          {selectedTransaction.bankAccount.accountNumber}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Cancel Button */}
              {selectedTransaction.type === 'withdraw' && selectedTransaction.status === 'pending' && (
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancelWithdraw}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="close" size={20} color="#fff" />
                      <Text style={styles.cancelBtnText}>Hủy yêu cầu rút tiền</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              <View style={{ height: SPACING.lg }} />
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgSecondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  filtersBox: {
    backgroundColor: COLORS.bgSecondary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterItem: {
    marginBottom: SPACING.md,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    minWidth: 60,
  },
  filterValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginHorizontal: SPACING.sm,
  },
  dropdownMenu: {
    marginTop: 4,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 0,
    overflow: 'hidden',
    maxHeight: 200,
  },
  dropdownItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.primary}80`,
  },
  dropdownItemActive: {
    backgroundColor: `${COLORS.primary}CC`,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: '#fff',
  },
  resultInfo: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.bgSecondary,
  },
  resultText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgSecondary,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
  },
  type: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  right: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.bgSecondary,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  pageBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  pageBtnDisabled: {
    opacity: 0.5,
  },
  pageText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    minWidth: 80,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalContent: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.bg,
  },
  infoCard: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  iconLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  amountLarge: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  statusBadgeLargeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  detailsGrid: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailRowLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
  },
  detailRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  bankSection: {
    marginBottom: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
  },
  bankInfo: {
    backgroundColor: COLORS.bgSecondary,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bankLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flex: 1,
  },
  bankValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
    textAlign: 'right',
  },
  cancelBtn: {
    flexDirection: 'row',
    backgroundColor: '#F44336',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  cancelBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
})
