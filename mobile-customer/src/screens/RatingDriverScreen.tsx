import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { SPACING } from '../constants'

interface RatingDriverScreenProps {
  navigation: any
  route: any
}

export default function RatingDriverScreen({ navigation, route }: RatingDriverScreenProps) {
  const { rideId, driver, tripType = 'ride' } = route?.params || {} // tripType: 'ride' or 'combined'
  
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  const tags = [
    { id: 'friendly', label: 'Thân thiện', icon: '😊' },
    { id: 'safe', label: 'An toàn', icon: '🛡️' },
    { id: 'clean', label: 'Sạch sẽ', icon: '✨' },
    { id: 'ontime', label: 'Đúng giờ', icon: '⏰' },
    { id: 'professional', label: 'Chuyên nghiệp', icon: '👔' },
    { id: 'helpful', label: 'Nhiệt tình', icon: '🤝' },
  ]

  const toggleTag = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(selectedTags.filter(t => t !== tagId))
    } else {
      setSelectedTags([...selectedTags, tagId])
    }
  }

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Thông báo', 'Vui lòng chọn số sao đánh giá')
      return
    }

    setSubmitting(true)
    try {
      console.log('🔍 [Rating] Submitting rating:', { rideId, tripType })
      const AsyncStorage = require('@react-native-async-storage/async-storage').default
      const token = await AsyncStorage.getItem('authToken') // ✅ Fix: Use correct key 'authToken'
      
      if (!token) {
        throw new Error('Không tìm thấy token xác thực. Vui lòng đăng nhập lại.')
      }
      
      const API_URL = 'http://192.168.1.16:3000/api'
      
      // ✅ Use different endpoint based on trip type
      const endpoint = tripType === 'combined' 
        ? `${API_URL}/combined-trips/${rideId}/rate`
        : `${API_URL}/rides/${rideId}/rate`
      
      console.log('🔍 [Rating] API URL:', endpoint)
      console.log('🔍 [Rating] Token exists:', !!token)
      
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating,
          comment,
          tags: selectedTags,
        }),
      })

      console.log('🔍 [Rating] Response status:', response.status)
      const responseData = await response.json()
      console.log('🔍 [Rating] Response data:', responseData)

      if (!response.ok) {
        throw new Error(responseData.message || 'Không thể gửi đánh giá')
      }

      console.log('✅ [Rating] Success! Navigating to Home...')
      
      // Navigate back to Main (tab navigator) which contains Home tab
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    } catch (error: any) {
      console.error('❌ [Rating] Error submitting rating:', error.message)
      Alert.alert('Lỗi', error.message || 'Không thể gửi đánh giá')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    })
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <MaterialIcons name="close" size={24} color="#9CA3AF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá tài xế</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 20}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            {/* Success Icon */}
            <View style={styles.successIcon}>
          <MaterialIcons name="check-circle" size={80} color="#22C55E" />
        </View>

        <Text style={styles.completeTitle}>Hoàn thành chuyến đi!</Text>
        <Text style={styles.completeSubtitle}>
          Cảm ơn bạn đã sử dụng dịch vụ
        </Text>

        {/* Driver Info */}
        <View style={styles.driverCard}>
          <Image
            source={{ uri: driver?.avatar || 'https://i.pravatar.cc/150?u=driver' }}
            style={styles.driverAvatar}
          />
          <Text style={styles.driverName}>
            {driver?.name || 'Tài xế'}
          </Text>
          <Text style={styles.carInfo}>
            {driver?.carType || 'Toyota Vios'} • {driver?.licensePlate || '29A-123.45'}
          </Text>
        </View>

        {/* Rating Stars */}
        <Text style={styles.sectionTitle}>Đánh giá chuyến đi</Text>
        <View style={styles.starsContainer}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <MaterialIcons
                name={star <= rating ? 'star' : 'star-border'}
                size={48}
                color={star <= rating ? '#FFB800' : '#4B5563'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Rating Text */}
        {rating > 0 && (
          <Text style={styles.ratingText}>
            {rating === 5 && 'Tuyệt vời! 🌟'}
            {rating === 4 && 'Rất tốt! 👍'}
            {rating === 3 && 'Tốt 😊'}
            {rating === 2 && 'Bình thường 😐'}
            {rating === 1 && 'Cần cải thiện 😔'}
          </Text>
        )}

        {/* Tags */}
        {rating > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {rating >= 4 ? 'Điều bạn thích' : 'Vấn đề gặp phải'}
            </Text>
            <View style={styles.tagsContainer}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  onPress={() => toggleTag(tag.id)}
                  style={[
                    styles.tag,
                    selectedTags.includes(tag.id) && styles.tagSelected,
                  ]}
                >
                  <Text style={styles.tagIcon}>{tag.icon}</Text>
                  <Text
                    style={[
                      styles.tagLabel,
                      selectedTags.includes(tag.id) && styles.tagLabelSelected,
                    ]}
                  >
                    {tag.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Comment */}
        {rating > 0 && (
          <>
            <Text style={styles.sectionTitle}>Nhận xét (tùy chọn)</Text>
            <TextInput
              style={styles.commentInput}
              placeholder="Chia sẻ trải nghiệm của bạn..."
              placeholderTextColor="#6B7280"
              multiline
              numberOfLines={4}
              value={comment}
              onChangeText={setComment}
              textAlignVertical="top"
            />
          </>
        )}
      </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={rating === 0 || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.submitButtonText}>Gửi đánh giá</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Bỏ qua</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
  },
  successIcon: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16,
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  completeSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 24,
  },
  driverCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  driverAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  driverName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  carInfo: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
    marginTop: 8,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB800',
    textAlign: 'center',
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  tagSelected: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  tagIcon: {
    fontSize: 16,
  },
  tagLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  tagLabelSelected: {
    color: '#fff',
  },
  commentInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 100,
    marginBottom: 16,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: 12,
  },
  submitButton: {
    backgroundColor: '#FF6B00',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  skipButton: {
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9CA3AF',
  },
})
