import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TeamStructure,
  TeamStructureDocument,
} from './schemas/team-structure.schema';
import { User, UserDocument } from '../auth/schemas/user.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
  TransactionStatus,
  UserType,
} from '../wallets/schemas/transaction.schema';

@Injectable()
export class TeamsService {
  constructor(
    @InjectModel(TeamStructure.name)
    private teamStructureModel: Model<TeamStructureDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
  ) {}

  async assignToTeam(
    userId: string,
    parentId: string,
    level: number,
  ): Promise<TeamStructure> {
    const parentNode = await this.teamStructureModel.findOne({
      userId: parentId,
    });
    let path = `,${userId},`;
    if (parentNode) {
      path = `${parentNode.path}${userId},`;
    }

    const teamNode = new this.teamStructureModel({
      userId,
      parentId,
      level,
      path,
    });
    return teamNode.save();
  }

  async getMyTeam(userId: string): Promise<TeamStructure[]> {
    // Find my node first
    const myNode = await this.teamStructureModel.findOne({ userId });
    if (!myNode) {
      return [];
    }

    // Find all nodes that contains my userId in their path
    // But excluding myself
    return this.teamStructureModel
      .find({
        path: { $regex: `,${userId},` },
        userId: { $ne: userId },
      })
      .exec();
  }

  /**
   * Tính toán và phân bổ hoa hồng Marketing sau mỗi chuyến xe (chờ duyệt 24-72h)
   */
  async processMarketingCommission(
    driverId: string,
    rideId: string,
    basePlatformFee: number,
  ) {
    if (basePlatformFee <= 0) return;

    const driver = await this.driverModel.findById(driverId);
    if (!driver || !driver.marketingReferrerId) {
      return; // Không có marketing referrer
    }

    const marketingStaffId = driver.marketingReferrerId;

    // Lấy cấu trúc team của Marketing Staff
    const staffNode = await this.teamStructureModel.findOne({
      userId: marketingStaffId,
    });
    if (!staffNode) {
      console.warn(
        `[Marketing] Staff ${marketingStaffId} does not have a team_structure node`,
      );
      // Vẫn tìm User và cho vào 1% nếu muốn, nhưng thôi ta dựa vào cây path
    }

    // Ta cần xác định F3, F2, F1
    // F3 = staffsNode (nếu level 3)
    // Hoặc nếu F2 tuyển trực tiếp thì f2 là staffsNode
    // Hoa hồng mặc định theo Level: F1: 8%, F2: 3%, F3: 1%

    const amounts = {
      1: Math.round(basePlatformFee * 0.08), // F1 8%
      2: Math.round(basePlatformFee * 0.03), // F2 3%
      3: Math.round(basePlatformFee * 0.01), // F3 1%
    };

    // Tạo danh sách ID theo level để phát hoa hồng
    const payoutTargets: { [level: number]: Types.ObjectId } = {};

    if (staffNode) {
      payoutTargets[staffNode.level] = staffNode.userId; // Trả cho chính người tuyển

      // Phân tích đường dẫn ',F1_ID,F2_ID,'
      const parentIdsStr = staffNode.path.split(',').filter(Boolean); // Loại bỏ rỗng

      // Lấy tất cả parent node để lấy level tương ứng
      if (parentIdsStr.length > 0) {
        const parents = await this.teamStructureModel.find({
          userId: { $in: parentIdsStr },
        });
        for (const parent of parents) {
          payoutTargets[parent.level] = parent.userId;
        }
      }
    } else {
      // Fallback cho nhân viên không có trong cấu trúc nhưng có trong users table
      const staffUser = await this.userModel.findById(marketingStaffId);
      if (staffUser && staffUser.role === 'f3_staff_mkt')
        payoutTargets[3] = staffUser._id as Types.ObjectId;
      if (staffUser && staffUser.role === 'f2_sub_lead')
        payoutTargets[2] = staffUser._id as Types.ObjectId;
      if (staffUser && staffUser.role === 'f1_lead')
        payoutTargets[1] = staffUser._id as Types.ObjectId;
    }

    // Phát hoa hồng (Save Transactions with lock_until)
    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + 1); // Khóa 24h

    for (const levelStr of Object.keys(payoutTargets)) {
      const level = parseInt(levelStr);
      const userId = payoutTargets[level];
      const amount = amounts[level];

      if (amount > 0 && userId) {
        // Cập nhật ví User dạng pending
        await this.userModel.findByIdAndUpdate(userId, {
          $inc: { pendingBalance: amount },
        });

        // Ghi lại giao dịch
        await this.transactionModel.create({
          userType: UserType.USER,
          userId: userId,
          driverId: new Types.ObjectId(driverId), // Ai là tài xế tạo ra cuốc này
          rideId: new Types.ObjectId(rideId),
          type: TransactionType.MARKETING_COMMISSION,
          status: TransactionStatus.PENDING,
          amount: amount,
          balanceBefore: 0, // Tính sau do pending
          balanceAfter: 0,
          metadata: {
            levelEarned: level,
            unlockDate: unlockDate,
          },
        });

        console.log(
          `[Marketing] ✨ Payout Level ${level} -> User ${userId} : +${amount}đ`,
        );
      }
    }
  }
}
