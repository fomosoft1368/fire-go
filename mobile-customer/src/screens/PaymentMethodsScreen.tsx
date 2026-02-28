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
} from 'react-native'
import { MaterialIcons, FontAwesome5, Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import {
  paymentMethodService,
  PaymentMethod,
  CreatePaymentMethodInput,
} from '../services/paymentMethodService'

interface PaymentMethodsScreenProps {
  navigation: any
}

const getCardColor = (type: string) => {
  const colors: Record<string, any> = {
    credit_card: { bg: '#1F2937', border: '#3B82F6' },
    debit_card: { bg: '#065F46', border: '#10B981' },
    bank_account: { bg: '#7C3AED', border: '#A78BFA' },
    wallet: { bg: '#DC2626', border: '#FCA5A5' },
  }
  return colors[type] || { bg: '#4B5563', border: '#9CA3AF' }
}

export default function PaymentMethodsScreen({ navigation }: PaymentMethodsScreenProps) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)

  const [addFormData, setAddFormData] = useState<CreatePaymentMethodInput>({
    type: 'credit_card',
    name: '',
  })

  useEffect(() => {
    loadPaymentMethods()
  }, [])

  const loadPaymentMethods = async () => {
    try {
      setLoading(true)
      const methods = await paymentMethodService.getPaymentMethods()
      setPaymentMethods(methods)
    } catch (error) {
      console.error('Error loading payment methods:', error)
      Alert.alert('Lỗi', 'Không thể tải phương thức thanh toán')
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadPaymentMethods()
    setRefreshing(false)
  }, [])

  const handleAddPaymentMethod = async () => {
    if (!addFormData.name.trim()) {
      Alert.alert('Lỗi', 'Vui lòng nhập tên phương thức')
      return
    }

    try {
      const newMethod = await paymentMethodService.createPaymentMethod(addFormData)
      setPaymentMethods([newMethod, ...paymentMethods])
      setShowAddModal(false)
      setAddFormData({ type: 'credit_card', name: '' })
      Alert.alert('Thành công', 'Thêm phương thức thanh toán thành công')
    } catch (error) {
      Alert.alert('Lỗi', error instanceof Error ? error.message : 'Không thể thêm phương thức')
    }
  }

  const handleDeletePaymentMethod = (methodId: string, methodName: string) => {
    Alert.alert(
      'Xác nhận xóa',
      `Bạn chắc chắn muốn xóa "${methodName}"?`,
      [
        { text: 'Hủy', onPress: () => {}, style: 'cancel' },
        {
          text: 'Xóa',
          onPress: async () => {
            try {
              await paymentMethodService.deletePaymentMethod(methodId)
              setPaymentMethods(paymentMethods.filter(m => m._id !== methodId))
              Alert.alert('Thành công', 'Phương thức thanh toán đã được xóa')
            } catch (error) {
              Alert.alert('Lỗi', 'Không thể xóa phương thức thanh toán')
            }
          },
          style: 'destructive',
        },
      ],
    )
  }

  const handleSetDefault = async (methodId: string) => {
    try {
      await paymentMethodService.setDefaultPaymentMethod(methodId)
      const updatedMethods = paymentMethods.map(m => ({
        ...m,
        isDefault: m._id === methodId,
      }))
      setPaymentMethods(updatedMethods)
      Alert.alert('Thành công', 'Đã đặt làm phương thức mặc định')
    } catch (error) {
      Alert.alert('Lỗi', 'Không thể cập nhật phương thức mặc định')
    }
  }

  const renderPaymentMethodCard = (method: PaymentMethod) => {
    const cardColor = getCardColor(method.type)
    const isDefault = method.isDefault

    return (
      <View key={method._id} style={styles.cardContainer}>
        <View style={[styles.card, { borderColor: cardColor.border, backgroundColor: cardColor.card }]}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardIconSection}>
              <Text style={styles.cardIcon}>{method.icon}</Text>
              <View>
                <Text style={styles.cardType}>{getTypeLabel(method.type)}</Text>
                <Text style={styles.cardName}>{method.name}</Text>
              </View>
            </View>
            {isDefault && (
              <View style={styles.defaultBadge}>
                <Ionicons name="checkmark-circle" size={18} color="#10B981" />
                <Text style={styles.defaultText}>Mặc định</Text>
              </View>
            )}
          </View>

          {/* Card Details */}
          <View style={styles.cardDetails}>
            {method.cardNumber && (
              <Text style={styles.cardNumber}>{method.cardNumber}</Text>
            )}
            {method.accountNumber && (
              <Text style={styles.cardNumber}>{maskAccountNumber(method.accountNumber)}</Text>
            )}
          </View>

          {/* Card Meta */}
          <View style={styles.cardMeta}>
            {method.expiryDate && (
              <Text style={styles.metaText}>Hạn: {method.expiryDate}</Text>
            )}
            {method.bankName && <Text style={styles.metaText}>{method.bankName}</Text>}
          </View>

          {/* Card Actions */}
          <View style={styles.cardActions}>
            {!isDefault && (
              <TouchableOpacity
                style={[styles.actionBtn, styles.setDefaultBtn]}
                onPress={() => handleSetDefault(method._id)}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>Đặt mặc định</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => handleDeletePaymentMethod(method._id, method.name)}
            >
              <MaterialIcons name="delete" size={16} color="#fff" />
              <Text style={styles.actionBtnText}>Xóa</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      credit_card: 'Thẻ tín dụng',
      debit_card: 'Thẻ ghi nợ',
      bank_account: 'Tài khoản ngân hàng',
      wallet: 'Ví điện tử',
    }
    return labels[type] || type
  }

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber
    const masked = '*'.repeat(accountNumber.length - 4) + accountNumber.slice(-4)
    return masked.replace(/(.{4})/g, '$1 ').trim()
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
        <TouchableOpacity 
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phương thức thanh toán</Text>
        <TouchableOpacity
          onPress={() => setShowAddModal(true)}
          style={styles.addButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {paymentMethods.length === 0 ? (
          <View style={styles.emptyState}>
            <FontAwesome5 name="wallet" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>Chưa có phương thức thanh toán</Text>
            <Text style={styles.emptySubText}>Thêm thẻ hoặc tài khoản ngân hàng</Text>
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddModal(true)}
            >
              <Text style={styles.emptyButtonText}>Thêm phương thức</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.methodsList}>
            {paymentMethods.map(method => renderPaymentMethodCard(method))}
          </View>
        )}
      </ScrollView>

      {/* Add Payment Method Modal */}
      {showAddModal && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thêm phương thức thanh toán</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <MaterialIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Type Selection */}
              <Text style={styles.formLabel}>Loại phương thức</Text>
              <View style={styles.typeSelector}>
                {[
                  { value: 'credit_card', label: 'Thẻ tín dụng', icon: 'credit-card', iconLib: 'FontAwesome5' },
                  { value: 'debit_card', label: 'Thẻ ghi nợ', icon: 'credit-card', iconLib: 'FontAwesome5' },
                  { value: 'bank_account', label: 'Tài khoản ngân hàng', icon: 'account-balance', iconLib: 'MaterialIcons' },
                  { value: 'wallet', label: 'Ví điện tử', icon: 'account-balance-wallet', iconLib: 'MaterialIcons' },
                ].map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeOption,
                      addFormData.type === type.value && styles.typeOptionSelected,
                    ]}
                    onPress={() =>
                      setAddFormData({ ...addFormData, type: type.value as any })
                    }
                  >
                    {type.iconLib === 'FontAwesome5' ? (
                      <FontAwesome5
                        name={type.icon as any}
                        size={16}
                        color={addFormData.type === type.value ? COLORS.primary : COLORS.textSecondary}
                        style={styles.typeOptionIcon}
                      />
                    ) : (
                      <MaterialIcons
                        name={type.icon as any}
                        size={16}
                        color={addFormData.type === type.value ? COLORS.primary : COLORS.textSecondary}
                        style={styles.typeOptionIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.typeOptionText,
                        addFormData.type === type.value && styles.typeOptionTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Method Name */}
              <Text style={styles.formLabel}>Tên phương thức</Text>
              <View style={styles.formInput}>
                <MaterialIcons name="label" size={20} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.textInput}
                  placeholder="VD: My VISA, Vietcombank"
                  placeholderTextColor={COLORS.textSecondary}
                  value={addFormData.name}
                  onChangeText={text => setAddFormData({ ...addFormData, name: text })}
                />
              </View>

              {/* Card Info */}
              {(addFormData.type === 'credit_card' || addFormData.type === 'debit_card') && (
                <>
                  <Text style={styles.formLabel}>Số thẻ (4 số cuối)</Text>
                  <View style={styles.formInput}>
                    <FontAwesome5 name="credit-card" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="****1234"
                      maxLength={4}
                      keyboardType="numeric"
                      placeholderTextColor={COLORS.textSecondary}
                      value={addFormData.cardNumber}
                      onChangeText={text =>
                        setAddFormData({ ...addFormData, cardNumber: text })
                      }
                    />
                  </View>

                  <Text style={styles.formLabel}>Tên chủ thẻ</Text>
                  <View style={styles.formInput}>
                    <MaterialIcons name="person" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="VD: NGUYEN VAN A"
                      placeholderTextColor={COLORS.textSecondary}
                      value={addFormData.cardholderName}
                      onChangeText={text =>
                        setAddFormData({ ...addFormData, cardholderName: text })
                      }
                    />
                  </View>

                  <Text style={styles.formLabel}>Ngày hết hạn</Text>
                  <View style={styles.formInput}>
                    <MaterialIcons name="calendar-today" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="MM/YY"
                      placeholderTextColor={COLORS.textSecondary}
                      value={addFormData.expiryDate}
                      onChangeText={text =>
                        setAddFormData({ ...addFormData, expiryDate: text })
                      }
                    />
                  </View>
                </>
              )}

              {/* Bank Info */}
              {addFormData.type === 'bank_account' && (
                <>
                  <Text style={styles.formLabel}>Ngân hàng</Text>
                  <View style={styles.formInput}>
                    <MaterialIcons name="business" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="VD: Vietcombank, Techcombank"
                      placeholderTextColor={COLORS.textSecondary}
                      value={addFormData.bankName}
                      onChangeText={text =>
                        setAddFormData({ ...addFormData, bankName: text })
                      }
                    />
                  </View>

                  <Text style={styles.formLabel}>Số tài khoản</Text>
                  <View style={styles.formInput}>
                    <FontAwesome5 name="university" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="0123456789"
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType="numeric"
                      value={addFormData.accountNumber}
                      onChangeText={text =>
                        setAddFormData({ ...addFormData, accountNumber: text })
                      }
                    />
                  </View>

                  <Text style={styles.formLabel}>Chủ tài khoản</Text>
                  <View style={styles.formInput}>
                    <MaterialIcons name="person" size={20} color={COLORS.textSecondary} />
                    <TextInput
                      style={styles.textInput}
                      placeholder="VD: NGUYEN VAN A"
                      placeholderTextColor={COLORS.textSecondary}
                      value={addFormData.accountHolder}
                      onChangeText={text =>
                        setAddFormData({ ...addFormData, accountHolder: text })
                      }
                    />
                  </View>
                </>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.footerBtn, styles.cancelBtn]}
                onPress={() => setShowAddModal(false)}
              >
                <Text style={styles.cancelBtnText}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.footerBtn, styles.submitBtn]}
                onPress={handleAddPaymentMethod}
              >
                <Text style={styles.submitBtnText}>Thêm phương thức</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.primary,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    marginLeft: SPACING.md,
  },
  addButton: {
    padding: SPACING.md,
  },
  backButton: {
    padding: SPACING.md,
  },
  content: {
    flex: 1,
  },
  methodsList: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  cardContainer: {
    marginBottom: SPACING.md,
  },
  card: {
    borderWidth: 2,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  cardIconSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  cardIcon: {
    fontSize: 32,
    color: '#130a0a',
  },
  cardType: {
    fontSize: 12,
    color: '#0f0f0f',
    textTransform: 'uppercase', //
  },
  cardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0c0c0c',
    marginTop: 4, //
  },
  defaultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  defaultText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  cardDetails: {
    marginBottom: SPACING.md,
  },
  cardNumber: {
    fontSize: 16,
    color: '#080808',
    letterSpacing: 2,
    fontWeight: '600',
    marginBottom: SPACING.sm, //
  },
  cardMeta: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  metaText: {
    fontSize: 12,
    color: '#161616', //
  },
  cardActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: SPACING.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  setDefaultBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  deleteBtn: {
    backgroundColor: 'rgba(241, 147, 6, 0.2)',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl * 2,
    paddingHorizontal: SPACING.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.lg,
  },
  emptySubText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  emptyButton: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  emptyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  modal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.bgSecondary,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  modalBody: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  typeSelector: {
    gap: SPACING.sm,
  },
  typeOption: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bgSecondary,
  },
  typeOptionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  typeOptionIcon: {
    marginRight: SPACING.sm,
  },
  typeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  typeOptionTextSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  formInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.bgSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
})
