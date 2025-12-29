import React, { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'

interface Props {
  onCancel: () => void
}

export default function FindingDriverOverlay({ onCancel }: Props) {
  const pulse1 = useRef(new Animated.Value(0)).current
  const pulse2 = useRef(new Animated.Value(0)).current
  const pulse3 = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 2200,
          delay,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      )

    const a1 = createPulse(pulse1, 0)
    const a2 = createPulse(pulse2, 700)
    const a3 = createPulse(pulse3, 1400)

    a1.start()
    a2.start()
    a3.start()

    return () => {
      pulse1.stopAnimation()
      pulse2.stopAnimation()
      pulse3.stopAnimation()
    }
  }, [])

  const renderPulse = (anim: Animated.Value) => {
    const scale = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1.8],
    })

    const opacity = anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 0],
    })

    return (
      <Animated.View
        style={[
          styles.pulse,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
      />
    )
  }

  return (
    <View style={styles.container}>
      {/* Radar */}
      <View style={styles.radarContainer}>
        {renderPulse(pulse1)}
        {renderPulse(pulse2)}
        {renderPulse(pulse3)}

        <View style={styles.centerDot} />
      </View>

      {/* Status */}
      <View style={styles.card}>
        <Text style={styles.icon}>🔍</Text>
        <Text style={styles.text}>Đang tìm tài xế gần bạn…</Text>

        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <MaterialIcons name="close" size={20} color="#fff" />
          <Text style={styles.cancelText}>Hủy chuyến</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },

  radarContainer: {
    position: 'absolute',
    top: '45%',
    left: '50%',
    width: 120,
    height: 120,
    marginLeft: -60,
    marginTop: -60,
    justifyContent: 'center',
    alignItems: 'center',
  },

  pulse: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FF6B00',
  },

  centerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FF6B00',
    shadowColor: '#FF6B00',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 6,
  },

  card: {
    backgroundColor: '#1a202c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    gap: 16,
  },

  icon: {
    fontSize: 36,
    textAlign: 'center',
  },

  text: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },

  cancelButton: {
    height: 52,
    backgroundColor: '#ef4444',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },

  cancelText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
})
