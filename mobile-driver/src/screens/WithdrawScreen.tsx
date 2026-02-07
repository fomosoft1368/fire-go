import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants';
import { walletService } from '../services/walletService';

interface BankInfo {
  accountNumber: string;
  bankName: string;
  accountHolderName: string;
}

const POPULAR_BANKS = [
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MB Bank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'BIDV', name: 'BIDV' },
];

export default function WithdrawScreen({ navigation }: any) {
  const [amount, setAmount] = useState('');
  const [bankInfo, setBankInfo] = useState<BankInfo>({
    accountNumber: '',
    bankName: '',
    accountHolderName: '',
  });
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [fetchingBalance, setFetchingBalance] = useState(true);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const data = await walletService.getBalance();
      setBalance(data.balance);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message);
    } finally {
      setFetchingBalance(false);
    }
  };

  const handleWithdraw = async () => {
    const withdrawAmount = parseInt(amount);

    if (!withdrawAmount || withdrawAmount <= 0) {
      Alert.alert('Lỗi', 'Vui lòng nhập số tiền rút');
      return;
    }

    if (withdrawAmount < 50000) {
      Alert.alert('Lỗi', 'Số tiền rút tối thiểu là 50.000đ');
      return;
    }

    if (withdrawAmount > balance) {
      Alert.alert('Lỗi', 'Số dư không đủ để thực hiện giao dịch');
      return;
    }

    if (!bankInfo.accountNumber || !bankInfo.bankName || !bankInfo.accountHolderName) {
      Alert.alert('Lỗi', 'Vui lòng nhập đầy đủ thông tin ngân hàng');
      return;
    }

    Alert.alert(
      'Xác nhận rút tiền',
      `Rút ${withdrawAmount.toLocaleString('vi-VN')}đ về ${bankInfo.bankName}\nSTK: ${bankInfo.accountNumber}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            try {
              setLoading(true);
              await walletService.withdraw({
                amount: withdrawAmount,
                bankAccountNumber: bankInfo.accountNumber,
                bankName: bankInfo.bankName,
                accountHolderName: bankInfo.accountHolderName,
              });

              Alert.alert('Thành công', 'Yêu cầu rút tiền đã được tạo.\nTiền sẽ về tài khoản trong 1-2 ngày làm việc.', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]);
            } catch (error: any) {
              Alert.alert('Lỗi', error.message || 'Rút tiền thất bại');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
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

          {/* Quick Withdraw All */}
          <TouchableOpacity
            style={styles.withdrawAllBtn}
            onPress={() => setAmount(balance.toString())}
          >
            <MaterialIcons name="account-balance-wallet" size={16} color={COLORS.primary} />
            <Text style={styles.withdrawAllText}>Rút toàn bộ</Text>
          </TouchableOpacity>
        </View>

        {/* Bank Information */}
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

        {/* Info Banner */}
        <View style={styles.infoBanner}>
          <MaterialIcons name="info-outline" size={20} color={COLORS.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoText}>• Thời gian xử lý: 1-2 ngày làm việc</Text>
            <Text style={styles.infoText}>• Phí rút tiền: Miễn phí</Text>
            <Text style={styles.infoText}>• Số tiền tối thiểu: 50.000đ</Text>
          </View>
        </View>

        {/* Confirm Button */}
        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmBtnDisabled]}
          onPress={handleWithdraw}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <>
              <MaterialIcons name="send" size={20} color={COLORS.text} />
              <Text style={styles.confirmBtnText}>Xác nhận rút tiền</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
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
    marginBottom: SPACING.md,
    paddingTop: 45,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  balanceCard: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
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
    color: COLORS.text,
    marginBottom: SPACING.md,
  },
  amountInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    paddingHorizontal: SPACING.lg,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
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
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  textInput: {
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: 14,
    color: COLORS.text,
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
    backgroundColor: COLORS.darkCard,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
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
  },
  infoText: {
    fontSize: 12,
    color: COLORS.text,
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
    color: COLORS.text,
  },
});
