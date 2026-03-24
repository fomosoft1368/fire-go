import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_BASE_URL } from '../constants/config'

interface PricingConfig {
  minTopupAmountDriver: number
  minTopupAmountCustomer: number
  minWalletBalanceToGoOnline: number
  maxTopupAmount: number
  minWithdrawAmountDriver: number
  minWithdrawAmountCustomer: number
  topupDiscount: number
  topupDiscountCustomer?: number
  topupDiscountDriver?: number
  currency: string
}

class PricingService {
  private cachedConfig: PricingConfig | null = null
  private lastFetch: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  async getConfig(): Promise<PricingConfig> {
    const now = Date.now()

    // Return cached config if still valid
    if (this.cachedConfig && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cachedConfig
    }

    try {
      // ✅ Public endpoint - không cần token
      const url = `${API_BASE_URL}/pricing/config`;
      console.log('[PricingService] 🔍 Fetching config from:', url);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        },
      })

      console.log('[PricingService] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[PricingService] Error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Validate response has required fields
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      this.cachedConfig = data
      this.lastFetch = now

      console.log('[PricingService] ✅ Config loaded successfully:', {
        minTopupCustomer: data.minTopupAmountCustomer,
        minTopupDriver: data.minTopupAmountDriver,
        maxTopup: data.maxTopupAmount,
        minBalance: data.minWalletBalanceToGoOnline,
      });

      return data
    } catch (error: any) {
      console.error('[PricingService] ❌ Error fetching config:');
      console.error('[PricingService] Error message:', error?.message);
      console.error('[PricingService] Full error:', error);
      console.error('[PricingService] API_BASE_URL:', API_BASE_URL);
      
      // Return defaults if fetch fails
      const defaults: PricingConfig = {
        minTopupAmountDriver: 10000,
        minTopupAmountCustomer: 10000,
        minWalletBalanceToGoOnline: 100000,
        maxTopupAmount: 100000000,
        minWithdrawAmountDriver: 50000,
        minWithdrawAmountCustomer: 50000,
        topupDiscount: 0,
        currency: 'VNĐ',
      }

      // Cache defaults to avoid repeated failures
      if (!this.cachedConfig) {
        this.cachedConfig = defaults
        this.lastFetch = now
        console.log('[PricingService] ⚠️ Using default config due to fetch error');
      }

      return this.cachedConfig
    }
  }

  async getMinTopupAmountCustomer(): Promise<number> {
    const config = await this.getConfig()
    return config.minTopupAmountCustomer
  }

  async getMaxTopupAmount(): Promise<number> {
    const config = await this.getConfig()
    return config.maxTopupAmount
  }

  async getMinWithdrawAmountCustomer(): Promise<number> {
    const config = await this.getConfig()
    return config.minWithdrawAmountCustomer || 50000
  }

  clearCache(): void {
    this.cachedConfig = null
    this.lastFetch = 0
  }

  // ============ CHUYẾN ĐI LIÊN TỈNH - Inter-Provincial Routes ============
  /**
   * Tìm các chuyến đi liên tỉnh phù hợp với điểm đón và điểm đến
   */
  async findInterProvincialRoutes(
    pickupLat: number,
    pickupLng: number,
    dropoffLat: number,
    dropoffLng: number,
    vehicleType: string
  ): Promise<any[]> {
    try {
      console.log('\n🌐 ============ CALLING API ============')
      console.log('📍 API URL:', `${API_BASE_URL}/pricing/interprovincial/find`)
      console.log('📦 Request body:', {
        pickupLat,
        pickupLng,
        dropoffLat,
        dropoffLng,
        vehicleType,
      })

      const url = `${API_BASE_URL}/pricing/interprovincial/find`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickupLat,
          pickupLng,
          dropoffLat,
          dropoffLng,
          vehicleType,
        }),
      })

      console.log('📡 Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error:', errorText)
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`)
      }

      const data = await response.json()
      console.log('📊 API Response:', JSON.stringify(data, null, 2))
      console.log(`✅ Received ${data.routes?.length || 0} routes from API`)
      console.log('====================================\n')
      
      return data.routes || []
    } catch (error) {
      console.error('\n❌ ============ API ERROR ============')
      console.error('[PricingService] Error finding inter-provincial routes:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      console.error('====================================\n')
      return []
    }
  }

  /**
   * Tính giá cho chuyến đi liên tỉnh
   */
  async calculateInterProvincialPrice(
    routeId: string,
    totalPassengers: number
  ): Promise<{
    routeInfo: any
    fixedPrice: number
    discountRate: number
    finalPrice: number
    pricePerPerson: number
  } | null> {
    try {
      console.log('\n💰 [Inter-Provincial] Calculating price...')
      console.log('  Route ID:', routeId)
      console.log('  Passengers:', totalPassengers)

      const url = `${API_BASE_URL}/pricing/interprovincial/calculate`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          routeId,
          totalPassengers,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('\n✅ Price calculated:', data.finalPrice?.toLocaleString() + 'đ\n')
      
      return data
    } catch (error) {
      console.error('[PricingService] Error calculating inter-provincial price:', error)
      return null
    }
  }
}

export const pricingService = new PricingService()
