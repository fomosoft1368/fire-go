import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Driver, DriverDocument } from '../schemas/driver.schema';
import {
  Transaction,
  TransactionDocument,
  UserType,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '../../wallets/schemas/transaction.schema';
import { PricingService } from '../../pricing/pricing.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    private readonly pricingService: PricingService,
  ) {}

  /**
   * Get driver's wallet balance
   */
  async getBalance(driverId: string | Types.ObjectId) {
    const driver = await this.driverModel.findById(driverId);
    
    if (!driver) {
      throw new NotFoundException('Tài xế không tồn tại');
    }

    return {
      balance: driver.walletBalance || 0,
      pending: driver.pendingBalance || 0,
      minimumBalance: driver.minimumBalance || 100000,
      isLocked: driver.isWalletLocked || false,
    };
  }

  /**
   * Top-up wallet (Nạp tiền)
   */
  async topup(
    driverId: string | Types.ObjectId,
    amount: number,
    paymentMethod: PaymentMethod,
    note?: string,
  ) {
    // Get dynamic limits from pricing config
    const minAmount = await this.pricingService.getMinTopupAmount('driver');
    const maxAmount = await this.pricingService.getMaxTopupAmount();

    if (amount < minAmount) {
      throw new BadRequestException(
        `Số tiền nạp tối thiểu là ${minAmount.toLocaleString('vi-VN')}đ`
      );
    }

    if (amount > maxAmount) {
      throw new BadRequestException(
        `Số tiền nạp tối đa là ${maxAmount.toLocaleString('vi-VN')}đ`
      );
    }

    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Tài xế không tồn tại');
    }

    // Get topup discount from pricing config
    console.log('[DriverWalletService] Getting topup discount for driver...');
    const discountPercent = await this.pricingService.getTopupDiscount('driver');
    console.log(`[DriverWalletService] Discount: ${discountPercent}%`);

    // Calculate discount amount
    const discountAmount = Math.round((amount * discountPercent) / 100);
    
    // Actual amount to add to wallet (original - discount)
    const actualAmount = amount - discountAmount;

    const balanceBefore = driver.walletBalance || 0;
    const balanceAfter = balanceBefore + actualAmount; // Use actualAmount, not original amount

    console.log('[DriverWalletService] Topup with discount:', {
      driverId,
      originalAmount: amount,
      discountPercent: `${discountPercent}%`,
      discountAmount,
      actualAmount,
      balanceBefore,
      balanceAfter,
    });

    // Create transaction record
    const transaction = new this.transactionModel({
      userType: UserType.DRIVER,
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.TOPUP,
      amount,
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.PENDING, // Pending until payment confirmed
      paymentMethod,
      description: `Nạp tiền qua ${paymentMethod}`,
      note,
      discountPercent,
      discountAmount,
    });

    await transaction.save();

    // For real system: Wait for payment gateway callback
    // Auto-complete only for non-bank-transfer methods (for demo purposes)
    // Bank transfer (Sepay) requires manual verification via webhook
    if (paymentMethod !== PaymentMethod.BANK_TRANSFER) {
      await this.completeTopup(transaction._id.toString());
    }

    return {
      success: true,
      message: paymentMethod === PaymentMethod.BANK_TRANSFER 
        ? 'Vui lòng chuyển khoản theo thông tin để hoàn tất giao dịch'
        : 'Yêu cầu nạp tiền đã được tạo',
      transactionId: transaction._id,
      amount,
    };
  }

  /**
   * Complete top-up transaction (called after payment confirmed)
   */
  async completeTopup(transactionId: string) {
    const transaction = await this.transactionModel.findById(transactionId);
    
    if (!transaction) {
      throw new NotFoundException('Giao dịch không tồn tại');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException('Giao dịch đã được xử lý');
    }

    const driver = await this.driverModel.findById(transaction.driverId);
    if (!driver) {
      throw new NotFoundException('Tài xế không tồn tại');
    }

    // Calculate actual amount after discount
    const discountAmount = transaction.discountAmount || 0;
    const actualAmount = transaction.amount - discountAmount;

    console.log('[DriverWalletService] Completing topup:', {
      transactionId,
      originalAmount: transaction.amount,
      discountAmount,
      actualAmount,
      balanceBefore: driver.walletBalance,
    });

    // Update driver wallet balance with actual amount (after discount)
    driver.walletBalance = (driver.walletBalance || 0) + actualAmount;
    
    // Unlock wallet if balance >= minimum
    if (driver.walletBalance >= driver.minimumBalance) {
      driver.isWalletLocked = false;
    }

    await driver.save();

    // Update transaction status
    transaction.status = TransactionStatus.COMPLETED;
    transaction.completedAt = new Date();
    transaction.balanceAfter = driver.walletBalance;
    await transaction.save();

    console.log('[DriverWalletService] ✅ Topup completed:', {
      transactionId,
      newBalance: driver.walletBalance,
    });

    return {
      success: true,
      message: 'Nạp tiền thành công',
      newBalance: driver.walletBalance,
    };
  }

  /**
   * Withdraw money (Rút tiền)
   */
  async withdraw(
    driverId: string | Types.ObjectId,
    amount: number,
    bankAccountNumber: string,
    bankName: string,
    accountHolderName: string,
    note?: string,
  ) {
    const minWithdrawAmount = await this.pricingService.getMinWithdrawAmount('driver');
    if (amount < minWithdrawAmount) {
      throw new BadRequestException(`Số tiền rút tối thiểu là ${minWithdrawAmount.toLocaleString('vi-VN')}đ`);
    }

    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Tài xế không tồn tại');
    }

    if (driver.walletBalance < amount) {
      throw new BadRequestException('Số dư không đủ để thực hiện giao dịch');
    }

    const balanceBefore = driver.walletBalance;
    const balanceAfter = balanceBefore - amount;

    // Generate transaction code
    const transactionCode = `WTH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create withdrawal transaction
    const transaction = new this.transactionModel({
      userType: UserType.DRIVER,
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.WITHDRAWAL,
      amount: -amount, // Negative for withdrawal
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.PENDING,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      transactionCode,
      bankAccountNumber,
      bankName,
      accountHolderName,
      description: `Rút tiền về ${bankName}`,
      note,
    });

    await transaction.save();

    // Update driver balance immediately
    driver.walletBalance = balanceAfter;
    driver.pendingBalance = (driver.pendingBalance || 0) + amount;

    // Check if wallet should be locked
    if (driver.walletBalance < driver.minimumBalance) {
      driver.isWalletLocked = true;
    }

    await driver.save();

    return {
      success: true,
      message: 'Yêu cầu rút tiền đã được tạo',
      transactionId: transaction._id,
      amount,
      newBalance: driver.walletBalance,
    };
  }

  /**
   * Deduct commission from driver wallet after trip completed
   * Commission rate is calculated from PricingConfig: 100 - driverShare
   * Example: driverShare=80 → app commission=20%
   */
  async deductCommission(
    driverId: string | Types.ObjectId,
    tripId: string | Types.ObjectId,
    tripAmount: number,
  ) {
    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Tài xế không tồn tại');
    }

    // Get commission rate from PricingConfig
    const pricingConfig = await this.pricingService.getConfig();
    const driverShare = pricingConfig.driverShare || 85; // Default 85% for driver
    const commissionRate = 100 - driverShare; // App takes the rest

    const commissionAmount = Math.round(tripAmount * (commissionRate / 100));

    const balanceBefore = driver.walletBalance;
    const balanceAfter = balanceBefore - commissionAmount;

    // Create commission transaction
    const transaction = new this.transactionModel({
      userType: UserType.DRIVER,
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.COMMISSION,
      amount: -commissionAmount,
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.COMPLETED,
      tripId: new Types.ObjectId(tripId),
      commissionRate,
      description: `Phí chiết khấu ${commissionRate}% (Tài xế nhận ${driverShare}%) - Cuốc xe ${tripAmount.toLocaleString()}đ`,
      completedAt: new Date(),
    });

    await transaction.save();

    // Update driver balance
    driver.walletBalance = balanceAfter;

    // Lock wallet if balance falls below minimum
    if (driver.walletBalance < driver.minimumBalance) {
      driver.isWalletLocked = true;
    }

    await driver.save();

    // ============ XỬ LÝ HOA HỒNG GIỚI THIỆU (REFERRAL) ============
    if (pricingConfig.referralEnabled && commissionAmount > 0) {
      // Check điều kiện: số cuốc hợp lệ để bắt đầu trả thưởng
      // Lấy referralMinTrips (mặc định 5), kiểm tra (driver.completedRides + 1) vì cuốc này vừa hoàn thành chưa được count trong DB nếu gọi trước khi lưu DB
      const minTrips = pricingConfig.referralMinTrips || 5;
      const completedTrips = driver.completedRides || 0;
      
      // Nếu thỏa điều kiện cuốc tối thiểu và tài xế đã KYC (chứng minh thư hợp lệ)
      // Trong ví dụ này ta ưu tiên check completedTrips
      if (completedTrips + 1 >= minTrips) {
        
        // F1
        if (driver.referralF1 && pricingConfig.referralF1Rate > 0) {
          await this.processReferralBonus(
            driver.referralF1,
            tripId,
            commissionAmount,
            pricingConfig.referralF1Rate,
            1, // cấp độ
            driver._id
          );
        }

        // F2
        if (driver.referralF2 && pricingConfig.referralF2Rate > 0) {
          await this.processReferralBonus(
            driver.referralF2,
            tripId,
            commissionAmount,
            pricingConfig.referralF2Rate,
            2,
            driver._id
          );
        }

        // F3
        if (driver.referralF3 && pricingConfig.referralF3Rate > 0) {
          await this.processReferralBonus(
            driver.referralF3,
            tripId,
            commissionAmount,
            pricingConfig.referralF3Rate,
            3,
            driver._id
          );
        }
      }
    }
    // ============ END REFERRAL ============

    return {
      success: true,
      commissionAmount,
      commissionRate,
      driverShare,
      newBalance: driver.walletBalance,
      isLocked: driver.isWalletLocked,
    };
  }

  /**
   * Helper process and add referral bonus to wallet
   */
  private async processReferralBonus(
    beneficiaryId: Types.ObjectId,
    tripId: string | Types.ObjectId,
    platformCommission: number,
    ratePercent: number,
    level: number,
    sourceDriverId: Types.ObjectId
  ) {
    try {
      const bonusAmount = Math.round(platformCommission * (ratePercent / 100));
      if (bonusAmount <= 0) return;

      const beneficiary = await this.driverModel.findById(beneficiaryId);
      if (!beneficiary) return;

      const balanceBefore = beneficiary.walletBalance || 0;
      const balanceAfter = balanceBefore + bonusAmount;

      // Cộng tiền vào ví
      beneficiary.walletBalance = balanceAfter;
      beneficiary.totalReferralEarnings = (beneficiary.totalReferralEarnings || 0) + bonusAmount;
      
      if (beneficiary.walletBalance >= beneficiary.minimumBalance) {
        beneficiary.isWalletLocked = false;
      }
      
      await beneficiary.save();

      // Lưu transaction
      const transaction = new this.transactionModel({
        userType: UserType.DRIVER,
        driverId: beneficiaryId,
        type: TransactionType.REFERRAL_BONUS,
        amount: bonusAmount,
        balanceBefore,
        balanceAfter,
        status: TransactionStatus.COMPLETED,
        tripId: new Types.ObjectId(tripId),
        description: `Hoa hồng giới thiệu F${level} (${ratePercent}%) từ cuốc xe của tài xế ID ${sourceDriverId.toString().substring(0, 6)}...`,
        completedAt: new Date(),
        metadata: {
          sourceDriverId: sourceDriverId,
          level,
          platformCommission
        }
      });

      await transaction.save();
    } catch (error) {
      console.error(`[Referral Error] Failed to process F${level} bonus for ${beneficiaryId}:`, error.message);
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(
    driverId: string | Types.ObjectId,
    limit: number = 20,
    skip: number = 0,
  ) {
    const transactions = await this.transactionModel
      .find({ 
        userType: UserType.DRIVER,
        driverId: new Types.ObjectId(driverId) 
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    return transactions;
  }

  /**
   * Get transaction status by transactionId
   */
  async getTransactionStatus(transactionId: string) {
    const transaction = await this.transactionModel
      .findById(transactionId)
      .select('status')
      .lean();

    if (!transaction) {
      throw new NotFoundException('Giao dịch không tồn tại');
    }

    return {
      status: transaction.status,
    };
  }

  /**
   * Get wallet statistics
   */
  async getStats(driverId: string | Types.ObjectId) {
    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Tài xế không tồn tại');
    }

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Calculate earnings this week
    const thisWeekTransactions = await this.transactionModel.find({
      userType: UserType.DRIVER,
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.COMMISSION,
      createdAt: { $gte: weekAgo },
    });

    const thisWeek = Math.abs(
      thisWeekTransactions.reduce((sum, t) => sum + t.amount, 0),
    );

    // Calculate earnings this month
    const thisMonthTransactions = await this.transactionModel.find({
      userType: UserType.DRIVER,
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.COMMISSION,
      createdAt: { $gte: monthAgo },
    });

    const thisMonth = Math.abs(
      thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0),
    );

    // Calculate total earnings (all time)
    const allCommissions = await this.transactionModel.find({
      userType: UserType.DRIVER,
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.COMMISSION,
    });

    const total = Math.abs(allCommissions.reduce((sum, t) => sum + t.amount, 0));

    // Calculate bonus
    const bonusTransactions = await this.transactionModel.find({
      userType: UserType.DRIVER,
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.BONUS,
    });

    const bonusAmount = bonusTransactions.reduce((sum, t) => sum + t.amount, 0);

    return {
      thisWeek,
      thisMonth,
      total,
      tripCount: driver.totalRides || 0,
      avgRating: driver.averageRating || 0,
      bonusAmount,
    };
  }

  /**
   * Create topup transaction for Sepay payment
   * Called by mobile to initiate topup process
   * Returns transaction that can be used to generate QR code
   */
  async createTopupTransaction(
    driverId: string | Types.ObjectId,
    amount: number,
  ) {
    if (amount < 10000) {
      throw new BadRequestException('Số tiền nạp tối thiểu là 10.000đ');
    }

    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Tài xế không tồn tại');
    }

    // Auto-initialize walletBalance field if it doesn't exist
    const driverObj = driver.toObject();
    const hasWalletBalance = driverObj.hasOwnProperty('walletBalance') && 
                             driver.walletBalance !== undefined && 
                             driver.walletBalance !== null;
    
    if (!hasWalletBalance) {
      console.log('[WalletService] 🔧 Auto-initializing walletBalance field for driver:', driverId);
      console.log('[WalletService] Current driver fields:', Object.keys(driverObj));
      console.log('[WalletService] walletBalance before:', driver.walletBalance);
      
      driver.walletBalance = 0;
      driver.isWalletLocked = false;
      driver.minimumBalance = driver.minimumBalance || 100000;
      driver.pendingBalance = driver.pendingBalance || 0;
      
      await driver.save();
      console.log('[WalletService] ✅ Wallet fields initialized:', {
        walletBalance: driver.walletBalance,
        isWalletLocked: driver.isWalletLocked,
        minimumBalance: driver.minimumBalance,
        pendingBalance: driver.pendingBalance
      });
    } else {
      console.log('[WalletService] ℹ️ Wallet balance already exists:', driver.walletBalance);
    }

    const balanceBefore = driver.walletBalance || 0;
    const balanceAfter = balanceBefore + amount;

    // Create transaction record
    const transaction = new this.transactionModel({
      userType: UserType.DRIVER,
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.TOPUP,
      amount,
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.PENDING,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      description: `Nạp tiền qua chuyển khoản ngân hàng`,
    });

    await transaction.save();

    console.log('[WalletService] ✅ Topup transaction created:', {
      transactionId: transaction._id,
      driverId,
      amount,
    });

    return transaction;
  }

  /**
   * Find pending transaction by transfer content
   * Used by Sepay webhook to match bank transfer with transaction
   */
  async findPendingTransactionByContent(transactionId: string) {
    console.log('[WalletService] 🔍 Searching for transaction with ID:', transactionId);
    console.log('[WalletService] ID length:', transactionId.length);
    
    let transaction = null;
    
    // Strategy 1: Try full transaction ID (if it looks like MongoDB ObjectId - 24 chars)
    if (transactionId.length === 24) {
      try {
        transaction = await this.transactionModel.findOne({
          _id: new Types.ObjectId(transactionId),
          userType: UserType.DRIVER,
          type: TransactionType.TOPUP,
          status: TransactionStatus.PENDING,
        });
        
        if (transaction) {
          console.log('[WalletService] ✅ Found by full ID (24 chars):', transaction._id);
          return transaction;
        }
      } catch (error) {
        console.log('[WalletService] ⚠️ Full ID search failed (invalid ObjectId format):', error.message);
      }
    }
    
    // Strategy 2: Try last 8 characters matching
    const last8Chars = transactionId.substring(Math.max(0, transactionId.length - 8)).toUpperCase();
    console.log('[WalletService] 🔍 Trying last 8 chars match:', last8Chars);
    
    // Find all pending topup transactions
    const allPending = await this.transactionModel.find({
      userType: UserType.DRIVER,
      type: TransactionType.TOPUP,
      status: TransactionStatus.PENDING,
    }).sort({ createdAt: -1 }).limit(50); // Check last 50 pending transactions
    
    console.log('[WalletService] Found', allPending.length, 'pending transactions to check');
    
    // Find transaction where last 8 chars of ID match
    for (const tx of allPending) {
      const txIdStr = tx._id.toString();
      const txLast8 = txIdStr.substring(txIdStr.length - 8).toUpperCase();
      
      if (txLast8 === last8Chars) {
        console.log('[WalletService] ✅ Found by last 8 chars:', tx._id);
        console.log('[WalletService] Full ID:', txIdStr);
        console.log('[WalletService] Amount:', tx.amount);
        console.log('[WalletService] Created:', tx.createdAt);
        return tx;
      }
    }

    console.log('[WalletService] ❌ No matching transaction found');
    console.log('[WalletService] Searched ID:', transactionId);
    console.log('[WalletService] Last 8 chars:', last8Chars);
    return null;
  }

  /**
   * Complete topup transaction after bank transfer confirmed
   * Called by Sepay webhook
   * Applies topup discount configured in PricingConfig
   */
  async completeTopupTransaction(transactionId: string, sepayTransactionId: string) {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      console.log('[WalletService] ⚠️ Transaction already processed:', transaction.status);
      return transaction;
    }

    // Use discount already saved in transaction (set when created)
    // If not present (old transactions), calculate now for backward compatibility
    let discountPercent = transaction.discountPercent || 0;
    let discountAmount = transaction.discountAmount || 0;

    if (discountPercent === 0 && discountAmount === 0) {
      // Old transaction without discount - calculate now
      const pricingConfig = await this.pricingService.getConfig();
      discountPercent = pricingConfig.topupDiscountDriver || 0;
      discountAmount = Math.round(transaction.amount * (discountPercent / 100));
      
      console.log('[WalletService] ⚠️ Old transaction - calculating discount now:', {
        discountPercent,
        discountAmount,
      });
    } else {
      console.log('[WalletService] ✅ Using pre-calculated discount from transaction:', {
        discountPercent,
        discountAmount,
      });
    }

    console.log('[WalletService] 💳 Completing topup with discount:', {
      transactionId,
      amount: transaction.amount,
      discountPercent: `${discountPercent}%`,
      discountAmount,
    });

    // Update driver wallet balance (apply discount)
    const driver = await this.driverModel.findById(transaction.driverId);
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const balanceBefore = driver.walletBalance;
    // Driver gets: topup amount - discount
    const actualNetAmount = transaction.amount - discountAmount;
    const balanceAfter = balanceBefore + actualNetAmount;

    driver.walletBalance = balanceAfter;

    // Unlock wallet if balance is sufficient
    if (driver.walletBalance >= driver.minimumBalance) {
      driver.isWalletLocked = false;
    }

    await driver.save({ validateBeforeSave: false }); // Skip validation for wallet update

    // Update transaction status and ensure discount fields are saved
    transaction.status = TransactionStatus.COMPLETED;
    transaction.completedAt = new Date();
    transaction.discountPercent = discountPercent;
    transaction.discountAmount = discountAmount;
    transaction.balanceBefore = balanceBefore;
    transaction.balanceAfter = balanceAfter;
    transaction.description = `${transaction.description} - Sepay: ${sepayTransactionId}`;
    await transaction.save();

    console.log('[WalletService] ✅ Driver topup completed:', {
      transactionId,
      driverId: driver._id,
      originalAmount: transaction.amount,
      discountAmount,
      netAmount: actualNetAmount,
      newBalance: balanceAfter,
    });

    return transaction;
  }

  /**
   * Get all wallet transactions (for admin)
   */
  async getAllTransactions(limit: number = 50, skip: number = 0, filters?: {
    type?: TransactionType;
    status?: TransactionStatus;
    driverId?: string;
  }) {
    const query: any = {
      userType: UserType.DRIVER,
    };

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.driverId) {
      query.driverId = new Types.ObjectId(filters.driverId);
    }

    const transactions = await this.transactionModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('driverId', 'firstName lastName phoneNumber')
      .lean();

    const total = await this.transactionModel.countDocuments(query);

    return {
      transactions,
      total,
      limit,
      skip,
    };
  }
}

