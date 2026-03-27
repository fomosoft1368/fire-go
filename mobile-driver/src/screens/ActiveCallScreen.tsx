import { useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants'
import type { RootStackParamList } from '../types'

type ActiveCallRouteProp = RouteProp<RootStackParamList, 'ActiveCall'>
type NavProp = NativeStackNavigationProp<RootStackParamList>

export default function ActiveCallScreen() {
  const navigation = useNavigation<NavProp>()
  const route = useRoute<ActiveCallRouteProp>()
  const { callId, channelName, token, uid, otherPartyName } = route.params

  const [isMuted, setIsMuted] = useState(false)
  const [duration, setDuration] = useState(0)
  const [callEnded, setCallEnded] = useState(false)

  const agoraEngineRef = useRef<any>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Duration timer
  useEffect(() => {
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // Initialize Agora
  useEffect(() => {
    let mounted = true

    const initAgora = async () => {
      try {
        const AgoraModule = await import('react-native-agora').catch(() => null)
        if (!AgoraModule || !mounted) return

        const appId = process.env.EXPO_PUBLIC_AGORA_APP_ID
        if (!appId) {
          console.warn('[Driver ActiveCallScreen] EXPO_PUBLIC_AGORA_APP_ID not set')
          return
        }

        const engine = AgoraModule.createAgoraRtcEngine()
        agoraEngineRef.current = engine
        engine.initialize({ appId })
        engine.enableAudio()
        await engine.joinChannel(token, channelName, uid, {})
        console.log('[Driver ActiveCallScreen] Joined Agora channel:', channelName)
      } catch (err) {
        console.error('[Driver ActiveCallScreen] Agora init error:', err)
      }
    }

    initAgora()
    return () => {
      mounted = false
      if (agoraEngineRef.current) {
        agoraEngineRef.current.leaveChannel()
        agoraEngineRef.current.release()
        agoraEngineRef.current = null
      }
    }
  }, [])

  const getToken = async (): Promise<string> => {
    return (await AsyncStorage.getItem('driverToken')) || ''
  }

  const handleEndCall = async () => {
    if (callEnded) return
    setCallEnded(true)

    if (timerRef.current) clearInterval(timerRef.current)

    if (agoraEngineRef.current) {
      try { await agoraEngineRef.current.leaveChannel() } catch (_) {}
    }

    try {
      const authToken = await getToken()
      await fetch(`${API_BASE_URL}/call/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ callId }),
      })
    } catch (err: any) {
      console.error('[Driver ActiveCallScreen] End call error:', err.message)
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
        <View style={styles.avatarCircle}>
          <MaterialIcons name="person" size={60} color="#3b82f6" />
        </View>

        <Text style={styles.callerName}>{otherPartyName || 'Người dùng'}</Text>
        <Text style={styles.status}>{callEnded ? 'Đã kết thúc' : 'Đang gọi'}</Text>
        <Text style={styles.timer}>{formatDuration(duration)}</Text>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.controlBtn, isMuted && styles.controlBtnActive]}
          onPress={toggleMute}
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
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(59, 130, 246, 0.5)',
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
