import Constants from 'expo-constants';

const getApiUrl = () => {
  return process.env.REACT_APP_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://192.168.1.20:3000/api';
};

export const loggerService = {
  /**
   * Bắn log lỗi về Backend
   * @param functionName Tên hàm nổ lỗi
   * @param error Object lỗi 
   * @param extraData Dữ liệu truyền vào hàm (để dễ debug)
   */
  async logFrontendError(functionName: string, error: any, extraData?: any) {
    try {
      const url = `${getApiUrl()}/logs/frontend-error`;
      
      const payload = {
        appName: 'mobile-customer',
        functionName,
        errorMessage: error?.message || String(error),
        errorStack: error?.stack || '',
        extraData
      };

      // Dùng fetch riêng biệt để không dính vào apiClient 
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log(`[Logger] Lỗi từ ${functionName} đã đẩy về Server.`);
    } catch (e) {
      console.error('[Logger] Gửi Log thất bại:', e);
    }
  }
};
