import React, { useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

interface WalletCard {
  id: string
  type: 'visa' | 'mastercard' | 'cash'
  name: string
  last4: string
  isDefault: boolean
}

interface Transaction {
  id: string
  description: string
  amount: number
  type: 'debit' | 'credit'
  date: string
  status: 'completed' | 'pending'
}

const mockCards: WalletCard[] = [
  {
    id: 'card_1',
    type: 'visa',
    name: 'Thẻ chính',
    last4: '1234',
    isDefault: true,
  },
  {
    id: 'card_2',
    type: 'mastercard',
    name: 'Thẻ phụ',
    last4: '5678',
    isDefault: false,
  },
]

const mockTransactions: Transaction[] = [
  {
    id: 'tx_1',
    description: 'Chuyến 123 Đường Nguyễn Huệ → Quốc lộ 1A',
    amount: 145000,
    type: 'debit',
    date: '14 Dec 2024, 14:58',
    status: 'completed',
  },
  {
    id: 'tx_2',
    description: 'Hoàn tiền chuyến bị hủy',
    amount: 50000,
    type: 'credit',
    date: '12 Dec 2024, 18:35',
    status: 'completed',
  },
  {
    id: 'tx_3',
    description: 'Chuyến Sân bay → Tòa nhà A',
    amount: 210000,
    type: 'debit',
    date: '13 Dec 2024, 09:50',
    status: 'completed',
  },
]

export default function WalletScreen() {
  const [walletBalance, setWalletBalance] = useState(425000)
  const [activeCard, setActiveCard] = useState(mockCards[0].id)

  const handleAddMoney = () => {
    alert('Thêm tiền vào ví')
  }

  const handleWithdraw = () => {
    alert('Rút tiền từ ví')
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Ví tiền</Text>
      </View>

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <Text style={styles.balanceLabel}>Số dư ví</Text>
          <TouchableOpacity style={styles.moreButton}>
            <MaterialIcons name="more-vert" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
        <Text style={styles.balanceAmount}>
          {walletBalance.toLocaleString('vi-VN')}₫
        </Text>
        <View style={styles.balanceActions}>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddMoney}>
            <MaterialIcons name="add" size={20} color={COLORS.primary} />
            <Text style={styles.actionText}>Thêm tiền</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleWithdraw}>
            <MaterialIcons name="call-made" size={20} color={COLORS.danger} />
            <Text style={styles.actionText}>Rút tiền</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Payment Methods */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Phương thức thanh toán</Text>
          <TouchableOpacity>
            <Text style={styles.addLink}>Thêm</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.cardsContainer}>
          {mockCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.cardItem,
                activeCard === card.id && styles.cardItemActive,
              ]}
              onPress={() => setActiveCard(card.id)}
            >
              <View style={styles.cardInfo}>
                <MaterialIcons
                  name={card.type === 'visa' ? 'credit-card' : 'account-balance-wallet'}
                  size={28}
                  color={activeCard === card.id ? COLORS.primary : COLORS.textSecondary}
                />
                <View style={styles.cardDetails}>
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardLast4}>•••• {card.last4}</Text>
                </View>
              </View>
              {card.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultText}>Mặc định</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Transaction History */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Lịch sử giao dịch</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllLink}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={mockTransactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.transactionItem}>
              <View style={styles.transactionLeft}>
                <View
                  style={[
                    styles.transactionIcon,
                    item.type === 'debit' && styles.transactionIconDebit,
                  ]}
                >
                  <MaterialIcons
                    name={item.type === 'debit' ? 'call-received' : 'call-made'}
                    size={18}
                    color={item.type === 'debit' ? COLORS.danger : COLORS.success}
                  />
                </View>
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDesc}>{item.description}</Text>
                  <Text style={styles.transactionDate}>{item.date}</Text>
                </View>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  item.type === 'debit'
                    ? styles.transactionAmountDebit
                    : styles.transactionAmountCredit,
                ]}
              >
                {item.type === 'debit' ? '-' : '+'}{item.amount.toLocaleString('vi-VN')}₫
              </Text>
            </View>
          )}
          scrollEnabled={false}
        />
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.lightBg,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  balanceCard: {
    margin: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
  },
  balanceTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  balanceLabel: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.8,
  },
  moreButton: {
    padding: SPACING.xs,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: SPACING.xl,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  actionButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  addLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  viewAllLink: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '600',
  },
  cardsContainer: {
    gap: SPACING.md,
  },
  cardItem: {
    backgroundColor: COLORS.lightCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.lightBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  cardDetails: {
    flex: 1,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardLast4: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  defaultBadge: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  defaultText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightBorder,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4caf5020',
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionIconDebit: {
    backgroundColor: '#ff444420',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  transactionDate: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  transactionAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  transactionAmountDebit: {
    color: COLORS.danger,
  },
  transactionAmountCredit: {
    color: COLORS.success,
  },
})
