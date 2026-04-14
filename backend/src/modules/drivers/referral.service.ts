import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Driver, DriverDocument } from './schemas/driver.schema';
import {
  ReferralTransaction,
  ReferralTransactionDocument,
} from './schemas/referral-transaction.schema';

@Injectable()
export class ReferralService {
  private readonly logger = new Logger(ReferralService.name);

  constructor(
    @InjectModel(ReferralTransaction.name)
    private referralTransactionModel: Model<ReferralTransactionDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
  ) {}

  /**
   * Cron job chạy mỗi tiếng để quét và mở khóa các transaction cũ (đã qua 1 ngày)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async unlockCommissions() {
    this.logger.log('Bắt đầu quy trình kiểm tra và mở khóa tiền hoa hồng...');

    const now = new Date();
    // Tìm các giao dịch pending mà unlockDate <= lúc này
    const pendingTransactions = await this.referralTransactionModel.find({
      status: 'pending',
      unlockDate: { $lte: now },
    });

    if (pendingTransactions.length === 0) {
      this.logger.log('Không có giao dịch hoa hồng nào cần mở khóa lúc này.');
      return;
    }

    let processedCount = 0;
    for (const trx of pendingTransactions) {
      // Bắt đầu mở khóa và cộng tiền
      try {
        const amount = trx.amount;
        if (amount > 0) {
          await this.driverModel.findByIdAndUpdate(trx.toDriverId, {
            $inc: {
              walletBalance: amount,
              totalReferralEarnings: amount,
            },
          });
        }

        // Cập nhật trạng thái
        trx.status = 'completed';
        await trx.save();

        processedCount++;
      } catch (error) {
        this.logger.error(
          `Lỗi khi mở khóa hoa hồng cho ID: ${trx._id}`,
          error.stack,
        );
      }
    }

    this.logger.log(
      `Hoàn thành. Đã mở khóa được ${processedCount} giao dịch hoa hồng.`,
    );
  }

  /**
   * Tính toán và ghi nhận hoa hồng sau chuyến đi (Chờ)
   * Hàm này có thể được gọi ở trong completeRide
   */
  async processRideCommission(
    fromDriverId: string,
    rideId: string,
    basePlatformFee: number,
  ) {
    if (basePlatformFee <= 0) return; // Không có phí thì không có HH

    const driver = await this.driverModel.findById(fromDriverId);
    if (!driver) return;

    // Tính toán %
    const f1Amount = Math.round(basePlatformFee * 0.08); // 8%
    const f2Amount = Math.round(basePlatformFee * 0.03); // 3%
    const f3Amount = Math.round(basePlatformFee * 0.01); // 1%

    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + 1); // 1 Ngày sau (24 hours)

    // Tạo transaction nếu có ReferralF1
    if (driver.referralF1 && f1Amount > 0) {
      await this.saveCommission(
        fromDriverId,
        driver.referralF1.toString(),
        rideId,
        f1Amount,
        'F1',
        unlockDate,
      );
    }

    // Tạo transaction nếu có ReferralF2
    if (driver.referralF2 && f2Amount > 0) {
      await this.saveCommission(
        fromDriverId,
        driver.referralF2.toString(),
        rideId,
        f2Amount,
        'F2',
        unlockDate,
      );
    }

    // Tạo transaction nếu có ReferralF3
    if (driver.referralF3 && f3Amount > 0) {
      await this.saveCommission(
        fromDriverId,
        driver.referralF3.toString(),
        rideId,
        f3Amount,
        'F3',
        unlockDate,
      );
    }
  }

  private async saveCommission(
    fromId: string,
    toId: string,
    rideId: string,
    amount: number,
    tier: string,
    unlockDate: Date,
  ) {
    await this.referralTransactionModel.create({
      fromDriverId: new Types.ObjectId(fromId),
      toDriverId: new Types.ObjectId(toId),
      rideId: rideId ? new Types.ObjectId(rideId) : null,
      amount,
      tier,
      status: 'pending',
      unlockDate,
    });
  }

  /**
   * Lấy danh sách tuyến dưới của một tài xế và thống kê hoa hồng mang lại
   */
  async getDownlines(driverId: string) {
    // Pipeline aggregation
    // Lấy tất cả các ReferralTransaction mà toDriverId = mình
    // Group theo fromDriverId để tính tổng
    const downlinesAggregation = await this.referralTransactionModel.aggregate([
      { $match: { toDriverId: new Types.ObjectId(driverId) } },
      {
        $group: {
          _id: '$fromDriverId',
          tier: { $first: '$tier' }, // Mỗi fromDriverId chỉ có 1 tier tương đối với toDriverId này (hoặc F1, hoặc F2, hoặc F3)
          totalEarned: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$amount', 0],
            },
          },
          totalPending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0],
            },
          },
          totalRidesFromThem: { $sum: 1 }, // Số lượng giao dịch tương đương số lượng cuốc đã chạy
        },
      },
    ]);

    // Cũng cần xem có downlines nào mới đăng ký nhưng chưa chạy cuốc không
    // Tìm tất cả driver nhận mình làm referralF1, referralF2, referralF3
    const allDownlines = await this.driverModel
      .find({
        $or: [
          { referralF1: new Types.ObjectId(driverId) },
          { referralF2: new Types.ObjectId(driverId) },
          { referralF3: new Types.ObjectId(driverId) },
        ],
      })
      .select(
        'firstName lastName vehicleImage portraitImage phone totalRides referralF1 referralF2 referralF3 createdAt',
      );

    const result = allDownlines.map((d) => {
      // Xác định tier của người này đối với driverId
      let tier = '';
      if (d.referralF1?.toString() === driverId) tier = 'F1';
      else if (d.referralF2?.toString() === driverId) tier = 'F2';
      else if (d.referralF3?.toString() === driverId) tier = 'F3';

      const stat = downlinesAggregation.find(
        (x) => x._id.toString() === d._id.toString(),
      );

      return {
        id: d._id,
        name: `${d.firstName} ${d.lastName}`.trim(),
        avatar: (d as any).portraitImage || d.vehicleImage,
        phone: d.phone,
        joinedDate: (d as any).createdAt,
        tier,
        totalRides: d.totalRides || 0,
        totalEarned: stat ? stat.totalEarned : 0,
        totalPending: stat ? stat.totalPending : 0,
      };
    });

    // Sắp xếp F1 -> F2 -> F3
    result.sort((a, b) => a.tier.localeCompare(b.tier));

    // Tính level của driver hiện tại
    const currentDriver = await this.driverModel.findById(driverId);
    let myLevel = 'Root / F0'; // Không bị ai giới thiệu
    if (currentDriver && currentDriver.referralF3) myLevel = 'F4 (tương đối)'; // Ví dụ vậy, F1, F2, F3 của người khác
    if (currentDriver && currentDriver.referralF2 && !currentDriver.referralF3)
      myLevel = 'F3 của Root';
    if (currentDriver && currentDriver.referralF1 && !currentDriver.referralF2)
      myLevel = 'F2 của Root';
    if (
      currentDriver &&
      currentDriver.referralF1 &&
      !currentDriver.referralF2 &&
      !currentDriver.referralF3
    )
      myLevel = 'F1 của Root';
    if (currentDriver && currentDriver.referralF1) {
      myLevel = 'Đại sứ (được giới thiệu)';
    } else {
      myLevel = 'Đại sứ Cấp Đỉnh (Không có tuyến trên)';
    }

    return {
      myLevel,
      downlines: result,
    };
  }
}
