import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS } from '../constants'
import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types'

interface Message {
  _id: string
  text: string
  sender: 'user' | 'driver'
  timestamp: number
  createdAt?: string
}

type Props = NativeStackScreenProps<RootStackParamList, 'ChatScreen'>

export default function ChatScreen({ route, navigation }: Props) {
  const { customer, rideId, deliveryId } = route.params
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [messageInput, setMessageInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [lastPollTime, setLastPollTime] = useState(Date.now())
  const sendingRef = useRef(false) // Prevent multiple sends

  const tripId = rideId || deliveryId
  const tripType = rideId ? 'ride' : 'delivery'

  // Load messages khi component mount
  useEffect(() => {
    if (!tripId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID chuyến đi')
      return
    }

    loadMessages()

    // Poll tin nhắn mới mỗi 5 giây
    const pollInterval = setInterval(() => {
      pollNewMessages()
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [tripId])

  // Tải tin nhắn ban đầu
  const loadMessages = async () => {
    if (!tripId) {
      Alert.alert('Lỗi', 'Không tìm thấy ID chuyến đi')
      return
    }

    setLoading(true)
    try {
      console.log('[ChatScreen] Loading messages for', tripType, ':', tripId)
      
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để xem tin nhắn')
        return
      }

      const response = await axios.get(
        `${API_BASE_URL}/messages/${tripType}/${tripId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            limit: 50,
            skip: 0,
          },
        }
      )

      const data = response.data?.data
      
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
        const markToken = await AsyncStorage.getItem('token')
        await axios.post(
          `${API_BASE_URL}/messages/${tripType}/${tripId}/mark-as-read`,
          {},
          {
            headers: {
              Authorization: `Bearer ${markToken}`,
            },
          }
        )
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
    if (!tripId) return

    try {
      const token = await AsyncStorage.getItem('token')
      if (!token) return

      const response = await axios.get(
        `${API_BASE_URL}/messages/${tripType}/${tripId}/new`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          params: {
            since: lastPollTime,
          },
        }
      )

      const newMessages = response.data?.data?.messages || []

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
          const markToken = await AsyncStorage.getItem('token')
          await axios.post(
            `${API_BASE_URL}/messages/${tripType}/${tripId}/mark-as-read`,
            {},
            {
              headers: {
                Authorization: `Bearer ${markToken}`,
              },
            }
          )
        } catch (markError) {
          console.warn('[ChatScreen] Mark as read failed:', markError)
        }
      }
    } catch (error: any) {
      // Handle 401 gracefully
      if (error.response?.status !== 401) {
        console.warn('[ChatScreen] Poll error:', {
          message: error.message,
          tripId,
          tripType,
          status: error.response?.status,
        })
      }
    }
  }

  // Gửi tin nhắn
  const sendMessage = useCallback(async () => {
    // Prevent multiple sends
    if (sendingRef.current || !messageInput.trim() || !tripId) {
      return
    }

    sendingRef.current = true
    setSending(true)
    
    try {
      console.log('[ChatScreen] Sending message:', messageInput)
      
      const token = await AsyncStorage.getItem('token')
      if (!token) {
        Alert.alert('Lỗi', 'Bạn cần đăng nhập để gửi tin nhắn')
        sendingRef.current = false
        setSending(false)
        return
      }

      const response = await axios.post(
        `${API_BASE_URL}/messages`,
        {
          ...(rideId ? { rideId } : { deliveryId }),
          text: messageInput,
          senderType: 'driver',
          type: 'text',
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const message = response.data?.data

      const newMessage: Message = {
        _id: message._id,
        text: message.text,
        sender: 'driver',
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
        tripId,
        tripType,
      })
      Alert.alert(
        'Lỗi',
        error.response?.data?.message || error.message || 'Không thể gửi tin nhắn'
      )
    } finally {
      sendingRef.current = false
      setSending(false)
    }
  }, [messageInput, tripId, rideId, deliveryId])

  return (
    <View style={styles.chatContainer}>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{customer.name}</Text>
          <Text style={styles.chatHeaderStatus}>Khách hàng</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

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
                  msg.sender === 'driver'
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
    </View>
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
})
