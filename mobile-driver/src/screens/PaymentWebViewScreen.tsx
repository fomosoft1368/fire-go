import React, { useState, useRef } from 'react'
import {
  View,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { COLORS, SPACING } from '../constants'
import { paymentService } from '../services/paymentService'
import { WebView } from 'react-native-webview'

interface PaymentWebViewScreenProps {
  route: any
  navigation: any
}

export default function PaymentWebViewScreen({
  route,
  navigation,
}: PaymentWebViewScreenProps) {
  const { paymentUrl, amount, type } = route.params
  const [loading, setLoading] = useState(true)
  const [canGoBack, setCanGoBack] = useState(false)
  const webViewRef = useRef<WebView>(null)

  const handleNavigationStateChange = (navState: any) => {
    console.log('[PaymentWebView] Navigation state changed:', navState.url)
    setCanGoBack(navState.canGoBack)

    // Kiểm tra xem có phải URL callback không
    if (navState.url.includes('return')) {
      handlePaymentCallback(navState.url)
    }
  }

  const handlePaymentCallback = async (url: string) => {
    console.log('[PaymentWebView] Handling payment callback:', url)
    
    try {
      // Parse VNPay response
      const params = paymentService.parseVNPayResponse(url)
      console.log('[PaymentWebView] Parsed params:', params)

      // Kiểm tra response code
      const responseCode = params.vnp_ResponseCode
      
      if (responseCode === '00') {
        // Thanh toán thành công
        Alert.alert(
          'Thành công',
          'Nạp tiền thành công. Tiền sẽ được cộng vào tài khoản trong vòng 1-2 phút',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('Earnings')
              },
            },
          ]
        )
      } else {
        // Thanh toán thất bại
        const errorMessage = getVNPayErrorMessage(responseCode)
        Alert.alert('Lỗi', `Thanh toán thất bại: ${errorMessage}`)
        navigation.goBack()
      }
    } catch (error: any) {
      console.error('[PaymentWebView] Error handling callback:', error)
      Alert.alert('Lỗi', 'Lỗi xử lý kết quả thanh toán')
      navigation.goBack()
    }
  }

  const handleBackPress = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack()
      return true
    }
    return false
  }

  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    )

    return () => backHandler.remove()
  }, [canGoBack])

  const handleClose = () => {
    Alert.alert(
      'Xác nhận',
      'Bạn có chắc muốn hủy thanh toán?',
      [
        {
          text: 'Tiếp tục thanh toán',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Hủy',
          onPress: () => {
            navigation.goBack()
          },
          style: 'destructive',
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleClose}>
          <MaterialIcons name="close" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <MaterialIcons name="security" size={16} color={COLORS.primary} />
        </View>
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ uri: paymentUrl }}
        onNavigationStateChange={handleNavigationStateChange}
        onLoadEnd={() => setLoading(false)}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent
          console.error('[PaymentWebView] WebView error:', nativeEvent)
          Alert.alert('Lỗi', 'Không thể tải trang thanh toán. Vui lòng thử lại')
        }}
        startInLoadingState
        javaScriptEnabled
        domStorageEnabled
        style={styles.webView}
      />
    </SafeAreaView>
  )
}

function getVNPayErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    '00': 'Giao dịch thành công',
    '01': 'Giao dịch bị từ chối',
    '02': 'Merchant không hợp lệ',
    '03': 'Dữ liệu gửi đi không đúng định dạng',
    '04': 'Không tìm thấy giao dịch',
    '05': 'Lỗi xử lý giao dịch',
    '07': 'Trừ tiền thành công nhưng giao dịch không thành công trên hệ thống',
    '08': 'Giao dịch đang chờ xử lý',
    '09': 'Giao dịch bị hủy',
    '10': 'Giao dịch thất bại',
    '11': 'Giao dịch bị từ chối - Số tiền vượt quá hạn mức',
    '12': 'Giao dịch bị từ chối - Thẻ bị khóa',
    '13': 'Giao dịch bị từ chối - SAC không hợp lệ',
    '51': 'Giao dịch không được hỗ trợ',
    '65': 'Giao dịch bị từ chối',
    '75': 'Ngân hàng từ chối giao dịch',
    '79': 'Giao dịch bị từ chối - OTP không chính xác',
    '99': 'Lỗi không xác định',
  }

  return errorMessages[code] || 'Lỗi không xác định. Vui lòng thử lại'
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
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.darkBorder,
  },
  headerInfo: {
    flex: 1,
    alignItems: 'center',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.darkBg,
    zIndex: 1000,
  },
  webView: {
    flex: 1,
  },
})
