import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { API_BASE_URL } from '../constants'
import type { RootStackParamList } from '../types'

type ActiveCallRouteProp = RouteProp<RootStackParamList, 'ActiveCall'>
type NavProp = NativeStackNavigationProp<RootStackParamList>

export default function ActiveCallScreen() {
  const navigation = useNavigation<NavProp>()
  const route = useRoute<ActiveCallRouteProp>()
  const { callId, rideId, channelName, token, uid, otherPartyName, role } = route.params
  const authToken = useSelector((state: RootState) => state.auth.token)

  const isCaller = role === 'caller'

  // Ringing state: true = waiting for receiver to accept (only relevant for caller)
  const [isRinging, setIsRinging] = useState(isCaller)
  const [isMuted, setIsMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [callEnded, setCallEnded] = useState(false)
  const [statusText, setStatusText] = useState(isCaller ? 'Đang đổ chuông...' : 'Đang gọi')

  // Agora engine ref
  const agoraEngineRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const callEndedRef = useRef(false)

  // Pulsing animation for ringing state
  const pulseAnim = useRef(new Animated.Value(1)).current

  useEffect(() => {
    if (!isRinging) return
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    )
    pulse.start()
    return () => pulse.stop()
  }, [isRinging])

  // Join Agora channel (called when call is accepted or immediately for receiver)
  const joinAgoraChannel = useCallback(async () => {
    try {
      const AgoraModule = await import('react-native-agora').catch(() => null)
      if (!AgoraModule) return

      const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID
      if (!appId) {
        console.warn('[ActiveCallScreen] EXPO_PUBLIC_AGORA_APP_ID not set')
        return
      }

      const engine = AgoraModule.createAgoraRtcEngine()
      agoraEngineRef.current = engine
      engine.initialize({ appId })
      engine.enableAudio()
      await engine.joinChannel(token, channelName, uid, {})
      console.log('[ActiveCallScreen] Joined Agora channel:', channelName)
    } catch (err) {
      console.error('[ActiveCallScreen] Agora join error:', err)
    }
  }, [token, channelName, uid])

  // Start the call timer
  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
  }, [])

  // Poll backend every 2s to check if call was accepted (caller only)
  useEffect(() => {
    if (!isCaller || !isRinging) return

    const poll = async () => {
      if (callEndedRef.current) return
      try {
        const resp = await fetch(`${API_BASE_URL}/call/active/${rideId}`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        if (!resp.ok) return
        const data = await resp.json()
        const callData = data?.data

        if (!callData) {
          // Call no longer active → missed/rejected
          if (!callEndedRef.current) {
            setStatusText('Cuộc gọi đã kết thúc')
            callEndedRef.current = true
            setCallEnded(true)
            setTimeout(() => navigation.goBack(), 1500)
          }
          return
        }

        if (callData.status === 'accepted') {
          // Driver accepted → join channel and start timer
          if (pollRef.current) clearInterval(pollRef.current)
          setIsRinging(false)
          setStatusText('Đang gọi')
          await joinAgoraChannel()
          startTimer()
        }
      } catch (err) {
        console.warn('[ActiveCallScreen] Poll error:', err)
      }
    }

    // Poll immediately then every 2s
    poll()
    pollRef.current = setInterval(poll, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [isCaller, isRinging, rideId, authToken])

  // For receiver: join channel and start timer immediately
  useEffect(() => {
    if (isCaller) return
    joinAgoraChannel()
    startTimer()
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
      if (agoraEngineRef.current) {
        try {
          agoraEngineRef.current.leaveChannel()
          agoraEngineRef.current.release()
        } catch (_) {}
        agoraEngineRef.current = null
      }
    }
  }, [])

  const handleEndCall = async () => {
    if (callEndedRef.current) return
    callEndedRef.current = true
    setCallEnded(true)

    if (timerRef.current) clearInterval(timerRef.current)
    if (pollRef.current) clearInterval(pollRef.current)

    if (agoraEngineRef.current) {
      try { await agoraEngineRef.current.leaveChannel() } catch (_) {}
    }

    try {
      await fetch(`${API_BASE_URL}/call/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ callId }),
      })
    } catch (err: any) {
      console.error('[ActiveCallScreen] End call error:', err.message)
    } finally {
      navigation.goBack()
    }
  }

  const toggleMute = () => {
    if (agoraEngineRef.current) {
      const next = !isMuted
      try { agoraEngineRef.current.muteLocalAudioStream(next) } catch (_) {}
    }
    setIsMuted((m) => !m)
  }

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.content}>
        {/* Avatar with pulse animation when ringing */}
        <Animated.View
          style={[
            styles.avatarCircle,
            isRinging && { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <MaterialIcons name="person" size={60} color="#FF6B00" />
        </Animated.View>

        <Text style={styles.callerName}>{otherPartyName || 'Người dùng'}</Text>

        <Text style={[styles.status, callEnded && { color: '#ef4444' }]}>
          {callEnded ? 'Đã kết thúc' : statusText}
        </Text>

        {/* Timer: only show once call is connected */}
        {!isRinging && !callEnded && (
          <Text style={styles.timer}>{formatDuration(duration)}</Text>
        )}

        {/* Ringing dots */}
        {isRinging && !callEnded && (
          <Text style={styles.ringingHint}>Chờ tài xế bắt máy...</Text>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {/* Mute button – only active when in call */}
        <TouchableOpacity
          style={[
            styles.controlBtn,
            isMuted && styles.controlBtnActive,
            isRinging && styles.controlBtnDisabled,
          ]}
          onPress={toggleMute}
          disabled={isRinging}
        >
          <MaterialIcons name={isMuted ? 'mic-off' : 'mic'} size={28} color="#fff" />
          <Text style={styles.controlLabel}>{isMuted ? 'Bật mic' : 'Tắt mic'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.endBtn} onPress={handleEndCall}>
          <MaterialIcons name="call-end" size={36} color="#fff" />
          <Text style={styles.controlLabel}>Kết thúc</Text>
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
    gap: 12,
  },
  avatarCircle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: 'rgba(255, 107, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 0, 0.5)',
    marginBottom: 8,
  },
  callerName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
  },
  status: {
    fontSize: 14,
    color: '#22c55e',
  },
  timer: {
    fontSize: 32,
    fontWeight: '200',
    color: '#fff',
    letterSpacing: 2,
    marginTop: 8,
  },
  ringingHint: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  controlBtn: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1e293b',
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
  },
  controlBtnActive: {
    backgroundColor: '#334155',
  },
  controlBtnDisabled: {
    opacity: 0.4,
  },
  endBtn: {
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    width: 84,
    height: 84,
    borderRadius: 42,
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  controlLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
})
