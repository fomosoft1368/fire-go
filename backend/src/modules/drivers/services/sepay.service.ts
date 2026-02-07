import { Injectable } from '@nestjs/common';

interface SepayQRPayload {
  accountNo: string;
  accountName: string;
  acqId: string; // Bank ID (VCB=970436, TCB=970407, MB=970422, etc.)
  amount: number;
  addInfo: string; // Transaction content
  format: 'text' | 'compact';
  template?: 'compact' | 'compact2' | 'qr_only' | 'print';
}

@Injectable()
export class SepayService {
  // Thông tin tài khoản nhận tiền (config từ .env trong production)
  private readonly ACCOUNT_NO = '0986190053'; // Số tài khoản ngân hàng
  private readonly ACCOUNT_NAME = 'HO VAN TRINH'; // Tên chủ tài khoản
  private readonly BANK_ID = '970422'; // VCB: 970436, TCB: 970407, MB: 970422
  private readonly BANK_NAME = 'MB'; // Tên ngân hàng

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
    // Generate unique transaction content
    const content = `NAPVI ${transactionId.substring(transactionId.length - 8).toUpperCase()}`;

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
   * Validate transaction content format
   * Format: NAPVI + 8 chars transaction ID
   */
  validateTransactionContent(content: string, transactionId: string): boolean {
    const expectedSuffix = transactionId.substring(transactionId.length - 8).toUpperCase();
    const expectedContent = `NAPVI ${expectedSuffix}`;
    return content.toUpperCase().includes(expectedSuffix);
  }
}
