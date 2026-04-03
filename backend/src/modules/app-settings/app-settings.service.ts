import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppSetting, AppSettingDocument, SettingGroup } from './schemas/app-setting.schema';

/** Định nghĩa tất cả settings và giá trị mặc định lấy từ .env */
const DEFAULT_SETTINGS = [
  // ── Sepay ────────────────────────────────────────────────────────────────
  {
    key: 'SEPAY_API_KEY',
    label: 'Sepay API Key',
    group: SettingGroup.PAYMENT_SEPAY,
    isSecret: true,
    description: 'API Key lấy từ Sepay Dashboard',
    envFallback: 'SEPAY_API_KEY',
  },
  {
    key: 'SEPAY_SECRET_KEY',
    label: 'Sepay Secret Key',
    group: SettingGroup.PAYMENT_SEPAY,
    isSecret: true,
    description: 'Secret Key từ Sepay',
    envFallback: 'SEPAY_SECRET_KEY',
  },
  {
    key: 'SEPAY_ACCOUNT_NUMBER',
    label: 'Số tài khoản Sepay',
    group: SettingGroup.PAYMENT_SEPAY,
    isSecret: false,
    description: 'Số tài khoản ngân hàng hiển thị trong QR',
    envFallback: 'SEPAY_ACCOUNT_NUMBER',
  },
  {
    key: 'SEPAY_ACCOUNT_NAME',
    label: 'Tên tài khoản Sepay',
    group: SettingGroup.PAYMENT_SEPAY,
    isSecret: false,
    description: 'Tên chủ tài khoản',
    envFallback: 'SEPAY_ACCOUNT_NAME',
  },
  {
    key: 'SEPAY_BANK_ID',
    label: 'Bank ID Sepay',
    group: SettingGroup.PAYMENT_SEPAY,
    isSecret: false,
    description: 'Mã ngân hàng (970422 = MB)',
    envFallback: 'SEPAY_BANK_ID',
  },
  {
    key: 'SEPAY_BANK_NAME',
    label: 'Tên ngân hàng',
    group: SettingGroup.PAYMENT_SEPAY,
    isSecret: false,
    description: 'Tên ngân hàng (ví dụ: MB)',
    envFallback: 'SEPAY_BANK_NAME',
  },
  // ── VNPay ────────────────────────────────────────────────────────────────
  {
    key: 'VNPAY_TMN_CODE',
    label: 'VNPay Terminal Code',
    group: SettingGroup.PAYMENT_VNPAY,
    isSecret: false,
    description: 'Terminal code từ VNPay',
    envFallback: 'VNPAY_TMN_CODE',
  },
  {
    key: 'VNPAY_HASH_SECRET',
    label: 'VNPay Hash Secret',
    group: SettingGroup.PAYMENT_VNPAY,
    isSecret: true,
    description: 'Hash secret từ VNPay',
    envFallback: 'VNPAY_HASH_SECRET',
  },
  {
    key: 'VNPAY_API_URL',
    label: 'VNPay API URL',
    group: SettingGroup.PAYMENT_VNPAY,
    isSecret: false,
    description: 'URL thanh toán VNPay',
    envFallback: 'VNPAY_API_URL',
  },
  {
    key: 'VNPAY_RETURN_URL',
    label: 'VNPay Return URL',
    group: SettingGroup.PAYMENT_VNPAY,
    isSecret: false,
    description: 'URL callback sau thanh toán thành công',
    envFallback: 'VNPAY_RETURN_URL',
  },
  // ── Google Maps ───────────────────────────────────────────────────────────
  
  {
    key: 'OSRM_BASE_URL',
    label: 'OSRM Base URL',
    group: SettingGroup.MAPS,
    isSecret: false,
    description: 'URL server OSRM để tính route (local hoặc public)',
    envFallback: 'OSRM_BASE_URL',
  },
  // ── Email ─────────────────────────────────────────────────────────────────
  {
    key: 'MAIL_HOST',
    label: 'SMTP Host',
    group: SettingGroup.EMAIL,
    isSecret: false,
    description: 'SMTP server host (vd: smtp.gmail.com)',
    envFallback: 'MAIL_HOST',
  },
  {
    key: 'MAIL_PORT',
    label: 'SMTP Port',
    group: SettingGroup.EMAIL,
    isSecret: false,
    description: 'SMTP port (thường 587 hoặc 465)',
    envFallback: 'MAIL_PORT',
  },
  {
    key: 'MAIL_USER',
    label: 'Email tài khoản gửi',
    group: SettingGroup.EMAIL,
    isSecret: false,
    description: 'Địa chỉ email dùng để gửi',
    envFallback: 'MAIL_USER',
  },
  {
    key: 'MAIL_PASS',
    label: 'Mật khẩu email',
    group: SettingGroup.EMAIL,
    isSecret: true,
    description: 'App password từ Gmail hoặc SMTP provider',
    envFallback: 'MAIL_PASS',
  },
];

@Injectable()
export class AppSettingsService implements OnModuleInit {
  private readonly logger = new Logger(AppSettingsService.name);
  private cache = new Map<string, string>();
  private cacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 phút

  constructor(
    @InjectModel(AppSetting.name)
    private readonly settingModel: Model<AppSettingDocument>,
  ) {}

  /** Chạy khi module khởi động — seed settings từ .env nếu chưa có trong DB */
  async onModuleInit() {
    await this.seedFromEnv();
    await this.refreshCache();
    this.logger.log(`✅ AppSettings loaded: ${this.cache.size} keys`);
  }

  /** Lấy giá trị config — ưu tiên DB, fallback .env */
  async get(key: string): Promise<string | undefined> {
    if (Date.now() > this.cacheExpiresAt) {
      await this.refreshCache();
    }
    return this.cache.get(key) ?? process.env[key];
  }

  /** Lấy ngay từ cache (không async) — dùng trong constructor của service khác */
  getSync(key: string): string | undefined {
    return this.cache.get(key) ?? process.env[key];
  }

  /** Lấy tất cả settings (cho web-admin) — mask giá trị secret */
  async findAll(showSecrets = false) {
    const docs = await this.settingModel.find().lean();
    return docs.map((doc) => ({
      ...doc,
      value: doc.isSecret && !showSecrets ? this.maskValue(doc.value) : doc.value,
    }));
  }

  /** Cập nhật 1 setting */
  async upsert(key: string, value: string): Promise<AppSettingDocument> {
    const doc = await this.settingModel.findOneAndUpdate(
      { key },
      { $set: { value } },
      { new: true, upsert: false }, // chỉ update, không tạo mới tùy tiện
    );
    if (!doc) {
      throw new Error(`Setting key "${key}" không tồn tại`);
    }
    // Invalidate cache
    this.cache.set(key, value);
    this.logger.log(`🔧 Setting updated: ${key}`);
    return doc;
  }

  /** Seed settings từ .env vào DB nếu chưa tồn tại */
  private async seedFromEnv() {
    for (const def of DEFAULT_SETTINGS) {
      const existing = await this.settingModel.findOne({ key: def.key });
      if (!existing) {
        const envValue = process.env[def.envFallback] || '';
        await this.settingModel.create({
          key: def.key,
          value: envValue,
          label: def.label,
          group: def.group,
          isSecret: def.isSecret,
          description: def.description,
        });
        this.logger.log(`📦 Seeded setting: ${def.key} = ${def.isSecret ? '***' : envValue}`);
      }
    }
  }

  /** Refresh in-memory cache từ DB */
  private async refreshCache() {
    const docs = await this.settingModel.find().lean();
    this.cache.clear();
    for (const doc of docs) {
      if (doc.value) {
        this.cache.set(doc.key, doc.value);
      }
    }
    this.cacheExpiresAt = Date.now() + this.CACHE_TTL_MS;
  }

  /** Invalidate cache (gọi sau khi update) */
  async invalidateCache() {
    this.cacheExpiresAt = 0;
  }

  private maskValue(value: string): string {
    if (!value || value.length <= 8) return '••••••••';
    return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4);
  }
}
