import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  SafeAreaView,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { withTimeout } from '../utils/api'
import { LinearGradient } from 'expo-linear-gradient'
import { useSelector } from 'react-redux'
import { driverService } from '../services/driverService'

interface VehicleInfo {
  vehicleLicense?: string
  vehicleModel?: string
  vehicleColor?: string
  vehiclePlate?: string
  vehicleImage?: string
  vehicleRegistration?: string
  insuranceProvider?: string
  insuranceExpiry?: string
  insuranceCertificate?: string
}

export default function VehicleInfoScreen({ navigation }: any) {
  const user = useSelector((state: any) => state.auth.user)
  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Advanced Animation values for realistic car movement
  const carMove = useRef(new Animated.Value(-100)).current
  const carBounce = useRef(new Animated.Value(0)).current
  const wheelRotate = useRef(new Animated.Value(0)).current
  const roadMove = useRef(new Animated.Value(0)).current
  const smokeOpacity1 = useRef(new Animated.Value(0)).current
  const smokeOpacity2 = useRef(new Animated.Value(0)).current
  const smokeOpacity3 = useRef(new Animated.Value(0)).current
  const smokeScale = useRef(new Animated.Value(0.5)).current
  const shadowScale = useRef(new Animated.Value(1)).current

  useEffect(() => {
    fetchVehicleInfo()
    const animations = startCarAnimation()
    
    // Cleanup: Stop all animations when component unmounts
    return () => {
      console.log('🛑 [VehicleInfo] Stopping animations...')
      animations.forEach(anim => anim.stop())
    }
  }, [])

  const fetchVehicleInfo = async () => {
    const startTime = Date.now()
    console.log('🚀 [VehicleInfo] Bắt đầu tải dữ liệu...')
    
    try {
      setLoading(true)
      setError(null) // Clear previous error
      const apiStartTime = Date.now()
      const driverData = await withTimeout(
        driverService.getDriverById(user?._id || ''),
        15000, // 15 second timeout
        'Tải thông tin xe hết thời gian. Vui lòng thử lại.'
      )
      const apiDuration = Date.now() - apiStartTime
      console.log(`⚡ [VehicleInfo] API phản hồi trong ${apiDuration}ms (${(apiDuration/1000).toFixed(2)}s)`)
      
      setVehicleInfo({
        vehicleLicense: driverData.vehicleLicense,
        vehicleModel: driverData.vehicleModel,
        vehicleColor: driverData.vehicleColor,
        vehiclePlate: driverData.vehiclePlate,
        vehicleImage: driverData.vehicleImage,
        vehicleRegistration: driverData.vehicleRegistration,
        insuranceProvider: driverData.insuranceProvider,
        insuranceExpiry: driverData.insuranceExpiry,
        insuranceCertificate: driverData.insuranceCertificate,
      })
      
      const totalDuration = Date.now() - startTime
      console.log(`✅ [VehicleInfo] Hoàn tất trong ${totalDuration}ms (${(totalDuration/1000).toFixed(2)}s)`)
    } catch (error: any) {
      const errorDuration = Date.now() - startTime
      console.error(`❌ [VehicleInfo] Lỗi sau ${errorDuration}ms:`, error)
      setError(error.message || 'Không thể tải thông tin xe. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  const startCarAnimation = () => {
    const animations = []
    
    // HIGH SPEED sport car driving - MUCH FASTER!
    animations.push(Animated.loop(
      Animated.sequence([
        Animated.timing(carMove, {
          toValue: 120,
          duration: 1800, // Faster: 3000 -> 1800ms
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(carMove, {
          toValue: -120,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ))

    // Aggressive bounce for sport car
    animations.push(Animated.loop(
      Animated.sequence([
        Animated.timing(carBounce, {
          toValue: -12,
          duration: 250, // Faster bounce
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(carBounce, {
          toValue: 0,
          duration: 250,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(carBounce, {
          toValue: -8,
          duration: 220,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(carBounce, {
          toValue: 0,
          duration: 220,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    ))

    // ULTRA FAST wheel rotation for sport car
    animations.push(Animated.loop(
      Animated.timing(wheelRotate, {
        toValue: 1,
        duration: 400, // Super fast: 800 -> 400ms
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ))

    // BLAZING FAST road lines (parallax effect)
    animations.push(Animated.loop(
      Animated.timing(roadMove, {
        toValue: 1,
        duration: 600, // Much faster: 1200 -> 600ms
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ))

    // INTENSE exhaust smoke for sport car - MORE FREQUENT
    animations.push(Animated.loop(
      Animated.sequence([
        Animated.delay(0),
        Animated.parallel([
          Animated.timing(smokeOpacity1, {
            toValue: 0.8,
            duration: 250, // Faster smoke
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(smokeScale, {
            toValue: 2,
            duration: 500, // Bigger smoke trail
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(smokeOpacity1, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ))

    // Smoke particle 2 (rapid fire)
    animations.push(Animated.loop(
      Animated.sequence([
        Animated.delay(150), // Shorter delay
        Animated.timing(smokeOpacity2, {
          toValue: 0.7,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(smokeOpacity2, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ))

    // Smoke particle 3 (continuous trail)
    animations.push(Animated.loop(
      Animated.sequence([
        Animated.delay(300),
        Animated.timing(smokeOpacity3, {
          toValue: 0.6,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(smokeOpacity3, {
          toValue: 0,
          duration: 250,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ))

    // Dynamic shadow (grows/shrinks as car bounces)
    animations.push(Animated.loop(
      Animated.sequence([
        Animated.timing(shadowScale, {
          toValue: 0.85,
          duration: 400,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
        Animated.timing(shadowScale, {
          toValue: 1,
          duration: 400,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1),
          useNativeDriver: true,
        }),
      ])
    ))
    
    // Start all animations
    animations.forEach(anim => anim.start())
    
    return animations
  }

  // Interpolations for smooth transforms
  const wheelRotateInterpolate = wheelRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  })

  const roadMoveInterpolate = roadMove.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -100],
  })

  const InfoCard = ({ icon, label, value, color = '#FF6B00' }: any) => (
    <View style={styles.infoCard}>
      <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
        <MaterialIcons name={icon} size={24} color={color} />
      </View>
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || 'Chưa cập nhật'}</Text>
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#FF6B00', '#FF8534']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Thông tin xe</Text>
        <TouchableOpacity style={styles.editButton} onPress={() => {
          // TODO: Navigate to edit vehicle screen
        }}>
          <MaterialIcons name="edit" size={22} color="#FFF" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Đang tải thông tin xe...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#FF6B00" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchVehicleInfo}>
            <MaterialIcons name="refresh" size={20} color="#FFF" />
            <Text style={styles.retryButtonText}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Sport Car Running on Open Road - No Container */}
          <View style={styles.carAnimationContainer}>
            {/* Animated road at bottom */}
            <View style={styles.roadContainer}>
              <LinearGradient
                colors={['#4B5563', '#6B7280']}
                style={styles.roadSurface}
              />
              {/* Moving road lines for parallax effect */}
              <Animated.View
                style={[
                  styles.roadLinesContainer,
                  { transform: [{ translateX: roadMoveInterpolate }] },
                ]}
              >
                <View style={styles.roadLine} />
                <View style={[styles.roadLine, { left: 100 }]} />
                <View style={[styles.roadLine, { left: 200 }]} />
                <View style={[styles.roadLine, { left: 300 }]} />
              </Animated.View>
            </View>

            {/* Dynamic shadow under car */}
            <Animated.View
              style={[
                styles.carShadow,
                {
                  transform: [
                    { translateX: carMove },
                    { scaleX: shadowScale },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={['rgba(0,0,0,0.3)', 'transparent']}
                style={styles.shadowGradient}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
              />
            </Animated.View>

            {/* Main car with realistic movement */}
            <Animated.View
              style={[
                styles.carWrapper,
                {
                  transform: [
                    { translateX: carMove },
                    { translateY: carBounce },
                  ],
                },
              ]}
            >
              {/* INTENSE Speed lines for HIGH SPEED */}
              <View style={styles.speedLinesContainer}>
                <View style={[styles.speedLine, { width: 35, left: -40, height: 2.5 }]} />
                <View style={[styles.speedLine, { width: 30, left: -38, top: 10, height: 2 }]} />
                <View style={[styles.speedLine, { width: 32, left: -39, top: 20, height: 2.5 }]} />
                <View style={[styles.speedLine, { width: 28, left: -35, top: 30, height: 2 }]} />
                <View style={[styles.speedLine, { width: 25, left: -32, top: 40, height: 1.5, opacity: 0.6 }]} />
              </View>

              {/* Turbo boost effect */}
              <View style={styles.turboGlow} />

              {/* Car body - Custom 3D Sport Car Design */}
              <View style={styles.carBody}>
                {/* Main body with gradient */}
                <LinearGradient
                  colors={['#FF8534', '#FF6B00', '#E85D00']}
                  style={styles.carBodyGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {/* Front hood */}
                  <View style={styles.carHood} />
                  
                  {/* Windshield (cửa kính) */}
                  <View style={styles.carWindshield}>
                    <LinearGradient
                      colors={['rgba(100, 200, 255, 0.4)', 'rgba(50, 150, 255, 0.3)']}
                      style={styles.windshieldGradient}
                    />
                  </View>

                  {/* Side window */}
                  <View style={styles.carSideWindow} />

                  {/* Front headlight (đèn trước) */}
                  <View style={styles.headlightLeft}>
                    <View style={styles.headlightGlow} />
                  </View>
                  <View style={styles.headlightRight}>
                    <View style={styles.headlightGlow} />
                  </View>

                  {/* Rear light (đèn sau đỏ) */}
                  <View style={styles.rearLight} />

                  {/* Door line detail */}
                  <View style={styles.doorLine} />

                  {/* Racing stripe */}
                  <View style={styles.racingStripe} />

                  {/* Spoiler (cánh gió phía sau) */}
                  <View style={styles.spoilerBase} />
                  <View style={styles.spoilerWing} />
                </LinearGradient>

                {/* 3D side panel shadow */}
                <View style={styles.carSidePanel} />
                
                {/* Bottom skirt */}
                <View style={styles.bottomSkirt} />
              </View>

              {/* Animated wheels */}
              <Animated.View
                style={[
                  styles.wheelFront,
                  { transform: [{ rotate: wheelRotateInterpolate }] },
                ]}
              >
                <View style={styles.wheelOuter}>
                  <View style={styles.wheelInner}>
                    <View style={styles.wheelSpoke} />
                    <View style={[styles.wheelSpoke, { transform: [{ rotate: '45deg' }] }]} />
                    <View style={[styles.wheelSpoke, { transform: [{ rotate: '90deg' }] }]} />
                    <View style={[styles.wheelSpoke, { transform: [{ rotate: '135deg' }] }]} />
                  </View>
                </View>
              </Animated.View>

              <Animated.View
                style={[
                  styles.wheelBack,
                  { transform: [{ rotate: wheelRotateInterpolate }] },
                ]}
              >
                <View style={styles.wheelOuter}>
                  <View style={styles.wheelInner}>
                    <View style={styles.wheelSpoke} />
                    <View style={[styles.wheelSpoke, { transform: [{ rotate: '45deg' }] }]} />
                    <View style={[styles.wheelSpoke, { transform: [{ rotate: '90deg' }] }]} />
                    <View style={[styles.wheelSpoke, { transform: [{ rotate: '135deg' }] }]} />
                  </View>
                </View>
              </Animated.View>
            </Animated.View>

            {/* Smoke/dust particles behind car */}
            <Animated.View
              style={[
                styles.smokeParticle1,
                {
                  opacity: smokeOpacity1,
                  transform: [
                    { translateX: carMove },
                    { scale: smokeScale },
                  ],
                },
              ]}
            >
              <View style={styles.smokeCircle} />
            </Animated.View>

            <Animated.View
              style={[
                styles.smokeParticle2,
                {
                  opacity: smokeOpacity2,
                  transform: [{ translateX: carMove }],
                },
              ]}
            >
              <View style={styles.smokeCircle} />
            </Animated.View>

            <Animated.View
              style={[
                styles.smokeParticle3,
                {
                  opacity: smokeOpacity3,
                  transform: [{ translateX: carMove }],
                },
              ]}
            >
              <View style={styles.smokeCircle} />
            </Animated.View>
          </View>

          {/* Vehicle Image */}
          {vehicleInfo?.vehicleImage && (
            <View style={styles.vehicleImageCard}>
              <Image
                source={{ uri: vehicleInfo.vehicleImage }}
                style={styles.vehicleImage}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.imageGradient}
                >
                  <Text style={styles.imageLabel}>Ảnh xe của tôi</Text>
                </LinearGradient>
              </View>
            </View>
          )}

          {/* Basic Vehicle Info Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="directions-car" size={24} color="#FF6B00" />
              <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>
            </View>

            <InfoCard
              icon="confirmation-number"
              label="Biển số xe"
              value={vehicleInfo?.vehiclePlate}
              color="#2196F3"
            />
            <InfoCard
              icon="drive-eta"
              label="Hãng xe / Model"
              value={vehicleInfo?.vehicleModel}
              color="#4CAF50"
            />
            <InfoCard
              icon="palette"
              label="Màu xe"
              value={vehicleInfo?.vehicleColor}
              color="#9C27B0"
            />
            <InfoCard
              icon="badge"
              label="Giấy phép lái xe"
              value={vehicleInfo?.vehicleLicense}
              color="#FF9800"
            />
          </View>

          {/* Registration Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="description" size={24} color="#FF6B00" />
              <Text style={styles.sectionTitle}>Giấy tờ đăng ký</Text>
            </View>

            {vehicleInfo?.vehicleRegistration ? (
              <View style={styles.documentCard}>
                <View style={styles.documentHeader}>
                  <MaterialIcons name="verified" size={20} color="#10B981" />
                  <Text style={styles.documentTitle}>Giấy đăng ký xe</Text>
                </View>
                <View style={styles.documentBadge}>
                  <MaterialIcons name="check-circle" size={16} color="#10B981" />
                  <Text style={styles.documentBadgeText}>Đã đăng ký</Text>
                </View>
              </View>
            ) : (
              <View style={styles.emptyCard}>
                <MaterialIcons name="description" size={40} color="#E5E7EB" />
                <Text style={styles.emptyText}>Chưa có giấy đăng ký xe</Text>
              </View>
            )}
          </View>

          {/* Insurance Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialIcons name="verified-user" size={24} color="#FF6B00" />
              <Text style={styles.sectionTitle}>Bảo hiểm</Text>
            </View>

            {vehicleInfo?.insuranceProvider || vehicleInfo?.insuranceCertificate ? (
              <>
                {vehicleInfo.insuranceProvider && (
                  <InfoCard
                    icon="business"
                    label="Nhà cung cấp bảo hiểm"
                    value={vehicleInfo.insuranceProvider}
                    color="#00BCD4"
                  />
                )}
                {vehicleInfo.insuranceExpiry && (
                  <InfoCard
                    icon="event"
                    label="Ngày hết hạn"
                    value={new Date(vehicleInfo.insuranceExpiry).toLocaleDateString('vi-VN')}
                    color="#F44336"
                  />
                )}
                {vehicleInfo.insuranceCertificate && (
                  <View style={styles.documentCard}>
                    <View style={styles.documentHeader}>
                      <MaterialIcons name="verified" size={20} color="#10B981" />
                      <Text style={styles.documentTitle}>Giấy chứng nhận bảo hiểm</Text>
                    </View>
                    <View style={styles.documentBadge}>
                      <MaterialIcons name="check-circle" size={16} color="#10B981" />
                      <Text style={styles.documentBadgeText}>Có bảo hiểm</Text>
                    </View>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.emptyCard}>
                <MaterialIcons name="verified-user" size={40} color="#E5E7EB" />
                <Text style={styles.emptyText}>Chưa có thông tin bảo hiểm</Text>
              </View>
            )}
          </View>

          {/* Update Button */}
          <TouchableOpacity
            style={styles.updateButton}
            onPress={() => {
              // TODO: Navigate to update vehicle screen
            }}
          >
            <LinearGradient
              colors={['#FF6B00', '#FF8534']}
              style={styles.updateButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <MaterialIcons name="edit" size={20} color="#FFF" />
              <Text style={styles.updateButtonText}>Cập nhật thông tin xe</Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 16,
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#FF6B00',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 20,
  },
  carAnimationContainer: {
    height: 180,
    paddingVertical: 20,
    position: 'relative',
    overflow: 'visible',
    marginBottom: 20,
    marginHorizontal: 0,
  },
  roadContainer: {
    position: 'absolute',
    bottom: 0,
    left: -20,
    right: -20,
    height: 50,
    overflow: 'hidden',
  },
  roadSurface: {
    width: '100%',
    height: '100%',
  },
  roadLinesContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    width: '200%',
    height: 4,
    flexDirection: 'row',
  },
  roadLine: {
    position: 'absolute',
    width: 50,
    height: 4,
    backgroundColor: '#FFF',
    opacity: 0.8,
  },
  carShadow: {
    position: 'absolute',
    bottom: 50,
    left: '50%',
    marginLeft: -50,
    width: 100,
    height: 20,
  },
  shadowGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
  },
  carWrapper: {
    position: 'absolute',
    bottom: 60,
    left: '50%',
    marginLeft: -60,
  },
  carBody: {
    width: 120,
    height: 62,
    position: 'relative',
  },
  carBodyGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF4500',
    shadowOffset: { width: 5, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  carSidePanel: {
    position: 'absolute',
    right: -3,
    top: 6,
    width: 6,
    height: 50,
    backgroundColor: '#C54900',
    borderRadius: 3,
  },
  speedLinesContainer: {
    position: 'absolute',
    left: -45,
    top: 0,
    height: 60,
  },
  speedLine: {
    position: 'absolute',
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 1,
    shadowColor: '#FFF',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  turboGlow: {
    position: 'absolute',
    right: -15,
    top: 20,
    width: 25,
    height: 25,
    backgroundColor: 'rgba(255, 200, 0, 0.5)',
    borderRadius: 15,
    shadowColor: '#FFA500',
    shadowOffset: { width: -8, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 12,
  },
  // Custom Sport Car Components
  carHood: {
    position: 'absolute',
    left: 5,
    top: 18,
    width: 25,
    height: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 4,
  },
  carWindshield: {
    position: 'absolute',
    left: 32,
    top: 8,
    width: 22,
    height: 20,
    overflow: 'hidden',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 4,
  },
  windshieldGradient: {
    width: '100%',
    height: '100%',
  },
  carSideWindow: {
    position: 'absolute',
    left: 58,
    top: 12,
    width: 28,
    height: 16,
    backgroundColor: 'rgba(100, 150, 200, 0.4)',
    borderTopRightRadius: 6,
    borderBottomRightRadius: 2,
  },
  headlightLeft: {
    position: 'absolute',
    left: 3,
    top: 22,
    width: 8,
    height: 8,
    backgroundColor: '#FFE066',
    borderRadius: 4,
    shadowColor: '#FFE066',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  headlightRight: {
    position: 'absolute',
    left: 3,
    top: 32,
    width: 8,
    height: 8,
    backgroundColor: '#FFE066',
    borderRadius: 4,
    shadowColor: '#FFE066',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
  headlightGlow: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FFF',
    borderRadius: 4,
    opacity: 0.6,
  },
  rearLight: {
    position: 'absolute',
    right: 3,
    top: 25,
    width: 12,
    height: 12,
    backgroundColor: '#FF3333',
    borderRadius: 2,
    shadowColor: '#FF3333',
    shadowOffset: { width: 3, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  doorLine: {
    position: 'absolute',
    left: 55,
    top: 28,
    width: 1,
    height: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  racingStripe: {
    position: 'absolute',
    left: 20,
    top: 28,
    width: 65,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderRadius: 1,
  },
  spoilerBase: {
    position: 'absolute',
    right: 5,
    top: 8,
    width: 8,
    height: 12,
    backgroundColor: '#C54900',
  },
  spoilerWing: {
    position: 'absolute',
    right: 2,
    top: 6,
    width: 14,
    height: 4,
    backgroundColor: '#000',
    borderRadius: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
  },
  bottomSkirt: {
    position: 'absolute',
    bottom: -3,
    left: 10,
    right: 10,
    height: 4,
    backgroundColor: '#1F2937',
    borderRadius: 2,
  },
  wheelFront: {
    position: 'absolute',
    right: 12,
    bottom: -10,
    width: 26,
    height: 26,
  },
  wheelBack: {
    position: 'absolute',
    left: 12,
    bottom: -10,
    width: 26,
    height: 26,
  },
  wheelOuter: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#374151',
  },
  wheelInner: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#4B5563',
    justifyContent: 'center',
    alignItems: 'center',
  },
  wheelSpoke: {
    position: 'absolute',
    width: 2,
    height: 14,
    backgroundColor: '#9CA3AF',
    borderRadius: 1,
  },
  smokeParticle1: {
    position: 'absolute',
    bottom: 65,
    left: '35%',
    width: 20,
    height: 20,
  },
  smokeParticle2: {
    position: 'absolute',
    bottom: 60,
    left: '32%',
    width: 16,
    height: 16,
  },
  smokeParticle3: {
    position: 'absolute',
    bottom: 68,
    left: '30%',
    width: 14,
    height: 14,
  },
  smokeCircle: {
    width: '100%',
    height: '100%',
    borderRadius: 50,
    backgroundColor: '#9CA3AF',
  },
  vehicleImageCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  vehicleImage: {
    width: '100%',
    height: 220,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  imageGradient: {
    padding: 16,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  infoCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  documentCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#10B98115',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  documentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  documentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  documentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  emptyCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F3F4F6',
    borderStyle: 'dashed',
  },
  emptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#9CA3AF',
  },
  updateButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 12,
  },
  updateButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
})
