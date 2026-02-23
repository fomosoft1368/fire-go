import axios from 'axios';
import { API_BASE_URL } from '../constants/config';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface WalletBalance {
  balance: number;
  pending: number;
  minimumBalance: number;
  isLocked: boolean;
}

interface TopupRequest {
  amount: number;
  paymentMethod: 'bank_transfer' | 'momo' | 'zalopay' | 'cash';
  bankCode?: string;
  note?: string;
}

interface WithdrawRequest {
  amount: number;
  bankAccountNumber: string;
  bankName: string;
  accountHolderName: string;
  note?: string;
}

interface Transaction {
  _id: string;
  driverId: string;
  type: 'topup' | 'withdrawal' | 'commission' | 'bonus' | 'refund';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: string;
  description: string;
  createdAt: string;
  completedAt?: string;
}

interface WalletStats {
  thisWeek: number;
  thisMonth: number;
  total: number;
  tripCount: number;
  avgRating: number;
  bonusAmount: number;
}

class WalletService {
  private async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('token');
  }

  private async getHeaders() {
    const token = await this.getAuthToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /**
   * Get current wallet balance and status
   */
  async getBalance(): Promise<WalletBalance> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_BASE_URL}/wallet/balance`, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không thể lấy số dư ví');
    }
  }

  /**
   * Top-up wallet (nạp tiền)
   */
  async topup(data: TopupRequest): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/wallet/topup`,
        data,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Nạp tiền thất bại');
    }
  }

  /**
   * Create Sepay QR payment (tạo mã QR chuyển khoản)
   */
  async createSepayPayment(amount: number, note?: string): Promise<{
    success: boolean;
    transactionId: string;
    qrCodeUrl: string;
    accountNo: string;
    accountName: string;
    bankName: string;
    amount: number;
    content: string;
  }> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/wallet/sepay/create`,
        { amount, note },
        { headers }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Tạo mã QR thất bại');
    }
  }

  /**
   * Withdraw money (rút tiền)
   */
  async withdraw(data: WithdrawRequest): Promise<any> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.post(
        `${API_BASE_URL}/wallet/withdraw`,
        data,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Rút tiền thất bại');
    }
  }

  /**
   * Get wallet transaction history
   */
  async getTransactions(limit: number = 20, skip: number = 0): Promise<Transaction[]> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(
        `${API_BASE_URL}/wallet/transactions?limit=${limit}&skip=${skip}`,
        { headers }
      );
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không thể lấy lịch sử giao dịch');
    }
  }

  /**
   * Get wallet statistics (earnings this week, month, total)
   */
  async getStats(): Promise<WalletStats> {
    try {
      const headers = await this.getHeaders();
      const response = await axios.get(`${API_BASE_URL}/wallet/stats`, {
        headers,
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Không thể lấy thống kê');
    }
  }

  /**
   * Get topup discount from pricing config
   */
  async getTopupDiscount(): Promise<number> {
    try {
      const response = await axios.get(`${API_BASE_URL}/pricing/topup-discount/driver`);
      return response.data.discount || 0;
    } catch (error: any) {
      console.error('Error fetching topup discount:', error);
      return 0; // Return 0 if API fails
    }
  }
}

export const walletService = new WalletService();

