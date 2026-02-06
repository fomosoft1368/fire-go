import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  StatusBar,
  ActivityIndicator,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { COLORS, SPACING, BORDER_RADIUS } from '../constants'
import type { RootState } from '../redux/store'
import { driverService } from '../services/driverService'
import { updateUser } from '../redux/slices/authSlice'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function EditProfileScreen() {
  const dispatch = useDispatch()
  const navigation = useNavigation()
  const { user } = useSelector((state: RootState) => state.auth)
  
  const [formData, setFormData] = useState({
    name: user?.firstName && user?.lastName 
      ? `${user.firstName} ${user.lastName}` 
      : user?.name || '',
    email: user?.email || '',
    phone: user?.phone || user?.phoneNumber || '',
  })

  const [selectedDriverTypes, setSelectedDriverTypes] = useState<string[]>(
    user?.driverTypes || ['rideshare']
  )

  // Log để debug
  useEffect(() => {
    console.log('[EditProfile] Component mounted')
    console.log('[EditProfile] User from Redux:', user)
    console.log('[EditProfile] Driver Types from Redux:', user?.driverTypes)
    console.log('[EditProfile] Selected Driver Types:', selectedDriverTypes)
  }, [])

  // Refresh data khi screen focus
  useFocusEffect(
    React.useCallback(() => {
      const loadProfile = async () => {
        try {
          console.log('[EditProfile] Screen focused, loading fresh profile...')
          const profile = await driverService.getProfile()
          console.log('[EditProfile] Fresh profile from API:', profile)
          console.log('[EditProfile] Fresh driverTypes:', profile.driverTypes)
          
          // Update Redux
          dispatch(updateUser(profile))
          
          // Update local state
          setSelectedDriverTypes(profile.driverTypes || ['rideshare'])
          setFormData({
            name: profile.firstName && profile.lastName 
              ? `${profile.firstName} ${profile.lastName}` 
              : profile.name || '',
            email: profile.email || '',
            phone: profile.phone || profile.phoneNumber || '',
          })
        } catch (error) {
          console.error('[EditProfile] Error loading profile:', error)
        }
      }
      
      loadProfile()
    }, [])
  )

  const [saving, setSaving] = useState(false)

  const driverTypeOptions = [
    { value: 'hire', label: 'Lái xe hộ', icon: 'person' },
    { value: 'rideshare', label: 'Ghép xe', icon: 'people' },
    { value: 'delivery', label: 'Vận chuyển', icon: 'local-shipping' },
  ]

  const toggleDriverType = (type: string) => {
    if (selectedDriverTypes.includes(type)) {
      // Không cho bỏ chọn hết tất cả
      if (selectedDriverTypes.length > 1) {
        setSelectedDriverTypes(selectedDriverTypes.filter(t => t !== type))
      }
    } else {
      setSelectedDriverTypes([...selectedDriverTypes, type])
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const updateData = {
        phone: formData.phone,
        email: formData.email,
        driverTypes: selectedDriverTypes,
      }
      
      console.log('[EditProfile] Saving profile...') 
      console.log('[EditProfile] Update data:', JSON.stringify(updateData, null, 2))
      console.log('[EditProfile] Selected driverTypes:', selectedDriverTypes)
      
      const result = await driverService.updateMyProfile(updateData)
      
      console.log('[EditProfile] ✅ Save successful')
      console.log('[EditProfile] Result:', JSON.stringify(result, null, 2))
      
      // Refetch profile để đảm bảo dữ liệu đồng bộ
      const updatedProfile = await driverService.getProfile()
      console.log('[EditProfile] ✅ Updated profile from API:', JSON.stringify(updatedProfile, null, 2))
      console.log('[EditProfile] Updated driverTypes:', updatedProfile.driverTypes)
      
      // Cập nhật Redux state với dữ liệu mới nhất từ API
      dispatch(updateUser(updatedProfile))
      console.log('[EditProfile] ✅ Redux updated')
      
      // Cập nhật AsyncStorage
      const currentUser = await AsyncStorage.getItem('user')
      if (currentUser) {
        const userObj = JSON.parse(currentUser)
        const mergedUser = { ...userObj, ...updatedProfile }
        await AsyncStorage.setItem('user', JSON.stringify(mergedUser))
        console.log('[EditProfile] ✅ AsyncStorage updated')
      }
      
      Alert.alert(
        'Thành công',
        'Thông tin cá nhân đã được cập nhật',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      )
    } catch (error: any) {
      console.error('[EditProfile] ❌ Error saving profile:', error)
      console.error('[EditProfile] Error response:', error?.response?.data)
      console.error('[EditProfile] Error message:', error?.message)
      Alert.alert(
        'Lỗi',
        error?.response?.data?.message || error?.message || 'Không thể cập nhật thông tin. Vui lòng thử lại.',
        [{ text: 'OK' }]
      )
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    navigation.goBack()
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.darkBg} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <MaterialIcons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarInner}>
              <MaterialIcons
                name="person"
                size={60}
                color={COLORS.primary}
              />
            </View>
            <TouchableOpacity style={styles.cameraButton} activeOpacity={0.8}>
              <MaterialIcons name="camera-alt" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.changePhotoText}>Thay đổi ảnh đại diện</Text>
        </View>

        {/* Form Section */}
        <View style={styles.formSection}>
          {/* Name Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Họ và tên</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <MaterialIcons
                name="person-outline"
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, styles.inputTextDisabled]}
                value={formData.name}
                placeholder="Nhập họ và tên"
                placeholderTextColor={COLORS.textSecondary}
                editable={false}
              />
            </View>
          </View>

          {/* Phone Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Số điện thoại</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="phone"
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={formData.phone}
                onChangeText={(text) => setFormData({ ...formData, phone: text })}
                placeholder="Nhập số điện thoại"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <MaterialIcons
                name="email"
                size={20}
                color={COLORS.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                value={formData.email}
                onChangeText={(text) => setFormData({ ...formData, email: text })}
                placeholder="Nhập email"
                placeholderTextColor={COLORS.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Driver Type Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Loại tài xế</Text>
            <View style={styles.driverTypeContainer}>
              {driverTypeOptions.map((option) => {
                const isSelected = selectedDriverTypes.includes(option.value)
                return (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.driverTypeCard,
                      isSelected && styles.driverTypeCardSelected,
                    ]}
                    onPress={() => toggleDriverType(option.value)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.driverTypeIconWrapper,
                        isSelected && styles.driverTypeIconWrapperSelected,
                      ]}
                    >
                      <MaterialIcons
                        name={option.icon as any}
                        size={24}
                        color={isSelected ? COLORS.primary : COLORS.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.driverTypeLabel,
                        isSelected && styles.driverTypeLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkmarkBadge}>
                        <MaterialIcons name="check" size={16} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>

        {/* Additional Info Section */}
        <View style={styles.infoSection}>
          <TouchableOpacity style={styles.infoItem} activeOpacity={0.7}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons
                  name="directions-car"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.infoLabel}>Thông tin xe</Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoItem} activeOpacity={0.7}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons
                  name="description"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.infoLabel}>Tài liệu xác thực</Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.infoItem} activeOpacity={0.7}>
            <View style={styles.infoLeft}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons
                  name="lock-outline"
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              <Text style={styles.infoLabel}>Đổi mật khẩu</Text>
            </View>
            <MaterialIcons
              name="chevron-right"
              size={24}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleCancel}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Hủy</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={COLORS.text} />
          ) : (
            <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.darkBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  container: {
    flex: 1,
  },

  // Avatar Section
  avatarSection: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  avatarInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.darkBg,
  },
  changePhotoText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },

  // Form Section
  formSection: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.lg,
  },
  inputGroup: {
    gap: SPACING.sm,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.xs / 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    paddingHorizontal: SPACING.md,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: SPACING.md,
  },
  inputDisabled: {
    backgroundColor: COLORS.darkBg,
    opacity: 0.6,
  },
  inputTextDisabled: {
    color: COLORS.textSecondary,
  },

  // Driver Type Section
  driverTypeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  driverTypeCard: {
    flex: 1,
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.darkBorder,
    padding: SPACING.md,
    alignItems: 'center',
    position: 'relative',
  },
  driverTypeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  driverTypeIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.darkBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  driverTypeIconWrapperSelected: {
    backgroundColor: COLORS.primary + '20',
  },
  driverTypeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  driverTypeLabelSelected: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  checkmarkBadge: {
    position: 'absolute',
    top: SPACING.xs,
    right: SPACING.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Info Section
  infoSection: {
    marginTop: SPACING.xl,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.darkCard,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    overflow: 'hidden',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Bottom Actions
  bottomActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.darkBorder,
    backgroundColor: COLORS.darkBg,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.darkCard,
    borderWidth: 1,
    borderColor: COLORS.darkBorder,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
  saveButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
  },
})
