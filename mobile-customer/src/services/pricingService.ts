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
}

export const pricingService = new PricingService()
