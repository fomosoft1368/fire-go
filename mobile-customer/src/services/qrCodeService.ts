import AsyncStorage from '@react-native-async-storage/async-storage'

const API_BASE_URL = 'http://192.168.1.18:3000/api'

export const qrCodeService = {
  /**
   * Generate EMV QR code data from backend
   * @param amount - Amount in VND
   * @param description - Transfer description/reference code
   * @returns EMV QR data string (can be rendered by QRCode component)
   */
  async generateEMVQR(amount: number, description: string): Promise<string> {
    try {
      const token = await AsyncStorage.getItem('authToken')
      if (!token) {
        throw new Error('Không có token xác thực')
      }

      const response = await fetch(`${API_BASE_URL}/wallets/generate-qr-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount,
          description,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.qrData) {
        console.log('[QRCodeService] EMV QR data generated successfully')
        return data.qrData
      } else {
        throw new Error('Không có dữ liệu QR trong response')
      }
    } catch (error) {
      console.error('[QRCodeService] Error generating EMV QR:', error)
      throw error
    }
  },
}





