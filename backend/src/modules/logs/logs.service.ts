import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log, LogDocument } from './schemas/log.schema';

@Injectable()
export class LogsService {
  private readonly logger = new Logger(LogsService.name);

  constructor(@InjectModel(Log.name) private logModel: Model<LogDocument>) {}

  /**
   * Lưu log từ App lên DB
   */
  async createLog(data: {
    appName: string;
    functionName: string;
    errorMessage: string;
    errorStack?: string;
    extraData?: any;
  }) {
    try {
      const newLog = await this.logModel.create(data);
      this.logger.error(
        `[${data.appName}] Frontend Error in ${data.functionName}: ${data.errorMessage}`,
      );
      return newLog;
    } catch (error) {
      this.logger.error('Failed to insert log to DB', error);
      return null;
    }
  }

  /**
   * Lấy danh sách logs cho Admin
   */
  async getLogs(page: number = 1, limit: number = 50) {
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.logModel
        .find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.logModel.countDocuments(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Xem chi tiết 1 log
   */
  async getLogById(id: string) {
    return this.logModel.findById(id);
  }
}
