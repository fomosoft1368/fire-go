import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  AlertIOS,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useNavigation, useRoute } from '@react-navigation/native'
import { hourlyServiceService } from '../services/hourlyServiceService'

interface ServiceData {
  _id: string
  customerId: string
  workerName: string
  workerAvatar?: string
  workerRating?: number
  serviceName: string
  hours: number
  estimatedPrice: number
  address: string
  selectedDate: number
  selectedTime: string
  services: Array<{ name: string; price: number; selected: boolean }>
}

interface RatingData {
  rating: number
  comment: string
}

export default function ServiceRatingScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const { serviceId, service } = route.params as { serviceId: string; service?: ServiceData }

  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const selectedAddon = service?.services.filter((s: any) => s.selected) || []
  const totalPrice = service?.estimatedPrice || 0

  const handleSubmitRating = async () => {
    if (rating === 0) {
      const message = 'Vui lòng chọn số sao để đánh giá'
      if (AlertIOS) {
        AlertIOS.alert('Thông báo', message)
      } else {
        Alert.alert('Thông báo', message)
      }
      return
    }

    try {
      setSubmitting(true)

      // Call API to submit rating
      const ratingData: RatingData = {
        rating,
        comment: comment.trim(),
      }

      const response = await hourlyServiceService.rateService(serviceId, ratingData)

      if (response.success) {
        setSubmitted(true)
        const message = 'Cảm ơn bạn đã đánh giá! Chúng tôi sẽ tiếp tục cải thiện dịch vụ.'
        if (AlertIOS) {
          AlertIOS.alert('Thành công', message, [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home' as never),
            },
          ])
        } else {
          Alert.alert('Thành công', message, [
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home' as never),
            },
          ])
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Không thể gửi đánh giá. Vui lòng thử lại.'
      if (AlertIOS) {
        AlertIOS.alert('Lỗi', errorMessage)
      } else {
        Alert.alert('Lỗi', errorMessage)
      }
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Đánh giá dịch vụ</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Completion Badge */}
        <View style={styles.completionSection}>
          <View style={styles.completionIcon}>
            <MaterialIcons name="check-circle" size={48} color="#34d399" />
          </View>
          <Text style={styles.completionTitle}>Dịch vụ đã hoàn thành!</Text>
          <Text style={styles.completionSubtext}>
            Hãy đánh giá trải nghiệm của bạn
          </Text>
        </View>

        {/* Worker Card */}
        {service && (
          <View style={styles.workerCard}>
            <Image
              source={{
                uri: service.workerAvatar || 'https://via.placeholder.com/80x80?text=Worker',
              }}
              style={styles.workerAvatar}
            />
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{service.workerName || 'Nhân viên'}</Text>
              <View style={styles.currentRating}>
                <MaterialIcons name="star" size={14} color="#fbbf24" />
                <Text style={styles.currentRatingText}>
                  {service.workerRating || 4.5} sao
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Rating Section */}
        <View style={styles.ratingSection}>
          <Text style={styles.ratingLabel}>Bạn cảm thấy thế nào về dịch vụ?</Text>

          {/* Star Rating */}
          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                onPressIn={() => setHoveredRating(star)}
                onPressOut={() => setHoveredRating(0)}
                style={styles.starButton}
              >
                <MaterialIcons
                  name={
                    star <= (hoveredRating || rating) ? 'star' : 'star-outline'
                  }
                  size={48}
                  color={
                    star <= (hoveredRating || rating)
                      ? '#fbbf24'
                      : '#cbd5e1'
                  }
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Rating Label */}
          {rating > 0 && (
            <View style={styles.ratingLabelContainer}>
              <Text style={styles.ratingLabelText}>
                {rating === 1
                  ? 'Không hài lòng'
                  : rating === 2
                    ? 'Bình thường'
                    : rating === 3
                      ? 'Tốt'
                      : rating === 4
                        ? 'Rất tốt'
                        : 'Xuất sắc!'}
              </Text>
            </View>
          )}
        </View>

        {/* Comment Section */}
        <View style={styles.commentSection}>
          <Text style={styles.commentLabel}>
            Bình luận (Tùy chọn)
          </Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Chia sẻ trải nghiệm của bạn..."
            placeholderTextColor="#cbd5e1"
            multiline
            numberOfLines={4}
            maxLength={500}
            value={comment}
            onChangeText={setComment}
            editable={!submitting}
          />
          <Text style={styles.commentCount}>
            {comment.length}/500
          </Text>
        </View>

        {/* Service Summary */}
        {service && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Tóm tắt dịch vụ</Text>

            {/* Service Details */}
            <View style={styles.summaryItem}>
              <MaterialIcons name="home-work" size={18} color="#16a34a" />
              <View style={styles.summaryItemContent}>
                <Text style={styles.summaryItemLabel}>{service.serviceName}</Text>
                <Text style={styles.summaryItemSubtext}>
                  {service.hours} giờ • {service.address}
                </Text>
              </View>
              <Text style={styles.summaryItemPrice}>
                {(service.hours * 250000).toLocaleString('vi-VN')}đ
              </Text>
            </View>

            {/* Add-ons */}
            {selectedAddon.length > 0 && (
              <View style={styles.addonsContainer}>
                {selectedAddon.map((addon: any, index: number) => (
                  <View key={index} style={styles.addonItem}>
                    <MaterialIcons name="add-circle-outline" size={16} color="#94a3b8" />
                    <View style={styles.addonContent}>
                      <Text style={styles.addonName}>{addon.name}</Text>
                    </View>
                    <Text style={styles.addonPrice}>
                      +{addon.price.toLocaleString('vi-VN')}đ
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Total */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Tổng cộng</Text>
              <Text style={styles.totalPrice}>
                {totalPrice.toLocaleString('vi-VN')}đ
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom Button */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            rating === 0 && styles.submitButtonDisabled,
            submitting && styles.submitButtonLoading,
          ]}
          onPress={handleSubmitRating}
          disabled={submitting || rating === 0}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialIcons name="thumb-up" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>
                Gửi đánh giá
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Skip Button */}
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.goBack()}
          disabled={submitting}
        >
          <Text style={styles.skipButtonText}>Bỏ qua</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  completionSection: {
    alignItems: 'center',
    marginBottom: 28,
    paddingVertical: 20,
  },
  completionIcon: {
    marginBottom: 16,
  },
  completionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  completionSubtext: {
    fontSize: 14,
    color: '#64748b',
  },
  workerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  workerAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  workerInfo: {
    flex: 1,
  },
  workerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  currentRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  currentRatingText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 4,
  },
  ratingSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  ratingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 20,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  starButton: {
    marginHorizontal: 4,
    padding: 8,
  },
  ratingLabelContainer: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  ratingLabelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1890ff',
  },
  commentSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  commentInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: 'top',
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  commentCount: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'right',
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  summaryItemLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0f172a',
  },
  summaryItemSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  summaryItemPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1890ff',
  },
  addonsContainer: {
    marginTop: 8,
  },
  addonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  addonContent: {
    flex: 1,
    marginLeft: 12,
  },
  addonName: {
    fontSize: 13,
    color: '#64748b',
  },
  addonPrice: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1890ff',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1890ff',
  },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitButton: {
    backgroundColor: '#1890ff',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  submitButtonDisabled: {
    backgroundColor: '#cbd5e1',
    opacity: 0.6,
  },
  submitButtonLoading: {
    opacity: 0.8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  skipButton: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
})
