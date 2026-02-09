import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Driver, DriverDocument } from '../schemas/driver.schema';
import {
  WalletTransaction,
  WalletTransactionDocument,
  TransactionType,
  TransactionStatus,
  PaymentMethod,
} from '../schemas/wallet-transaction.schema';
import { PricingService } from '../../pricing/pricing.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(WalletTransaction.name)
    private walletTransactionModel: Model<WalletTransactionDocument>,
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
    if (amount < 10000) {
      throw new BadRequestException('Số tiền nạp tối thiểu là 10.000đ');
    }

    const driver = await this.driverModel.findById(driverId);
    if (!driver) {
      throw new NotFoundException('Tài xế không tồn tại');
    }

    const balanceBefore = driver.walletBalance || 0;
    const balanceAfter = balanceBefore + amount;

    // Create transaction record
    const transaction = new this.walletTransactionModel({
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.TOPUP,
      amount,
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.PENDING, // Pending until payment confirmed
      paymentMethod,
      description: `Nạp tiền qua ${paymentMethod}`,
      note,
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
    const transaction = await this.walletTransactionModel.findById(transactionId);
    
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

    // Update driver wallet balance
    driver.walletBalance = (driver.walletBalance || 0) + transaction.amount;
    
    // Unlock wallet if balance >= minimum
    if (driver.walletBalance >= driver.minimumBalance) {
      driver.isWalletLocked = false;
    }

    await driver.save();

    // Update transaction status
    transaction.status = TransactionStatus.COMPLETED;
    transaction.completedAt = new Date();
    await transaction.save();

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
    if (amount < 50000) {
      throw new BadRequestException('Số tiền rút tối thiểu là 50.000đ');
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

    // Create withdrawal transaction
    const transaction = new this.walletTransactionModel({
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.WITHDRAWAL,
      amount: -amount, // Negative for withdrawal
      balanceBefore,
      balanceAfter,
      status: TransactionStatus.PENDING,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
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
    const transaction = new this.walletTransactionModel({
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
   * Get transaction history
   */
  async getTransactions(
    driverId: string | Types.ObjectId,
    limit: number = 20,
    skip: number = 0,
  ) {
    const transactions = await this.walletTransactionModel
      .find({ driverId: new Types.ObjectId(driverId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    return transactions;
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
    const thisWeekTransactions = await this.walletTransactionModel.find({
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.COMMISSION,
      createdAt: { $gte: weekAgo },
    });

    const thisWeek = Math.abs(
      thisWeekTransactions.reduce((sum, t) => sum + t.amount, 0),
    );

    // Calculate earnings this month
    const thisMonthTransactions = await this.walletTransactionModel.find({
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.COMMISSION,
      createdAt: { $gte: monthAgo },
    });

    const thisMonth = Math.abs(
      thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0),
    );

    // Calculate total earnings (all time)
    const allCommissions = await this.walletTransactionModel.find({
      driverId: new Types.ObjectId(driverId),
      type: TransactionType.COMMISSION,
    });

    const total = Math.abs(allCommissions.reduce((sum, t) => sum + t.amount, 0));

    // Calculate bonus
    const bonusTransactions = await this.walletTransactionModel.find({
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
   * Find pending transaction by transfer content
   * Used by Sepay webhook to match bank transfer with transaction
   */
  async findPendingTransactionByContent(transactionId: string) {
    // Extract last 8 chars from transaction ID (matching Sepay QR content format)
    const contentMatch = transactionId.substring(Math.max(0, transactionId.length - 8)).toUpperCase();
    
    console.log('[WalletService] Searching for transaction with ID ending:', contentMatch);

    // Find transaction with matching ID (pending topup)
    const transaction = await this.walletTransactionModel.findOne({
      _id: new Types.ObjectId(transactionId),
      type: TransactionType.TOPUP,
      status: TransactionStatus.PENDING,
    });

    if (!transaction) {
      console.log('[WalletService] ❌ Transaction not found or already completed:', transactionId);
      return null;
    }

    console.log('[WalletService] ✅ Found pending transaction:', transaction._id);
    return transaction;
  }

  /**
   * Complete topup transaction after bank transfer confirmed
   * Called by Sepay webhook
   */
  async completeTopupTransaction(transactionId: string, sepayTransactionId: string) {
    const transaction = await this.walletTransactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      console.log('[WalletService] ⚠️ Transaction already processed:', transaction.status);
      return transaction;
    }

    // Update transaction status
    transaction.status = TransactionStatus.COMPLETED;
    transaction.completedAt = new Date();
    transaction.description = `${transaction.description} - Sepay: ${sepayTransactionId}`;
    await transaction.save();

    // Update driver wallet balance
    const driver = await this.driverModel.findById(transaction.driverId);
    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const balanceBefore = driver.walletBalance;
    const balanceAfter = balanceBefore + transaction.amount;

    driver.walletBalance = balanceAfter;

    // Unlock wallet if balance is sufficient
    if (driver.walletBalance >= driver.minimumBalance) {
      driver.isWalletLocked = false;
    }

    await driver.save();

    // Update transaction balance fields
    transaction.balanceBefore = balanceBefore;
    transaction.balanceAfter = balanceAfter;
    await transaction.save();

    console.log('[WalletService] ✅ Topup completed:', {
      transactionId,
      driverId: driver._id,
      amount: transaction.amount,
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
    const query: any = {};

    if (filters?.type) {
      query.type = filters.type;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.driverId) {
      query.driverId = new Types.ObjectId(filters.driverId);
    }

    const transactions = await this.walletTransactionModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .populate('driverId', 'firstName lastName phoneNumber')
      .lean();

    const total = await this.walletTransactionModel.countDocuments(query);

    return {
      transactions,
      total,
      limit,
      skip,
    };
  }
}

