import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

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
  // Sepay API credentials (load from .env)
  private readonly SEPAY_API_KEY = process.env.SEPAY_API_KEY;
  private readonly SEPAY_SECRET_KEY = process.env.SEPAY_SECRET_KEY;
  
  // Thông tin tài khoản nhận tiền (config từ .env trong production)
  private readonly ACCOUNT_NO = process.env.SEPAY_ACCOUNT_NUMBER || '0986190053'; // Số tài khoản ngân hàng
  private readonly ACCOUNT_NAME = process.env.SEPAY_ACCOUNT_NAME || 'HO VAN TRINH'; // Tên chủ tài khoản
  private readonly BANK_ID = process.env.SEPAY_BANK_ID || '970422'; // VCB: 970436, TCB: 970407, MB: 970422
  private readonly BANK_NAME = process.env.SEPAY_BANK_NAME || 'MB'; // Tên ngân hàng

  /**
   * Generate Sepay QR code URL for bank transfer
   * Reference: https://www.sepay.vn/ or https://img.vietqr.io/
   */
  generateQRCode(amount: number, transactionId: string): {
    qrCodeUrl: string;
    accountNo: string;
    accountName: string;
    bankName: string;
    amount: number;
    content: string;
    bankId: string;
  } {
    // Generate unique transaction content (use last 8 chars for brevity)
    const last8Chars = transactionId.substring(transactionId.length - 8).toUpperCase();
    const content = `DH${last8Chars}`;
    
    console.log('[SepayService] 🔖 Generating QR code:');
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
   * Build VietQR URL
   * Format: https://img.vietqr.io/image/{BANK_ID}-{ACCOUNT_NO}-{TEMPLATE}.png?amount={amount}&addInfo={content}&accountName={name}
   */
  private buildVietQRUrl(payload: SepayQRPayload): string {
    const baseUrl = 'https://img.vietqr.io/image';
    const template = payload.template || 'compact2';
    
    // URL encode params
    const params = new URLSearchParams({
      amount: payload.amount.toString(),
      addInfo: payload.addInfo,
      accountName: payload.accountName,
    });

    return `${baseUrl}/${payload.acqId}-${payload.accountNo}-${template}.png?${params.toString()}`;
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
