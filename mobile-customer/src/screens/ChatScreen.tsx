import { useState, useEffect, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '../redux/store'
import { messageService } from '../services/messageService'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS, API_BASE_URL } from '../constants'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../types'

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'ChatScreen'>
type ChatScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ChatScreen'>

interface Message {
  _id: string
  text: string
  sender: 'user' | 'driver'
  timestamp: number
  createdAt?: string
}

export default function ChatScreen() {
  const navigation = useNavigation<ChatScreenNavigationProp>()
  const route = useRoute<ChatScreenRouteProp>()
  const { driver, rideId, deliveryId, combinedTripId } = route.params || {}
  const user = useSelector((state: RootState) => state.auth.user)
  const authToken = useSelector((state: RootState) => state.auth.token)
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [calling, setCalling] = useState(false)
  const [lastPollTime, setLastPollTime] = useState(Date.now())
  const sendingRef = useRef(false) // Prevent multiple sends

  // Load messages khi component mount
  useEffect(() => {
    const tripId = rideId || deliveryId || combinedTripId
    if (!tripId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID chuyến đi')
      navigation.goBack()
      return
    }

    loadMessages()

    // Poll tin nhắn mới mỗi 5 giây
    const pollInterval = setInterval(() => {
      pollNewMessages()
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [rideId, deliveryId, combinedTripId])

  // Tải tin nhắn ban đầu
  const loadMessages = async () => {
    const tripId = rideId || deliveryId || combinedTripId
    const tripType = rideId ? 'ride' : deliveryId ? 'delivery' :  'combinedtrip'
    if (!tripId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID chuyến đi')
      return
    }

    setLoading(true)
    try {
      console.log('[ChatScreen] Loading messages for tripId:', tripId, 'type:', tripType)
      
      const data = await messageService.getMessagesByTrip(tripId, tripType, 50, 0)
      
      if (!data || !data.messages) {
        console.warn('[ChatScreen] No data returned from API')
        setChatMessages([])
        setLastPollTime(Date.now())
        return
      }

      const messages = data.messages.map((msg: any) => ({
        _id: msg._id,
        text: msg.text,
        sender: msg.senderType === 'customer' ? 'user' : 'driver',
        timestamp: new Date(msg.createdAt).getTime(),
        createdAt: msg.createdAt,
      }))

      console.log('[ChatScreen] Loaded messages:', messages.length)
      setChatMessages(messages)
      setLastPollTime(Date.now())

      // Đánh dấu tin nhắn là đã đọc
      try {
        await messageService.markAsRead(tripId, tripType)
      } catch (markError) {
        console.warn('[ChatScreen] Mark as read failed:', markError)
      }
    } catch (error: any) {
      console.error('[ChatScreen] Load messages error:', {
        message: error.message,
        response: error.response?.data,
      })
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || error.message || 'Không thể tải tin nhắn'
      )
    } finally {
      setLoading(false)
    }
  }

  // Poll tin nhắn mới
  const pollNewMessages = async () => {
    const tripId = rideId || deliveryId || combinedTripId
    const tripType = rideId ? 'ride' : deliveryId ? 'delivery' : 'combinedtrip'
    if (!tripId) return

    try {
      const newMessages = await messageService.getNewMessages(
        tripId,
        tripType,
        lastPollTime
      )

      if (newMessages && newMessages.length > 0) {
        console.log('[ChatScreen] Polling received:', newMessages.length, 'new messages')
        const formattedMessages = newMessages.map((msg: any) => ({
          _id: msg._id,
          text: msg.text,
          sender: msg.senderType === 'customer' ? 'user' : 'driver',
          timestamp: new Date(msg.createdAt).getTime(),
          createdAt: msg.createdAt,
        }))

        // Deduplication: only add messages that don't already exist
        setChatMessages((prev) => {
          const existingIds = new Set(prev.map(m => m._id))
          const uniqueNewMessages = formattedMessages.filter(msg => !existingIds.has(msg._id))
          if (uniqueNewMessages.length > 0) {
            console.log('[ChatScreen] Adding', uniqueNewMessages.length, 'unique new messages')
            return [...prev, ...uniqueNewMessages]
          }
          return prev
        })
        setLastPollTime(Date.now())

        // Đánh dấu tin nhắn mới là đã đọc
        try {
          await messageService.markAsRead(tripId, tripType)
        } catch (markError) {
          console.warn('[ChatScreen] Mark as read failed:', markError)
        }
      }
    } catch (error: any) {
      console.warn('[ChatScreen] Poll error:', {
        message: error.message,
        rideId,
        deliveryId,
        combinedTripId,
        status: error.response?.status,
      })
      // Tiếp tục polling ngay cả khi lỗi, không throw
    }
  }

  // Gọi điện thoại cho tài xế
  const handleVoiceCall = useCallback(async () => {
    const tripId = rideId || deliveryId || combinedTripId
    if (!tripId || !driver?.id || calling) return

    setCalling(true)
    try {
      const response = await fetch(`${API_BASE_URL}/call/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          rideId: tripId,
          callerRole: 'customer',
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err?.message || 'Không thể kết nối cuộc gọi')
      }

      const data = await response.json()
      const callData = data?.data || data

      navigation.navigate('ActiveCall', {
        callId: callData.callId,
        rideId: tripId,
        channelName: callData.channelName,
        token: callData.callerToken,
        uid: callData.callerUid,
        otherPartyName: driver?.name || 'Tài xế',
        role: 'caller',
      })
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể thực hiện cuộc gọi')
    } finally {
      setCalling(false)
    }
  }, [rideId, deliveryId, combinedTripId, driver, calling])

  // Gửi tin nhắn
  const sendMessage = useCallback(async () => {
    const tripId = rideId || deliveryId || combinedTripId
    const tripType = rideId ? 'ride' : deliveryId ? 'delivery' : 'combinedtrip'
    // Prevent multiple sends
    if (sendingRef.current || !messageInput.trim() || !tripId || !user) {
      return
    }

    sendingRef.current = true
    setSending(true)
    
    try {
      console.log('[ChatScreen] Sending message:', messageInput)
      
      const message = await messageService.sendMessage(
        tripId,
        messageInput,
        'customer',
        tripType
      )

      const newMessage: Message = {
        _id: message._id,
        text: message.text,
        sender: 'user',
        timestamp: new Date(message.createdAt).getTime(),
        createdAt: message.createdAt,
      }

      setChatMessages((prev) => [...prev, newMessage])
      setMessageInput('')

      console.log('[ChatScreen] Message sent successfully:', message._id)
    } catch (error: any) {
      console.error('[ChatScreen] Send message error:', {
        message: error.message,
        response: error.response?.data,
        rideId,
      })
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || error.message || 'Không thể gửi tin nhắn'
      )
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }, [messageInput, rideId, deliveryId, combinedTripId, user])

  return (
    <SafeAreaView style={styles.chatContainer}>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{driver?.name || 'Tài xế'}</Text>
          <Text style={styles.chatHeaderStatus}>Đang hoạt động</Text>
        </View>
        <TouchableOpacity
          onPress={handleVoiceCall}
          disabled={calling}
          style={styles.callButton}
        >
          {calling ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="call" size={22} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        {/* Messages */}
        {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : (
        <ScrollView
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        >
          {chatMessages.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="chat-bubble-outline" size={48} color="#64748b" />
              <Text style={styles.emptyText}>Bắt đầu cuộc trò chuyện</Text>
            </View>
          ) : (
            chatMessages.map((msg) => (
              <View
                key={msg._id}
                style={[
                  styles.messageBubble,
                  msg.sender === 'user'
                    ? styles.userMessage
                    : styles.driverMessage,
                ]}
              >
                <Text style={styles.messageText}>{msg.text}</Text>
                <Text style={styles.messageTime}>
                  {new Date(msg.timestamp).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Message Input */}
      <View style={styles.chatInputContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder="Nhập tin nhắn..."
          placeholderTextColor="#64748b"
          value={messageInput}
          onChangeText={setMessageInput}
          multiline
          maxLength={500}
          editable={!sending}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            (sending || !messageInput.trim()) && styles.sendButtonDisabled,
          ]}
          onPress={sendMessage}
          disabled={sending || !messageInput.trim()}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <MaterialIcons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  chatContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    gap: SPACING.md,
    marginTop: 35,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  chatHeaderStatus: {
    fontSize: 12,
    color: '#94a3b8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: SPACING.md,
    borderRadius: 12,
    marginBottom: SPACING.md,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#FF6B00',
  },
  driverMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#1a202c',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  messageText: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 4,
  },
  messageTime: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  chatInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    backgroundColor: '#1a202c',
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: '#fff',
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FF6B00',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  sendButtonDisabled: {
    backgroundColor: '#64748b',
    shadowOpacity: 0,
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
})
