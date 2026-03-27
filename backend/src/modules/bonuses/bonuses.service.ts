import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BonusRule, BonusRuleDocument, BonusPeriod } from './schemas/bonus-rule.schema';
import { BonusClaim, BonusClaimDocument } from './schemas/bonus-claim.schema';
import { Ride, RideDocument } from '../rides/schemas/ride.schema';
import { WalletsService } from '../wallets/wallets.service';
import { TransactionType, UserType } from '../wallets/schemas/transaction.schema';

@Injectable()
export class BonusesService {
  constructor(
    @InjectModel(BonusRule.name) private bonusRuleModel: Model<BonusRuleDocument>,
    @InjectModel(BonusClaim.name) private bonusClaimModel: Model<BonusClaimDocument>,
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    private readonly walletsService: WalletsService,
  ) {}

  // ==================== ADMIN: Rule Management ====================

  async createRule(data: {
    name: string;
    description?: string;
    period: BonusPeriod;
    requiredTrips: number;
    bonusAmount: number;
    isActive?: boolean;
  }): Promise<BonusRuleDocument> {
    return this.bonusRuleModel.create(data);
  }

  async updateRule(id: string, data: Partial<{
    name: string;
    description: string;
    period: BonusPeriod;
    requiredTrips: number;
    bonusAmount: number;
    isActive: boolean;
  }>): Promise<BonusRuleDocument> {
    const rule = await this.bonusRuleModel.findByIdAndUpdate(id, data, { new: true });
    if (!rule) throw new NotFoundException('Không tìm thấy quy tắc thưởng');
    return rule;
  }

  async deleteRule(id: string): Promise<void> {
    const result = await this.bonusRuleModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Không tìm thấy quy tắc thưởng');
  }

  async getAllRules(): Promise<BonusRuleDocument[]> {
    return this.bonusRuleModel.find().sort({ period: 1, requiredTrips: 1 }).lean() as any;
  }

  async getActiveRules(): Promise<BonusRuleDocument[]> {
    return this.bonusRuleModel.find({ isActive: true }).sort({ period: 1, requiredTrips: 1 }).lean() as any;
  }

  // ==================== Period Helpers ====================

  private getPeriodRange(period: BonusPeriod, now = new Date()): { start: Date; end: Date } {
    const start = new Date(now);
    const end = new Date(now);

    if (period === 'daily') {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'weekly') {
      const day = start.getDay(); // 0=Sun
      const diffToMon = (day === 0 ? -6 : 1 - day);
      start.setDate(start.getDate() + diffToMon);
      start.setHours(0, 0, 0, 0);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
    } else if (period === 'monthly') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
    } else {
      // yearly
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
    }

    return { start, end };
  }

  private async getCompletedTripsCount(driverId: string, start: Date, end: Date): Promise<number> {
    return this.rideModel.countDocuments({
      driverId: new Types.ObjectId(driverId),
      status: 'completed',
      completedAt: { $gte: start, $lte: end },
    });
  }

  // ==================== DRIVER: Progress ====================

  async getDriverProgress(driverId: string): Promise<{
    rule: BonusRuleDocument;
    period: BonusPeriod;
    periodStart: Date;
    periodEnd: Date;
    tripCount: number;
    requiredTrips: number;
    bonusAmount: number;
    progress: number; // 0-100 percent
    isEligible: boolean;
    claimStatus: string | null; // null | 'pending' | 'approved' | 'rejected'
    rejectionReason: string | null;
    claimId: string | null;
  }[]> {
    const rules = await this.getActiveRules();
    const results = [];

    for (const rule of rules) {
      const { start, end } = this.getPeriodRange(rule.period as BonusPeriod);
      const tripCount = await this.getCompletedTripsCount(driverId, start, end);

      // Check existing claim for this period
      const existingClaim = await this.bonusClaimModel.findOne({
        driverId: new Types.ObjectId(driverId),
        bonusRuleId: rule._id,
        periodStart: start,
        periodEnd: end,
      }).lean();

      const progress = Math.min(100, Math.round((tripCount / rule.requiredTrips) * 100));
      const isEligible = tripCount >= rule.requiredTrips;

      results.push({
        rule,
        period: rule.period,
        periodStart: start,
        periodEnd: end,
        tripCount,
        requiredTrips: rule.requiredTrips,
        bonusAmount: rule.bonusAmount,
        progress,
        isEligible,
        claimStatus: existingClaim ? existingClaim.status : null,
        rejectionReason: existingClaim?.rejectionReason || null,
        claimId: existingClaim ? (existingClaim as any)._id.toString() : null,
      });
    }

    return results;
  }

  // ==================== DRIVER: Create Claim ====================

  async createClaim(driverId: string, bonusRuleId: string): Promise<BonusClaimDocument> {
    const rule = await this.bonusRuleModel.findById(bonusRuleId);
    if (!rule) throw new NotFoundException('Không tìm thấy quy tắc thưởng');
    if (!rule.isActive) throw new BadRequestException('Quy tắc thưởng này không còn hiệu lực');

    const { start, end } = this.getPeriodRange(rule.period as BonusPeriod);
    const tripCount = await this.getCompletedTripsCount(driverId, start, end);

    if (tripCount < rule.requiredTrips) {
      throw new BadRequestException(
        `Bạn cần hoàn thành ${rule.requiredTrips} chuyến. Hiện tại: ${tripCount} chuyến.`
      );
    }

    // Check for duplicate claim in same period
    const existing = await this.bonusClaimModel.findOne({
      driverId: new Types.ObjectId(driverId),
      bonusRuleId: new Types.ObjectId(bonusRuleId),
      periodStart: start,
      periodEnd: end,
      status: { $in: ['pending', 'approved'] },
    });

    if (existing) {
      throw new ConflictException('Bạn đã gửi yêu cầu nhận thưởng cho kỳ này rồi');
    }

    return this.bonusClaimModel.create({
      driverId: new Types.ObjectId(driverId),
      bonusRuleId: new Types.ObjectId(bonusRuleId),
      periodStart: start,
      periodEnd: end,
      tripCount,
      bonusAmount: rule.bonusAmount,
      status: 'pending',
    });
  }

  // ==================== DRIVER: Get Own Claims ====================

  async getDriverClaims(driverId: string): Promise<BonusClaimDocument[]> {
    return this.bonusClaimModel
      .find({ driverId: new Types.ObjectId(driverId) })
      .populate('bonusRuleId', 'name period requiredTrips bonusAmount')
      .sort({ createdAt: -1 })
      .lean() as any;
  }

  // ==================== ADMIN: Get All Claims ====================

  async getAdminClaims(status?: string): Promise<any[]> {
    const filter: any = {};
    if (status) filter.status = status;

    const claims = await this.bonusClaimModel
      .find(filter)
      .populate('bonusRuleId', 'name period requiredTrips bonusAmount')
      .populate('driverId', 'firstName lastName phone email avatar')
      .sort({ createdAt: -1 })
      .lean();

    return claims;
  }

  // ==================== ADMIN: Approve Claim ====================

  async approveClaim(claimId: string, adminId?: string): Promise<BonusClaimDocument> {
    const claim = await this.bonusClaimModel.findById(claimId).populate('bonusRuleId');
    if (!claim) throw new NotFoundException('Không tìm thấy yêu cầu thưởng');
    if (claim.status !== 'pending') {
      throw new BadRequestException(`Yêu cầu này đã được xử lý (${claim.status})`);
    }

    const rule = claim.bonusRuleId as any;
    const bonusAmount = claim.bonusAmount;

    // Add bonus to driver wallet
    await this.walletsService.addBalance(
      claim.driverId.toString(),
      bonusAmount,
      TransactionType.BONUS,
      `Thưởng ${rule?.name || 'hoàn thành chỉ tiêu'}: ${bonusAmount.toLocaleString('vi-VN')}đ`,
      UserType.DRIVER,
    );

    // Update claim status
    claim.status = 'approved';
    claim.approvedAt = new Date();
    if (adminId) claim.approvedBy = new Types.ObjectId(adminId);
    await claim.save();

    console.log(`[BonusesService] ✅ Claim approved: driver=${claim.driverId}, amount=${bonusAmount}đ`);
    return claim;
  }

  // ==================== ADMIN: Reject Claim ====================

  async rejectClaim(claimId: string, rejectionReason: string): Promise<BonusClaimDocument> {
    if (!rejectionReason?.trim()) {
      throw new BadRequestException('Vui lòng nhập lý do từ chối');
    }

    const claim = await this.bonusClaimModel.findById(claimId);
    if (!claim) throw new NotFoundException('Không tìm thấy yêu cầu thưởng');
    if (claim.status !== 'pending') {
      throw new BadRequestException(`Yêu cầu này đã được xử lý (${claim.status})`);
    }

    claim.status = 'rejected';
    claim.rejectionReason = rejectionReason.trim();
    await claim.save();

    console.log(`[BonusesService] ❌ Claim rejected: driver=${claim.driverId}, reason=${rejectionReason}`);
    return claim;
  }

  // ==================== ADMIN: Stats ====================

  async getClaimStats(): Promise<any> {
    const [total, pending, approved, rejected] = await Promise.all([
      this.bonusClaimModel.countDocuments(),
      this.bonusClaimModel.countDocuments({ status: 'pending' }),
      this.bonusClaimModel.countDocuments({ status: 'approved' }),
      this.bonusClaimModel.countDocuments({ status: 'rejected' }),
    ]);

    const approvedAmount = await this.bonusClaimModel.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$bonusAmount' } } },
    ]);

    return {
      total,
      pending,
      approved,
      rejected,
      totalApprovedAmount: approvedAmount[0]?.total || 0,
    };
  }
}
