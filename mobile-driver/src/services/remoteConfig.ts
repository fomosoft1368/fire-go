/**
 * Remote Config Service (Driver App)
 * Fetch API keys và config từ backend DB thay vì fix cứng trong .env
 */
import { API_BASE_URL } from '../constants'

class RemoteConfigService {
  private config: Record<string, string> = {}
  private initialized = false
  private initPromise: Promise<void> | null = null

  /**
   * Fetch config từ backend.
   * Gọi lần 1 khi module import — bắt đầu fetch ngay lập tức.
   * Nếu gọi lại (từ useEffect) sẽ trả về promise đã có.
   */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = this._fetchConfig()
    return this.initPromise
  }

  private async _fetchConfig(): Promise<void> {
    // Không load từ DB nữa theo yêu cầu, chỉ dùng từ env
    this.loadFallback()
  }

  private loadFallback() {
    try {
      const Constants = require('expo-constants').default
      const gmKey = Constants.expoConfig?.extra?.googleMapsApiKey || ''
      if (gmKey) this.config['GOOGLE_MAPS_API_KEY'] = gmKey
    } catch {}
    this.initialized = true
  }

  get(key: string): string {
    return this.config[key] || ''
  }

  isReady(): boolean {
    return this.initialized
  }
}

export const remoteConfig = new RemoteConfigService()

// 🚀 Bắt đầu fetch ngay khi module được import
remoteConfig.init()
