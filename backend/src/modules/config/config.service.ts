import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  DriverSearchConfig,
  DriverSearchConfigDocument,
  ServiceType,
} from './schemas/driver-search-config.schema';

@Injectable()
export class ConfigService implements OnModuleInit {
  constructor(
    @InjectModel(DriverSearchConfig.name)
    private configModel: Model<DriverSearchConfigDocument>,
  ) {}

  // Initialize default configs on startup
  async onModuleInit() {
    await this.initializeDefaultConfigs();
  }

  private async initializeDefaultConfigs() {
    const defaultConfigs = [
      {
        serviceType: ServiceType.HIRE,
        searchRadiusMeters: 15000, // 15km for hire driver
        maxDriversToNotify: 10,
        requestTimeoutMs: 45000, // 45 seconds
        isActive: true,
        description: 'Cấu hình tìm tài xế cho dịch vụ lái xe hộ',
      },
      {
        serviceType: ServiceType.RIDESHARE,
        searchRadiusMeters: 10000, // 10km for rideshare
        maxDriversToNotify: 10,
        requestTimeoutMs: 50000, // 50 seconds
        isActive: true,
        description: 'Cấu hình tìm tài xế cho dịch vụ ghép xe',
      },
      {
        serviceType: ServiceType.DELIVERY,
        searchRadiusMeters: 20000, // 20km for delivery
        maxDriversToNotify: 15,
        requestTimeoutMs: 60000, // 60 seconds
        isActive: true,
        description: 'Cấu hình tìm tài xế cho dịch vụ giao hàng',
      },
    ];

    for (const config of defaultConfigs) {
      const existing = await this.configModel.findOne({
        serviceType: config.serviceType,
      });

      if (!existing) {
        await this.configModel.create(config);
        console.log(`✅ Created default config for ${config.serviceType}`);
      }
    }
  }

  // Get all configs
  async getAllConfigs(): Promise<DriverSearchConfig[]> {
    return this.configModel.find().sort({ serviceType: 1 }).exec();
  }

  // Get config by service type
  async getConfigByServiceType(
    serviceType: ServiceType,
  ): Promise<DriverSearchConfig> {
    const config = await this.configModel.findOne({ serviceType }).exec();

    if (!config) {
      throw new NotFoundException(
        `Config not found for service type: ${serviceType}`,
      );
    }

    return config;
  }

  // Update config
  async updateConfig(
    serviceType: ServiceType,
    updateData: Partial<DriverSearchConfig>,
  ): Promise<DriverSearchConfig> {
    const config = await this.configModel.findOneAndUpdate(
      { serviceType },
      { $set: updateData },
      { new: true, upsert: true },
    );

    console.log(`✅ Updated config for ${serviceType}:`, updateData);
    return config;
  }

  // Helper: Get search radius for a service type
  async getSearchRadius(serviceType: ServiceType): Promise<number> {
    try {
      const config = await this.getConfigByServiceType(serviceType);
      return config.searchRadiusMeters;
    } catch (error) {
      console.warn(
        `⚠️ Config not found for ${serviceType}, using default 10000m`,
      );
      return 10000; // Default fallback
    }
  }

  // Helper: Get max drivers to notify
  async getMaxDriversToNotify(serviceType: ServiceType): Promise<number> {
    try {
      const config = await this.getConfigByServiceType(serviceType);
      return config.maxDriversToNotify;
    } catch (error) {
      return 10; // Default fallback
    }
  }

  // Helper: Get request timeout
  async getRequestTimeout(serviceType: ServiceType): Promise<number> {
    try {
      const config = await this.getConfigByServiceType(serviceType);
      return config.requestTimeoutMs;
    } catch (error) {
      return 45000; // Default 45 seconds
    }
  }
}
