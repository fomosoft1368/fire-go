import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING, BORDER_RADIUS } from '../constants'

interface Message {
  id: string
  text: string
  sender: 'user' | 'driver'
  timestamp: number
}

interface ChatScreenProps {
  driver: {
    id: string
    name: string
    avatar: string
    rating: number
    totalRides: number
    carType: string
    licensePlate: string
    carColor: string
    distance: number
    eta: number
    currentLat: number
    currentLng: number
  }
  onClose: () => void
}

export default function ChatScreen({ driver, onClose }: ChatScreenProps) {
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Xin chào, tôi đang trên đường đến bạn',
      sender: 'driver',
      timestamp: Date.now() - 5000,
    },
  ])
  const [messageInput, setMessageInput] = useState('')

  // Send message
  const sendMessage = () => {
    if (!messageInput.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageInput,
      sender: 'user',
      timestamp: Date.now(),
    }

    setChatMessages([...chatMessages, newMessage])
    setMessageInput('')

    // Simulate driver reply after 1 second
    setTimeout(() => {
      const driverReply: Message = {
        id: (Date.now() + 1).toString(),
        text: 'OK, tôi sẽ đến sớm hơn!',
        sender: 'driver',
        timestamp: Date.now(),
      }
      setChatMessages((prev) => [...prev, driverReply])
    }, 1000)
  }

  return (
    <View style={styles.chatContainer}>
      {/* Chat Header */}
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onClose}>
          <MaterialIcons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.chatHeaderInfo}>
          <Text style={styles.chatHeaderName}>{driver.name}</Text>
          <Text style={styles.chatHeaderStatus}>Đang giao dịch</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      {/* Messages */}
      <ScrollView 
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {chatMessages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.sender === 'user' ? styles.userMessage : styles.driverMessage,
            ]}
          >
            <Text style={styles.messageText}>{msg.text}</Text>
          </View>
        ))}
      </ScrollView>

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
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={!messageInput.trim()}
        >
          <MaterialIcons name="send" size={20} color="#fff" />
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
  messagesContainer: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
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
})
