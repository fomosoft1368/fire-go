import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

interface StatusBadgeProps {
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  size?: 'sm' | 'md'
}

const statusConfig = {
  pending: { label: 'Chờ xác nhận', color: '#ffc107' },
  confirmed: { label: 'Đã xác nhận', color: COLORS.primary },
  in_progress: { label: 'Đang chuyến', color: COLORS.success },
  completed: { label: 'Hoàn thành', color: COLORS.success },
  cancelled: { label: 'Đã hủy', color: COLORS.danger },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status]
  const sizeStyles = {
    sm: { padding: SPACING.xs, fontSize: 11 },
    md: { padding: SPACING.sm, fontSize: 12 },
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.color + '20', paddingHorizontal: sizeStyles[size].padding },
      ]}
    >
      <Text style={[styles.text, { fontSize: sizeStyles[size].fontSize, color: config.color }]}>
        {config.label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
  },
})
