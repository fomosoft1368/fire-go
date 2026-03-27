import { useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Vibration,
  Animated,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants'
import type { RootStackParamList } from '../types'

type IncomingCallRouteProp = RouteProp<RootStackParamList, 'IncomingCall'>
type NavProp = NativeStackNavigationProp<RootStackParamList>

const AUTO_DISMISS_MS = 31_000

export default function IncomingCallScreen() {
  const navigation = useNavigation<NavProp>()
  const route = useRoute<IncomingCallRouteProp>()
  const {
    callId,
    rideId,
    channelName,
    receiverToken,
    receiverUid,
    callerName,
    callerRole,
  } = route.params

  const pulseAnim = useRef(new Animated.Value(1)).current
  const dismissTimer = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    )
    pulse.start()
    Vibration.vibrate([0, 500, 300, 500, 300, 500], true)

    dismissTimer.current = setTimeout(() => {
      Vibration.cancel()
      navigation.goBack()
    }, AUTO_DISMISS_MS)

    return () => {
      pulse.stop()
      Vibration.cancel()
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    }
  }, [])

  const getToken = async (): Promise<string> => {
    return (await AsyncStorage.getItem('driverToken')) || ''
  }

  const handleAccept = async () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    Vibration.cancel()

    try {
      const token = await getToken()
      const res = await fetch(`${API_BASE_URL}/call/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ callId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.message || 'Cannot accept call')

      const { channelName: ch, receiverToken: rt, receiverUid: ruid } = json.data

      navigation.replace('ActiveCall', {
        callId,
        rideId,
        channelName: ch || channelName,
        token: rt || receiverToken,
        uid: ruid || receiverUid,
        otherPartyName: callerName,
        role: 'receiver',
      })
    } catch (err: any) {
      console.error('[Driver IncomingCallScreen] Accept error:', err.message)
      navigation.goBack()
    }
  }

  const handleReject = async () => {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    Vibration.cancel()

    try {
      const token = await getToken()
      await fetch(`${API_BASE_URL}/call/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ callId }),
      })
    } catch (err: any) {
      console.error('[Driver IncomingCallScreen] Reject error:', err.message)
    } finally {
      navigation.goBack()
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.content}>
        <Animated.View style={[styles.avatarRing, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.avatarInner}>
            <MaterialIcons name="person" size={60} color="#3b82f6" />
          </View>
        </Animated.View>

        <Text style={styles.label}>
          {callerRole === 'customer' ? 'Khách hàng đang gọi' : 'Tài xế đang gọi'}
        </Text>
        <Text style={styles.callerName}>{callerName || 'Người dùng'}</Text>
        <Text style={styles.subLabel}>Cuộc gọi thoại</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
          <MaterialIcons name="call-end" size={32} color="#fff" />
          <Text style={styles.btnLabel}>Từ chối</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
          <MaterialIcons name="call" size={32} color="#fff" />
          <Text style={styles.btnLabel}>Chấp nhận</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'space-between',
    paddingVertical: 60,
  },
  content: {
    alignItems: 'center',
    gap: 16,
  },
  avatarRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  label: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 8,
  },
  callerName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  subLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  rejectBtn: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ef4444',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  acceptBtn: {
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#22c55e',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  btnLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
})
