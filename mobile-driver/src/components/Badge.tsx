import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'

interface BadgeProps {
  label: string
  color: string
  icon?: string
  size?: 'sm' | 'md' | 'lg'
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color,
  icon = 'local-taxi',
  size = 'md',
}) => {
  const sizeStyles = {
    sm: { padding: SPACING.xs, fontSize: 11 },
    md: { padding: SPACING.sm, fontSize: 12 },
    lg: { padding: SPACING.md, fontSize: 13 },
  }

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: color + '20', paddingHorizontal: sizeStyles[size].padding },
      ]}
    >
      <MaterialIcons name={icon as any} size={14} color={color} />
      <Text style={[styles.text, { fontSize: sizeStyles[size].fontSize, color }]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '700',
  },
})
