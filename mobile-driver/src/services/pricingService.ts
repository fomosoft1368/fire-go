import axios from 'axios';
import { API_BASE_URL } from '../constants/config';

interface PricingConfig {
  minTopupAmountDriver: number;
  minTopupAmountCustomer: number;
  minWalletBalanceToGoOnline: number;
  maxTopupAmount: number;
  minWithdrawAmountDriver: number;
  minWithdrawAmountCustomer: number;
  topupDiscountDriver: number;
  topupDiscountCustomer: number;
}

class PricingService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/pricing`,
    timeout: 10000,
  });

  private cachedConfig: PricingConfig | null = null;
  private lastFetch: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get pricing config (with caching)
   */
  async getConfig(): Promise<PricingConfig> {
    const now = Date.now();
    
    // Return cached config if still valid
    if (this.cachedConfig && (now - this.lastFetch) < this.CACHE_DURATION) {
      return this.cachedConfig;
    }

    try {
      const response = await this.api.get<PricingConfig>('/config');
      this.cachedConfig = response.data;
      this.lastFetch = now;
      return response.data;
    } catch (error) {
      console.error('[PricingService] Error fetching config:', error);
      
      // Return cached config if available, otherwise defaults
      if (this.cachedConfig) {
        return this.cachedConfig;
      }
      
      // Return defaults if no cache
      return {
        minTopupAmountDriver: 10000,
        minTopupAmountCustomer: 10000,
        minWalletBalanceToGoOnline: 100000,
        maxTopupAmount: 100000000,
        minWithdrawAmountDriver: 50000,
        minWithdrawAmountCustomer: 50000,
        topupDiscountDriver: 0,
        topupDiscountCustomer: 0,
      };
    }
  }

  /**
   * Get minimum topup amount for driver
   */
  async getMinTopupAmountDriver(): Promise<number> {
    const config = await this.getConfig();
    return config.minTopupAmountDriver || 10000;
  }

  /**
   * Get minimum wallet balance to go online
   */
  async getMinWalletBalanceToGoOnline(): Promise<number> {
    const config = await this.getConfig();
    return config.minWalletBalanceToGoOnline || 100000;
  }

  /**
   * Get max topup amount
   */
  async getMaxTopupAmount(): Promise<number> {
    const config = await this.getConfig();
    return config.maxTopupAmount || 100000000;
  }

  /**
   * Get minimum withdraw amount for driver
   */
  async getMinWithdrawAmountDriver(): Promise<number> {
    const config = await this.getConfig();
    return config.minWithdrawAmountDriver || 50000;
  }

  /**
   * Clear cache (force refresh on next call)
   */
  clearCache(): void {
    this.cachedConfig = null;
    this.lastFetch = 0;
  }
}

export const pricingService = new PricingService();
export default pricingService;
