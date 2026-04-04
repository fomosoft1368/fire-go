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
    try {
      const url = `${API_BASE_URL}/app-settings/public`
      console.log('[RemoteConfig] 🔄 Fetching config from:', url)

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        console.warn('[RemoteConfig] ⚠️ Failed to fetch:', response.status, '— using fallback')
        this.loadFallback()
        return
      }

      const json = await response.json()
      const settings: Array<{ key: string; value: string }> = Array.isArray(json) ? json : (json?.data || [])

      settings.forEach(({ key, value }) => {
        if (value) this.config[key] = value
      })

      this.initialized = true
      console.log('[RemoteConfig] ✅ Loaded', Object.keys(this.config).length, 'keys from DB:', Object.keys(this.config).join(', '))
    } catch (err) {
      console.warn('[RemoteConfig] ❌ Network error, using .env fallback:', err)
      this.loadFallback()
    }
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
