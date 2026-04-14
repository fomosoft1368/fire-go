/**
 * ============================================================
 *  ZALO ZNS – MÃ HÓA RSA ĐA LỚP (Asymmetric Encryption)
 *  Cipher: RSA/ECB/OAEPWITHSHA-256ANDMGF1PADDING
 *  Encoding: Base64
 *
 *  Hướng dẫn lấy Public Key:
 *  1. Vào https://developers.zalo.me
 *  2. Chọn App > Cài đặt kỹ thuật (Technical Settings)
 *  3. Tìm mục "RSA Public Key" → Copy toàn bộ nội dung
 *  4. Dán vào file .env: ZALO_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
 * ============================================================
 */

import * as crypto from 'crypto';

export class ZaloRsaHelper {
  /**
   * Mã hóa một chuỗi dữ liệu bằng RSA Public Key.
   * Cipher tương đương Java: RSA/ECB/OAEPWITHSHA-256ANDMGF1PADDING
   *
   * @param data       Dữ liệu thuần (phone, otp, v.v...)
   * @param publicKeyPem  RSA Public Key dạng PEM (-----BEGIN PUBLIC KEY-----)
   * @returns          Kết quả mã hóa dưới dạng Base64
   */
  static encrypt(data: string, publicKeyPem: string): string {
    if (!publicKeyPem || publicKeyPem.trim() === '') {
      throw new Error(
        '[ZaloRSA] ZALO_RSA_PUBLIC_KEY chưa được cấu hình. ' +
          'Vào Zalo Developers > App > Cài đặt kỹ thuật > RSA Public Key để lấy key.',
      );
    }

    try {
      const encrypted = crypto.publicEncrypt(
        {
          key: publicKeyPem,
          padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256', // SHA-256 với MGF1
        },
        Buffer.from(data, 'utf8'),
      );
      return encrypted.toString('base64');
    } catch (err: any) {
      throw new Error(
        `[ZaloRSA] Lỗi mã hóa RSA: ${err.message}. ` +
          'Kiểm tra lại định dạng Public Key (phải là PEM, PKCS#8).',
      );
    }
  }

  /**
   * Mã hóa toàn bộ object template_data.
   * Mỗi VALUE trong object đều được mã hóa riêng lẻ theo yêu cầu Zalo.
   *
   * @param templateData  Ví dụ: { otp: "123456" }
   * @param publicKeyPem  RSA Public Key PEM
   * @returns             Ví dụ: { otp: "<base64_encrypted>" }
   */
  static encryptTemplateData(
    templateData: Record<string, string>,
    publicKeyPem: string,
  ): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(templateData)) {
      result[key] = ZaloRsaHelper.encrypt(String(value), publicKeyPem);
    }
    return result;
  }

  /**
   * Kiểm tra Public Key có hợp lệ không (format PEM cơ bản).
   */
  static isValidPem(pem: string): boolean {
    return (
      typeof pem === 'string' &&
      pem.includes('-----BEGIN') &&
      pem.includes('-----END')
    );
  }
}
