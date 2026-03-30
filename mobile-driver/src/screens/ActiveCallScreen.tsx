import { useEffect, useRef, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL, AGORA_APP_ID } from '../constants'
import type { RootStackParamList } from '../types'

type ActiveCallRouteProp = RouteProp<RootStackParamList, 'ActiveCall'>
type NavProp = NativeStackNavigationProp<RootStackParamList>

export default function ActiveCallScreen() {
  const navigation = useNavigation<NavProp>()
  const route = useRoute<ActiveCallRouteProp>()
  const { callId, channelName, token, uid, otherPartyName } = route.params

  const [authToken, setAuthToken] = useState<string>('')
  const [callEnded, setCallEnded] = useState(false)

  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const callEndedRef = useRef(false)

  // Load auth token once
  useEffect(() => {
    AsyncStorage.getItem('token').then((t) => setAuthToken(t || ''))
  }, [])

  // Poll for CALL_ENDED notification (fallback if WebView postMessage fails)
  useEffect(() => {
    if (!authToken) return

    const pollEnded = async () => {
      if (callEndedRef.current) return
      try {
        const res = await fetch(
          `${API_BASE_URL}/notifications/driver?type=call_ended&limit=5`,
          { headers: { Authorization: `Bearer ${authToken}` } }
        )
        if (!res.ok) return
        const json = await res.json()
        const notifications: any[] = Array.isArray(json?.data) ? json.data
          : Array.isArray(json?.notifications) ? json.notifications
          : []

        const ended = notifications.find(
          (n) => !n.isRead && n.data?.type === 'CALL_ENDED' && n.data?.callId === callId
        )

        if (ended && !callEndedRef.current) {
          callEndedRef.current = true
          setCallEnded(true)
          // Mark as read
          try {
            await fetch(`${API_BASE_URL}/notifications/${ended._id}/read`, {
              method: 'PATCH', headers: { Authorization: `Bearer ${authToken}` }
            })
          } catch (_) {}
          setTimeout(() => navigation.goBack(), 1500)
        }
      } catch (_) {}
    }

    pollRef.current = setInterval(pollEnded, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [authToken, callId])

  // Cleanup
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  // Handle message from WebView  
  const onWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data)
      if (msg.type === 'CALL_ENDED') {
        if (!callEndedRef.current) {
          callEndedRef.current = true
          if (pollRef.current) clearInterval(pollRef.current)
          navigation.goBack()
        }
      }
    } catch (_) {}
  }, [navigation])

  // Emergency end call if WebView fails
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

  // Build WebView URL (only when we have the auth token)
  const roomUrl = authToken
    ? `${API_BASE_URL}/call/room` +
      `?appId=${encodeURIComponent(AGORA_APP_ID)}` +
      `&channel=${encodeURIComponent(channelName)}` +
      `&token=${encodeURIComponent(token || '')}` +
      `&uid=${uid}` +
      `&callId=${encodeURIComponent(callId)}` +
      `&authToken=${encodeURIComponent(authToken)}` +
      `&apiBase=${encodeURIComponent(API_BASE_URL)}` +
      `&otherName=${encodeURIComponent(otherPartyName || 'Khách hàng')}`
    : null

  if (callEnded) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={[styles.status, { color: '#ef4444', fontSize: 18 }]}>Đã kết thúc</Text>
        </View>
      </SafeAreaView>
    )
  }

  // Show loading until authToken ready
  if (!roomUrl) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.center}>
          <Text style={styles.status}>Đang chuẩn bị...</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* WebView takes full screen */}
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
          console.error('[Driver ActiveCallScreen] WebView error:', e.nativeEvent)
          Alert.alert(
            'Lỗi kết nối',
            'Không thể tải trang gọi điện.',
            [{ text: 'Kết thúc', onPress: handleEmergencyEnd }]
          )
        }}
      />
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    fontSize: 14,
    color: '#22c55e',
  },
})
