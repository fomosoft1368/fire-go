import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  TeamStructure,
  TeamStructureDocument,
} from './schemas/team-structure.schema';
import { User, UserDocument, UserRole } from '../auth/schemas/user.schema';
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

  // ─── Onboarding: Gán thành viên mới vào cây team ──────────────────────────
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

  // ─── Lấy danh sách thành viên trong team của tôi ──────────────────────────
  async getMyTeam(userId: string): Promise<TeamStructure[]> {
    const myNode = await this.teamStructureModel.findOne({ userId });
    if (!myNode) return [];

    // Tất cả node có path chứa userId của tôi = subordinates của tôi
    return this.teamStructureModel
      .find({
        path: { $regex: `,${userId},` },
        userId: { $ne: userId },
      })
      .exec();
  }

  /**
   * Lấy danh sách ID của toàn bộ subordinates trong cây team của userId
   * Dùng để filter driver / transaction chỉ thuộc đội này
   */
  private async getTeamMemberIds(userId: string): Promise<string[]> {
    const myNode = await this.teamStructureModel.findOne({ userId });
    if (!myNode) return [userId]; // Chỉ bản thân (F3 không có subordinates)

    const nodes = await this.teamStructureModel
      .find({
        path: { $regex: `,${userId},` },
      })
      .select('userId')
      .lean();

    const ids = nodes.map((n) => n.userId.toString());
    if (!ids.includes(userId)) ids.push(userId);
    return ids;
  }

  /**
   * Dashboard dữ liệu theo phạm vi team (team isolation)
   * - F1: thấy toàn bộ F2 + F3 thuộc cây của mình
   * - F2: thấy toàn bộ F3 thuộc cây của mình
   * - F3: chỉ thấy dữ liệu cá nhân
   * - Commission: chỉ tính giao dịch từ driver trong team mình tuyển
   */
  async getMyDashboard(callerId: string, targetUserId?: string): Promise<any> {
    const userIdToFetch = targetUserId || callerId;

    if (targetUserId && targetUserId !== callerId) {
      // Xác minh quyền: targetUserId phải thuộc cây của callerId
      const allSubordinates = await this.getTeamMemberIds(callerId);
      if (!allSubordinates.includes(targetUserId)) {
        throw new ForbiddenException('Không có quyền truy cập dữ liệu của thành viên này');
      }
    }

    const myUser = await this.userModel.findById(userIdToFetch).lean();
    if (!myUser) throw new NotFoundException('User not found');

    const myNode = await this.teamStructureModel.findOne({ userId: userIdToFetch }).lean();

    // Lấy thông tin người quản lý trực tiếp
    let managerInfo = null;
    if (myNode && myNode.parentId) {
      const managerUser = await this.userModel.findById(myNode.parentId).select('firstName lastName role email phone').lean();
      if (managerUser) {
        managerInfo = {
          _id: managerUser._id,
          name: `${managerUser.firstName} ${managerUser.lastName}`.trim(),
          role: managerUser.role,
          phone: managerUser.phone,
          email: managerUser.email,
        };
      }
    }

    // 1. Lấy tất cả member IDs trong subtree (bao gồm bản thân)
    const allMemberIds = await this.getTeamMemberIds(userIdToFetch);
    const allMemberObjectIds = allMemberIds.map(
      (id) => new Types.ObjectId(id),
    );

    // 2. Lấy thông tin thành viên
    const members = await this.userModel
      .find({
        _id: { $in: allMemberObjectIds },
        role: {
          $in: [
            UserRole.F1_LEAD,
            UserRole.F2_SUB_LEAD,
            UserRole.F3_STAFF_MKT,
          ],
        },
      })
      .select(
        '_id firstName lastName email phone role status referralCode walletBalance pendingBalance address regionId createdAt',
      )
      .populate('regionId', 'name')
      .lean();

    // Map regionId to region for frontend compatibility
    const membersWithRegion = members.map((m: any) => ({
      ...m,
      region: m.regionId,
    }));

    // 3. Thống kê phân cấp (chỉ trong team)
    const f1Count = membersWithRegion.filter((m) => m.role === UserRole.F1_LEAD && m.status === 'active').length;
    const f2Count = membersWithRegion.filter((m) => m.role === UserRole.F2_SUB_LEAD && m.status === 'active').length;
    const f3Count = membersWithRegion.filter((m) => m.role === UserRole.F3_STAFF_MKT && m.status === 'active').length;

    // 4. Lấy F3 IDs trong team (chỉ F3 mới tuyển tài xế)
    const f3Ids = membersWithRegion
      .filter((m) => m.role === UserRole.F3_STAFF_MKT)
      .map((m) => m._id);

    // 5. Tài xế do team này tuyển (marketingReferrerId phải là F3 trong team)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyDrivers = await this.driverModel
      .countDocuments({
        marketingReferrerId: { $in: f3Ids },
        createdAt: { $gte: startOfMonth },
      });

    const totalDriversByTeam = await this.driverModel
      .countDocuments({
        marketingReferrerId: { $in: f3Ids },
      });

    // 6. Hoa hồng ĐÃ nhận (chỉ của bản thân userId - không tổng hợp team)
    const myCommissionTxns = await this.transactionModel
      .find({
        userId: new Types.ObjectId(userIdToFetch),
        userType: UserType.USER,
        type: TransactionType.MARKETING_COMMISSION,
        status: TransactionStatus.COMPLETED,
      })
      .lean();

    const myPendingTxns = await this.transactionModel
      .find({
        userId: new Types.ObjectId(userIdToFetch),
        userType: UserType.USER,
        type: TransactionType.MARKETING_COMMISSION,
        status: TransactionStatus.PENDING,
      })
      .lean();

    const walletBalance = myUser.walletBalance ?? 0;
    const pendingBalance = myUser.pendingBalance ?? 0;

    // 7. Tổng giao dịch từ mạng lưới (tài xế thuộc team này thực hiện)
    const teamDriverIds = await this.driverModel
      .find({ marketingReferrerId: { $in: f3Ids } })
      .select('_id')
      .lean();
    const teamDriverObjectIds = teamDriverIds.map((d) => d._id);

    const totalTransactions = await this.transactionModel.countDocuments({
      driverId: { $in: teamDriverObjectIds },
      type: TransactionType.MARKETING_COMMISSION,
    });

    return {
      me: {
        _id: myUser._id,
        firstName: myUser.firstName,
        lastName: myUser.lastName,
        email: myUser.email,
        phone: myUser.phone,
        role: myUser.role,
        status: myUser.status,
        referralCode: myUser.referralCode,
        walletBalance,
        pendingBalance,
        level: myNode?.level ?? 1,
        manager: managerInfo,
      },
      members: membersWithRegion,
      stats: {
        totalNetwork: members.length,
        activeF1: f1Count,
        activeF2: f2Count,
        activeF3: f3Count,
        monthlyDrivers,
        totalDriversByTeam,
        totalTransactions,
        totalCommission: walletBalance,
        pendingCommission: pendingBalance,
        commissionHistory: myCommissionTxns.length,
      },
    };
  }

  /**
   * Lấy danh sách thành viên trong team (có phân trang)
   */
  async getMyMembers(
    callerId: string,
    page = 1,
    limit = 50,
    targetUserId?: string
  ): Promise<{ members: any[]; total: number; page: number; limit: number }> {
    const userIdToFetch = targetUserId || callerId;

    if (targetUserId && targetUserId !== callerId) {
      // Xác minh quyền: targetUserId phải thuộc cây của callerId
      const allSubordinates = await this.getTeamMemberIds(callerId);
      if (!allSubordinates.includes(targetUserId)) {
        throw new ForbiddenException('Không có quyền truy cập danh sách thành viên này');
      }
    }

    const allMemberIds = await this.getTeamMemberIds(userIdToFetch);
    const allMemberObjectIds = allMemberIds
      .filter((id) => id !== userIdToFetch) // Không trả về bản thân
      .map((id) => new Types.ObjectId(id));

    const total = allMemberObjectIds.length;
    const skip = (page - 1) * limit;

    const members = await this.userModel
      .find({
        _id: { $in: allMemberObjectIds },
        role: {
          $in: [
            UserRole.F1_LEAD,
            UserRole.F2_SUB_LEAD,
            UserRole.F3_STAFF_MKT,
          ],
        },
      })
      .select(
        '_id firstName lastName email phone role status referralCode walletBalance pendingBalance address regionId createdAt',
      )
      .populate('regionId', 'name')
      .skip(skip)
      .limit(limit)
      .lean();

    // Enrich với parentId từ TeamStructure
    const memberIdSet = new Set(allMemberObjectIds.map((id) => id.toString()));
    const nodes = await this.teamStructureModel
      .find({ userId: { $in: allMemberObjectIds } })
      .lean();
    const nodeMap = new Map(nodes.map((n) => [n.userId.toString(), n]));

    const enriched = members.map((m: any) => {
      const node = nodeMap.get(m._id.toString());
      return {
        ...m,
        region: m.regionId,
        level: node?.level ?? null,
        parentId: node?.parentId ?? null,
      };
    });

    return { members: enriched, total, page, limit };
  }

  /**
   * Lấy danh sách tài xế mà user đã tuyển (marketingReferrerId)
   */
  async getMyDrivers(
    callerId: string,
    page = 1,
    limit = 50,
    targetUserId?: string
  ): Promise<{ drivers: any[]; total: number; page: number; limit: number }> {
    const userIdToFetch = targetUserId || callerId;

    if (targetUserId && targetUserId !== callerId) {
      // Xác minh quyền
      const allSubordinates = await this.getTeamMemberIds(callerId);
      if (!allSubordinates.includes(targetUserId)) {
        throw new ForbiddenException('Không có quyền truy cập danh sách tài xế của thành viên này');
      }
    }

    const skip = (page - 1) * limit;
    const query = { marketingReferrerId: new Types.ObjectId(userIdToFetch) };
    const total = await this.driverModel.countDocuments(query);
    
    const drivers = await this.driverModel
      .find(query)
      .select('_id firstName lastName email phone vehiclePlate status isVerified completedRides walletBalance createdAt')
      .skip(skip)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return { drivers, total, page, limit };
  }

  /**
   * Thêm thành viên mới (F2 chỉ được thêm F3, F1 được thêm F2 hoặc F3)
   */
  async addMemberToMyTeam(
    callerId: string,
    callerRole: string,
    newMemberId: string,
    newMemberRole: string,
  ): Promise<TeamStructure> {
    // Kiểm tra quyền
    if (callerRole === UserRole.F3_STAFF_MKT) {
      throw new ForbiddenException('F3 không có quyền thêm thành viên');
    }
    if (
      callerRole === UserRole.F2_SUB_LEAD &&
      newMemberRole !== UserRole.F3_STAFF_MKT
    ) {
      throw new ForbiddenException('F2 chỉ được thêm F3');
    }

    const existing = await this.teamStructureModel.findOne({
      userId: newMemberId,
    });
    if (existing) {
      throw new BadRequestException(
        'Thành viên này đã thuộc một team khác',
      );
    }

    const level =
      newMemberRole === UserRole.F3_STAFF_MKT
        ? 3
        : newMemberRole === UserRole.F2_SUB_LEAD
          ? 2
          : 1;

    return this.assignToTeam(newMemberId, callerId, level);
  }

  /**
   * Tính toán và phân bổ hoa hồng Marketing (team-isolated)
   * CHỈ pays cho F3→F2→F1 trong CÙNG chuỗi referrer của driver
   * Tài xế do F3 team A tuyển → chỉ F3 team A, F2 trên F3 đó, F1 trên F2 đó được hưởng
   */
  async processMarketingCommission(
    driverId: string,
    rideId: string,
    basePlatformFee: number,
  ) {
    if (basePlatformFee <= 0) return;

    const driver = await this.driverModel.findById(driverId);
    if (!driver || !driver.marketingReferrerId) {
      return; // Tài xế này không có marketing referrer → không tính
    }

    const marketingStaffId = driver.marketingReferrerId.toString();

    // Lấy node trong cây của marketing staff (F3 tuyển driver này)
    const staffNode = await this.teamStructureModel.findOne({
      userId: marketingStaffId,
    });

    if (!staffNode) {
      console.warn(
        `[Marketing] Staff ${marketingStaffId} không có team_structure node`,
      );
      return;
    }

    // Tỷ lệ hoa hồng theo cấp (từ phí nền tảng - tuân thủ nguyên tắc 50/50)
    // Công ty thu 20% phí nền tảng → trích 50% = 10% GMV để trả Sale
    // F1: 10% phí nền tảng (= 2% GMV), F2: 15% (= 3% GMV), F3: 25% (= 5% GMV)
    const rates: Record<number, number> = {
      1: 0.10, // F1 nhận 10% của platform fee
      2: 0.15, // F2 nhận 15% của platform fee
      3: 0.25, // F3 nhận 25% của platform fee
    };

    // Phân tích chuỗi path để lấy F1→F2→F3 trong cùng chain
    // path ví dụ: ",F1_ID,F2_ID,F3_ID,"
    const pathIds = staffNode.path.split(',').filter(Boolean);
    // Lấy tất cả nodes trong chain này
    const chainNodes = await this.teamStructureModel
      .find({ userId: { $in: pathIds } })
      .lean();

    const payoutMap: Map<number, Types.ObjectId> = new Map();

    // Gán level→userId trong chuỗi
    for (const node of chainNodes) {
      payoutMap.set(node.level, node.userId);
    }
    // Thêm chính staffNode
    payoutMap.set(staffNode.level, staffNode.userId);

    const unlockDate = new Date();
    unlockDate.setDate(unlockDate.getDate() + 1); // Khóa 24h

    for (const [level, userId] of payoutMap.entries()) {
      const rate = rates[level];
      if (!rate) continue;
      const amount = Math.round(basePlatformFee * rate);
      if (amount <= 0) continue;

      // Cộng vào pendingBalance
      await this.userModel.findByIdAndUpdate(userId, {
        $inc: { pendingBalance: amount },
      });

      // Ghi transaction
      await this.transactionModel.create({
        userType: UserType.USER,
        userId,
        driverId: new Types.ObjectId(driverId),
        rideId: new Types.ObjectId(rideId),
        type: TransactionType.MARKETING_COMMISSION,
        status: TransactionStatus.PENDING,
        amount,
        balanceBefore: 0,
        balanceAfter: 0,
        metadata: {
          levelEarned: level,
          unlockDate,
          platformFee: basePlatformFee,
        },
      });

      console.log(
        `[Marketing] ✨ Payout Level ${level} → User ${userId} : +${amount}đ (từ driver ${driverId})`,
      );
    }
  }

  /**
   * Duyệt hoa hồng (chuyển từ pending sang completed)
   */
  async approveCommission(userId: string): Promise<void> {
    const pending = await this.transactionModel.find({
      userId: new Types.ObjectId(userId),
      type: TransactionType.MARKETING_COMMISSION,
      status: TransactionStatus.PENDING,
      'metadata.unlockDate': { $lte: new Date() },
    });

    let totalApproved = 0;
    for (const txn of pending) {
      await this.transactionModel.findByIdAndUpdate(txn._id, {
        status: TransactionStatus.COMPLETED,
        completedAt: new Date(),
      });
      totalApproved += txn.amount;
    }

    if (totalApproved > 0) {
      await this.userModel.findByIdAndUpdate(userId, {
        $inc: {
          walletBalance: totalApproved,
          pendingBalance: -totalApproved,
        },
      });
    }
  }
}
