import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
  Alert,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { API_BASE_URL, AGORA_APP_ID } from '../constants'
import type { RootStackParamList } from '../types'

type ActiveCallRouteProp = RouteProp<RootStackParamList, 'ActiveCall'>
type NavProp = NativeStackNavigationProp<RootStackParamList>

export default function ActiveCallScreen() {
  const navigation = useNavigation<NavProp>()
  const route = useRoute<ActiveCallRouteProp>()
  const { callId, rideId, channelName, token, uid, otherPartyName, role } = route.params
  const authToken = useSelector((state: RootState) => state.auth.token)

  const isCaller = role === 'caller'

  // Caller waits for driver to accept before showing WebView
  const [isRinging, setIsRinging] = useState(isCaller)
  const [statusText, setStatusText] = useState(isCaller ? 'Đang đổ chuông...' : 'Đang kết nối')
  const [callEnded, setCallEnded] = useState(false)
  const [webviewReady, setWebviewReady] = useState(!isCaller) // show immediately for receiver

  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const callEndedRef = useRef(false)
  const pulseAnim = useRef(new Animated.Value(1)).current

  // Pulse animation while ringing
  useEffect(() => {
    if (!isRinging) return
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [isRinging])

  // Caller: poll until driver accepts, then show WebView
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
          if (!callEndedRef.current) {
            callEndedRef.current = true
            setCallEnded(true)
            setStatusText('Cuộc gọi đã kết thúc')
            setTimeout(() => navigation.goBack(), 1500)
          }
          return
        }

        if (callData.status === 'accepted') {
          if (pollRef.current) clearInterval(pollRef.current)
          setIsRinging(false)
          setStatusText('Đang kết nối')
          setWebviewReady(true)
        }
      } catch (_) {}
    }

    poll()
    pollRef.current = setInterval(poll, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [isCaller, isRinging, rideId, authToken])

  // Handle message from WebView
  const onWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data)
      if (msg.type === 'CALL_ENDED') {
        if (!callEndedRef.current) {
          callEndedRef.current = true
          setCallEnded(true)
          navigation.goBack()
        }
      }
    } catch (_) {}
  }, [navigation])

  // Manual end call (if WebView fails to load)
  const handleEmergencyEnd = async () => {
    if (callEndedRef.current) return
    callEndedRef.current = true
    setCallEnded(true)
    try {
      await fetch(`${API_BASE_URL}/call/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ callId }),
      })
    } catch (_) {}
    navigation.goBack()
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // Build WebView URL
  const roomUrl = `${API_BASE_URL}/call/room` +
    `?appId=${encodeURIComponent(AGORA_APP_ID)}` +
    `&channel=${encodeURIComponent(channelName)}` +
    `&token=${encodeURIComponent(token || '')}` +
    `&uid=${uid}` +
    `&callId=${encodeURIComponent(callId)}` +
    `&authToken=${encodeURIComponent(authToken || '')}` +
    `&apiBase=${encodeURIComponent(API_BASE_URL)}` +
    `&otherName=${encodeURIComponent(otherPartyName || 'Người dùng')}`

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Ringing state: show native UI while waiting for driver to accept */}
      {isRinging && !callEnded && (
        <View style={styles.ringingContainer}>
          <Animated.View style={[styles.avatarCircle, { transform: [{ scale: pulseAnim }] }]}>
            <MaterialIcons name="person" size={60} color="#FF6B00" />
          </Animated.View>
          <Text style={styles.callerName}>{otherPartyName || 'Tài xế'}</Text>
          <Text style={styles.status}>{statusText}</Text>
          <Text style={styles.ringingHint}>Chờ tài xế bắt máy...</Text>

          <TouchableOpacity style={styles.endBtnSmall} onPress={handleEmergencyEnd}>
            <MaterialIcons name="call-end" size={32} color="#fff" />
            <Text style={styles.endLabel}>Hủy</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Call ended feedback */}
      {callEnded && (
        <View style={styles.ringingContainer}>
          <Text style={[styles.status, { color: '#ef4444', fontSize: 18 }]}>Đã kết thúc</Text>
        </View>
      )}

      {/* WebView: fullscreen audio room */}
      {webviewReady && !callEnded && (
        <WebView
          style={styles.webview}
          source={{ uri: roomUrl }}
          onMessage={onWebViewMessage}
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback={true}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
          onError={(e) => {
            console.error('[ActiveCallScreen] WebView error:', e.nativeEvent)
            Alert.alert('Lỗi kết nối', 'Không thể tải trang gọi điện. Vui lòng thử lại.')
          }}
        />
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  webview: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  ringingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 40,
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
  ringingHint: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
  },
  endBtnSmall: {
    marginTop: 48,
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  endLabel: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
})
