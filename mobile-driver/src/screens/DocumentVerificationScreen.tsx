import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import { LinearGradient } from 'expo-linear-gradient'
import { useSelector } from 'react-redux'
import { driverService } from '../services/driverService'
import { withTimeout } from '../utils/api'

interface DocumentImage {
  uri: string
  base64: string
}

interface DocumentState {
  idCardFront: DocumentImage | null
  idCardBack: DocumentImage | null
  driverLicense: DocumentImage | null
  vehicleRegistration: DocumentImage | null
  vehiclePlate: DocumentImage | null
  insurance: DocumentImage | null
  facePhoto: DocumentImage | null
}

interface StepConfig {
  id: keyof DocumentState
  title: string
  subtitle: string
  icon: string
  iconColor: string
  iconBg: string
  instruction: string
}

export default function DocumentVerificationScreen({ navigation }: any) {
  const user = useSelector((state: any) => state.auth.user)
  const [currentStep, setCurrentStep] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<string>('not_submitted')

  const [documents, setDocuments] = useState<DocumentState>({
    idCardFront: null,
    idCardBack: null,
    driverLicense: null,
    vehicleRegistration: null,
    vehiclePlate: null,
    insurance: null,
    facePhoto: null,
  })

  const steps: StepConfig[] = [
    {
      id: 'idCardFront',
      title: 'CCCD/CMND mặt trước',
      subtitle: 'Chụp rõ ràng mặt trước của CCCD/CMND',
      icon: 'badge',
      iconColor: '#2196F3',
      iconBg: '#E3F2FD',
      instruction:
        '• Đảm bảo đầy đủ 4 góc của thẻ\n• Ánh sáng đủ, không bị mờ\n• Thông tin rõ ràng, dễ đọc',
    },
    {
      id: 'idCardBack',
      title: 'CCCD/CMND mặt sau',
      subtitle: 'Chụp rõ ràng mặt sau của CCCD/CMND',
      icon: 'badge',
      iconColor: '#2196F3',
      iconBg: '#E3F2FD',
      instruction:
        '• Đảm bảo đầy đủ 4 góc của thẻ\n• Ánh sáng đủ, không bị mờ\n• Thông tin rõ ràng, dễ đọc',
    },
    {
      id: 'driverLicense',
      title: 'Bằng lái xe',
      subtitle: 'Chụp rõ ràng bằng lái xe của bạn',
      icon: 'credit-card',
      iconColor: '#4CAF50',
      iconBg: '#E8F5E9',
      instruction:
        '• Đảm bảo hạng bằng lái hợp lệ\n• Thông tin cá nhân rõ ràng\n• Ngày hết hạn còn hiệu lực',
    },
    {
      id: 'vehicleRegistration',
      title: 'Giấy đăng ký xe',
      subtitle: 'Đăng ký xe cần có tên bạn hoặc người thân',
      icon: 'description',
      iconColor: '#FF9800',
      iconBg: '#FFF3E0',
      instruction:
        '• Đảm bảo thông tin xe rõ ràng\n• Tên chủ xe phải khớp hoặc có giấy ủy quyền\n• Giấy tờ còn hiệu lực',
    },
    {
      id: 'vehiclePlate',
      title: 'Biển số xe',
      subtitle: 'Chụp ảnh biển số xe thực tế',
      icon: 'local-taxi',
      iconColor: '#9C27B0',
      iconBg: '#F3E5F5',
      instruction:
        '• Chụp biển số phía trước xe\n• Biển số rõ ràng, không bị che khuất\n• Biển số phải khớp với đăng ký xe',
    },
    {
      id: 'insurance',
      title: 'Bảo hiểm xe',
      subtitle: 'Bảo hiểm trách nhiệm dân sự bắt buộc',
      icon: 'verified-user',
      iconColor: '#00BCD4',
      iconBg: '#E0F7FA',
      instruction:
        '• Bảo hiểm còn hiệu lực\n• Thông tin xe phải khớp\n• Chụp rõ ngày hết hạn',
    },
    {
      id: 'facePhoto',
      title: 'Ảnh khuôn mặt',
      subtitle: 'Chụp ảnh chân dung để xác thực danh tính',
      icon: 'face',
      iconColor: '#E91E63',
      iconBg: '#FCE4EC',
      instruction:
        '• Chụp ảnh thẳng, không đeo khẩu trang\n• Khuôn mặt chiếm 70% khung hình\n• Ánh sáng đầy đủ, không bị tối',
    },
  ]

  // Fetch existing documents when component mounts
  useEffect(() => {
    const fetchDriverDocuments = async () => {
      const startTime = Date.now()
      console.log('🚀 [DocumentVerification] Bắt đầu tải dữ liệu...')
      
      try {
        setLoading(true)
        const apiStartTime = Date.now()
        const driverData = await withTimeout(
          driverService.getDriverById(user?._id || ''),
          15000, // 15 second timeout
          'Tải tài liệu hết thời gian. Vui lòng thử lại.'
        )
        const apiDuration = Date.now() - apiStartTime
        console.log(`⚡ [DocumentVerification] API phản hồi trong ${apiDuration}ms (${(apiDuration/1000).toFixed(2)}s)`)
        
        if (driverData.verificationStatus) {
          setVerificationStatus(driverData.verificationStatus)
        }

        // Load existing documents
        if (driverData.documents) {
          const loadedDocuments: DocumentState = {
            idCardFront: null,
            idCardBack: null,
            driverLicense: null,
            vehicleRegistration: null,
            vehiclePlate: null,
            insurance: null,
            facePhoto: null,
          }

          Object.keys(driverData.documents).forEach((key) => {
            const doc = driverData.documents[key]
            if (doc && doc.url) {
              loadedDocuments[key as keyof DocumentState] = {
                uri: doc.url,
                base64: doc.url, // Backend stores base64 with data URI
              }
            }
          })

          setDocuments(loadedDocuments)
        }
      
      const totalDuration = Date.now() - startTime
      console.log(`✅ [DocumentVerification] Hoàn tất trong ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`)
    } catch (error) {
      const errorDuration = Date.now() - startTime
      console.error(`❌ [DocumentVerification] Lỗi sau ${errorDuration}ms:`, error)
    } finally {
      setLoading(false)
    }
    }

    fetchDriverDocuments()
  }, [user?._id])

  const currentStepConfig = steps[currentStep]
  const totalSteps = steps.length
  const isLastStep = currentStep === totalSteps - 1
  const currentDocument = documents[currentStepConfig.id]

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert(
        'Cần quyền truy cập',
        'Vui lòng cấp quyền truy cập camera để chụp ảnh giấy tờ.'
      )
      return false
    }
    return true
  }

  const takePhoto = async (documentType: keyof DocumentState) => {
    const hasPermission = await requestCameraPermission()
    if (!hasPermission) return

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0]
        
        // Convert image to base64
        try {
          const base64 = await FileSystem.readAsStringAsync(asset.uri, {
            encoding: 'base64',
          })
          
          setDocuments((prev) => ({
            ...prev,
            [documentType]: {
              uri: asset.uri,
              base64: `data:image/jpeg;base64,${base64}`,
            },
          }))
        } catch (error) {
          console.error('Error converting to base64:', error)
          Alert.alert('Lỗi', 'Không thể xử lý ảnh. Vui lòng thử lại.')
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error)
      Alert.alert('Lỗi', 'Không thể chụp ảnh. Vui lòng thử lại.')
    }
  }

  const removePhoto = (documentType: keyof DocumentState) => {
    Alert.alert('Xác nhận xóa', 'Bạn có chắc chắn muốn xóa ảnh này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: () => {
          setDocuments((prev) => ({
            ...prev,
            [documentType]: null,
          }))
        },
      },
    ])
  }

  const handleNext = () => {
    if (!currentDocument) {
      Alert.alert('Thiếu ảnh', 'Vui lòng chụp ảnh trước khi tiếp tục')
      return
    }

    if (isLastStep) {
      handleSubmit()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    } else {
      navigation.goBack()
    }
  }

  const handleSubmit = async () => {
    Alert.alert('Xác nhận gửi', 'Bạn có chắc chắn muốn gửi tất cả giấy tờ để xác thực?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Gửi',
        onPress: async () => {
          try {
            setUploading(true)

            // Create object with base64 images
            const documentData: any = {}
            Object.entries(documents).forEach(([key, value]) => {
              if (value) {
                documentData[key] = value.base64
              }
            })

            await driverService.uploadDocuments(user?._id || '', documentData)

            // Reload driver data to get updated verification status
            const updatedDriver = await driverService.getDriverById(user?._id || '')
            if (updatedDriver.verificationStatus) {
              setVerificationStatus(updatedDriver.verificationStatus)
            }

            Alert.alert(
              'Thành công',
              'Giấy tờ đã được gửi đi. Vui lòng đợi admin xác thực.',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack(),
                },
              ]
            )
          } catch (error: any) {
            Alert.alert(
              'Lỗi',
              error?.response?.data?.message || 'Không thể gửi giấy tờ. Vui lòng thử lại.'
            )
          } finally {
            setUploading(false)
          }
        },
      },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#FF6B00', '#FF8534']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Xác thực giấy tờ</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Đang tải thông tin...</Text>
        </View>
      ) : (
        <>
          {/* Verification Status Banner */}
          {verificationStatus !== 'not_submitted' && (
            <View
              style={[
                styles.statusBanner,
                verificationStatus === 'approved' && styles.statusBannerApproved,
                verificationStatus === 'rejected' && styles.statusBannerRejected,
                verificationStatus === 'pending' && styles.statusBannerPending,
              ]}
            >
              <MaterialIcons
                name={
                  verificationStatus === 'approved'
                    ? 'check-circle'
                    : verificationStatus === 'rejected'
                    ? 'cancel'
                    : 'pending'
                }
                size={24}
                color={
                  verificationStatus === 'approved'
                    ? '#10B981'
                    : verificationStatus === 'rejected'
                    ? '#EF4444'
                    : '#F59E0B'
                }
              />
              <View style={styles.statusTextContainer}>
                <Text style={styles.statusTitle}>
                  {verificationStatus === 'approved'
                    ? 'Giấy tờ đã được duyệt'
                    : verificationStatus === 'rejected'
                    ? 'Giấy tờ bị từ chối'
                    : 'Đang chờ duyệt'}
                </Text>
                <Text style={styles.statusSubtitle}>
                  {verificationStatus === 'approved'
                    ? 'Tài khoản của bạn đã được xác thực'
                    : verificationStatus === 'rejected'
                    ? 'Vui lòng cập nhật lại giấy tờ'
                    : 'Admin đang xem xét giấy tờ của bạn'}
                </Text>
              </View>
            </View>
          )}

          {/* Progress Indicator */}
          <View style={styles.progressContainer}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>
                Bước {currentStep + 1}/{totalSteps}
              </Text>
              <Text style={styles.progressPercentage}>
                {Math.round(((currentStep + 1) / totalSteps) * 100)}%
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressBarSegment,
                    index <= currentStep && styles.progressBarSegmentActive,
                  ]}
                />
              ))}
            </View>
          </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Step Content */}
        <View style={styles.stepContainer}>
          {/* Step Icon */}
          <View
            style={[styles.stepIconWrapper, { backgroundColor: currentStepConfig.iconBg }]}
          >
            <MaterialIcons
              name={currentStepConfig.icon as any}
              size={48}
              color={currentStepConfig.iconColor}
            />
          </View>

          {/* Step Title */}
          <Text style={styles.stepTitle}>{currentStepConfig.title}</Text>
          <Text style={styles.stepSubtitle}>{currentStepConfig.subtitle}</Text>

          {/* Instruction Card */}
          <View style={styles.instructionCard}>
            <View style={styles.instructionHeader}>
              <MaterialIcons name="lightbulb-outline" size={20} color="#FF6B00" />
              <Text style={styles.instructionHeaderText}>Lưu ý khi chụp</Text>
            </View>
            <Text style={styles.instructionText}>{currentStepConfig.instruction}</Text>
          </View>

          {/* Document Card */}
          <View style={styles.documentCard}>
            {currentDocument ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: currentDocument.uri }} style={styles.previewImage} />
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    style={[styles.imageActionButton, styles.retakeButton]}
                    onPress={() => takePhoto(currentStepConfig.id)}
                    disabled={verificationStatus === 'approved'}
                  >
                    <MaterialIcons name="camera-alt" size={18} color="#2196F3" />
                    <Text style={styles.retakeButtonText}>Chụp lại</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.imageActionButton, styles.deleteButton]}
                    onPress={() => removePhoto(currentStepConfig.id)}
                    disabled={verificationStatus === 'approved'}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#F44336" />
                    <Text style={styles.deleteButtonText}>Xóa</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.captureButton}
                onPress={() => takePhoto(currentStepConfig.id)}
                disabled={verificationStatus === 'approved'}
              >
                <View
                  style={[
                    styles.captureIconContainer,
                    { backgroundColor: currentStepConfig.iconBg },
                  ]}
                >
                  <MaterialIcons
                    name="camera-alt"
                    size={32}
                    color={currentStepConfig.iconColor}
                  />
                </View>
                <Text style={styles.captureButtonText}>Chụp ảnh</Text>
                <Text style={styles.captureButtonSubtext}>Nhấn để mở máy ảnh</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={[styles.navButton, styles.backNavButton]}
          onPress={handleBack}
        >
          <MaterialIcons name="arrow-back" size={20} color="#6B7280" />
          <Text style={styles.backNavButtonText}>
            {currentStep === 0 ? 'Hủy' : 'Quay lại'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.navButton,
            styles.nextNavButton,
            !currentDocument && styles.nextNavButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!currentDocument || uploading || verificationStatus === 'approved'}
        >
          <LinearGradient
            colors={
              currentDocument && !uploading && verificationStatus !== 'approved'
                ? ['#FF6B00', '#FF8534']
                : ['#E0E0E0', '#BDBDBD']
            }
            style={styles.nextNavButtonGradient}
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Text style={styles.nextNavButtonText}>
                  {isLastStep ? 'Gửi giấy tờ' : 'Tiếp theo'}
                </Text>
                <MaterialIcons
                  name={isLastStep ? 'check' : 'arrow-forward'}
                  size={20}
                  color="#FFF"
                />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
        </>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B7280',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statusBannerApproved: {
    backgroundColor: '#ECFDF5',
  },
  statusBannerRejected: {
    backgroundColor: '#FEF2F2',
  },
  statusBannerPending: {
    backgroundColor: '#FFFBEB',
  },
  statusTextContainer: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  statusSubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF6B00',
  },
  progressBarContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  progressBarSegment: {
    flex: 1,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
  },
  progressBarSegmentActive: {
    backgroundColor: '#FF6B00',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  stepContainer: {
    padding: 20,
  },
  stepIconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  instructionCard: {
    backgroundColor: '#FFF5F0',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FFE5D9',
  },
  instructionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  instructionHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  instructionText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  documentCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
    minHeight: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  captureButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 8,
  },
  captureButtonSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  imagePreviewContainer: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 240,
    borderRadius: 16,
    resizeMode: 'cover',
  },
  imageActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  imageActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  retakeButton: {
    backgroundColor: '#E3F2FD',
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
  },
  deleteButton: {
    backgroundColor: '#FFEBEE',
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F44336',
  },
  bottomNavigation: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    gap: 12,
  },
  navButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  backNavButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  backNavButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  nextNavButton: {
    flex: 2,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextNavButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  nextNavButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  nextNavButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
})
