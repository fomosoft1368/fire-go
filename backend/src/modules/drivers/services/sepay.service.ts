import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import { AppSettingsService } from '../../app-settings/app-settings.service';

interface SepayQRPayload {
  accountNo: string;
  accountName: string;
  acqId: string; // Bank ID (VCB=970436, TCB: 970407, MB=970422, etc.)
  amount: number;
  addInfo: string; // Transaction content
  format: 'text' | 'compact';
  template?: 'compact' | 'compact2' | 'qr_only' | 'print';
}

@Injectable()
export class SepayService {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  /** Lấy key từ DB (dynamic - phản ánh thay đổi từ web-admin) */
  private get SEPAY_API_KEY() { return this.appSettingsService.getSync('SEPAY_API_KEY'); }
  private get SEPAY_SECRET_KEY() { return this.appSettingsService.getSync('SEPAY_SECRET_KEY'); }
  private get ACCOUNT_NO() { return this.appSettingsService.getSync('SEPAY_ACCOUNT_NUMBER') || 'VQRQAHGIQ8468'; }
  private get ACCOUNT_NAME() { return this.appSettingsService.getSync('SEPAY_ACCOUNT_NAME') || 'HO VAN TRINH'; }
  private get BANK_ID() { return this.appSettingsService.getSync('SEPAY_BANK_ID') || '970422'; }
  private get BANK_NAME() { return this.appSettingsService.getSync('SEPAY_BANK_NAME') || 'MB'; }


  /**
   * Generate Sepay QR code URL for bank transfer
   * Supports both driver (DRV_) and customer (CUST_) payments
   * Reference: https://www.sepay.vn/ or https://img.vietqr.io/
   */
  generateQRCode(
    amount: number,
    transactionId: string,
    userType: 'driver' | 'customer' = 'driver',
  ): {
    qrCodeUrl: string;
    accountNo: string;
    accountName: string;
    bankName: string;
    amount: number;
    content: string;
    bankId: string;
  } {
    // Generate unique transaction content with user type prefix
    // Format: DRV8A9B0C1D or CUST9B0C2D2E (no underscore - banks don't allow it)
    const last8Chars = transactionId.substring(transactionId.length - 8).toUpperCase();
    const prefix = userType === 'driver' ? 'DRV' : 'CUST';
    const content = `${prefix}${last8Chars}`; // No underscore!
    
    console.log('[SepayService] 🔖 Generating QR code:');
    console.log('[SepayService] User Type:', userType);
    console.log('[SepayService] Full Transaction ID:', transactionId);
    console.log('[SepayService] Last 8 chars:', last8Chars);
    console.log('[SepayService] Content:', content);

    // VietQR API URL (Free, public)
    const qrCodeUrl = this.buildVietQRUrl({
      accountNo: this.ACCOUNT_NO,
      accountName: this.ACCOUNT_NAME,
      acqId: this.BANK_ID,
      amount,
      addInfo: content,
      format: 'compact',
      template: 'compact2',
    });

    return {
      qrCodeUrl,
      accountNo: this.ACCOUNT_NO,
      accountName: this.ACCOUNT_NAME,
      bankName: this.BANK_NAME,
      bankId: this.BANK_ID,
      amount,
      content,
    };
  }

  /**
   * Build Sepay QR URL
   * Format: https://qr.sepay.vn/img?acc={ACCOUNT_NO}&bank={BANK_NAME}&amount={amount}&des={content}
   */
  private buildVietQRUrl(payload: SepayQRPayload): string {
    const baseUrl = 'https://qr.sepay.vn/img';
    
    // URL encode params for Sepay format
    const params = new URLSearchParams({
      acc: payload.accountNo,
      bank: this.BANK_NAME, // MBBank, VCBBank, etc.
      amount: payload.amount.toString(),
      des: payload.addInfo,
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Verify Sepay webhook signature
   * Uses HMAC-SHA256 with secret key from Sepay
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    // If no secret key configured, accept all (development mode)
    if (!this.SEPAY_SECRET_KEY) {
      console.log('[SepayService] ⚠️ No SEPAY_SECRET_KEY configured - accepting all webhooks (DEV MODE)');
      console.log('[SepayService] 💡 To enable signature verification, add SEPAY_SECRET_KEY to .env');
      return true;
    }

    try {
      // Compute HMAC-SHA256 signature
      const hmac = crypto.createHmac('sha256', this.SEPAY_SECRET_KEY);
      hmac.update(payload);
      const computedSignature = hmac.digest('hex');
      
      const isValid = computedSignature === signature;
      
      if (isValid) {
        console.log('[SepayService] ✅ Webhook signature VALID');
      } else {
        console.log('[SepayService] ❌ Webhook signature INVALID');
        console.log('[SepayService] Expected:', computedSignature);
        console.log('[SepayService] Received:', signature);
      }
      
      return isValid;
    } catch (error) {
      console.error('[SepayService] ❌ Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Validate transaction content format
   * Format: DH + 8-24 chars transaction ID (hex)
   */
  validateTransactionContent(content: string, transactionId: string): boolean {
    const expectedSuffix = transactionId.substring(transactionId.length - 8).toUpperCase();
    const expectedContent = `DH${expectedSuffix}`;
    return content.toUpperCase().includes(expectedSuffix);
  }
}
