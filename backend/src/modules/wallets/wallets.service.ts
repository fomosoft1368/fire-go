import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import {
  Transaction,
  TransactionDocument,
  TransactionType,
  TransactionStatus,
  UserType,
} from './schemas/transaction.schema';
import { TopUpWalletDto, PaymentDto } from './dto';
import { PricingService } from '../pricing/pricing.service';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';

import {
  Customer,
  CustomerDocument,
} from '../customers/schemas/customer.schema';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name)
    private transactionModel: Model<TransactionDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private readonly pricingService: PricingService,
  ) {}

  async createWallet(userId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.create({
      userId: new Types.ObjectId(userId),
      balance: 0,
    });

    return wallet;
  }

  async getWallet(userId: string): Promise<WalletDocument> {
    let wallet = await this.walletModel.findOne({
      userId: new Types.ObjectId(userId),
    });

    if (!wallet) {
      wallet = (await this.createWallet(userId)) as any;
    }

    return wallet;
  }

  async getWalletById(walletId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.findById(walletId);

    if (!wallet) {
      throw new NotFoundException(`Wallet with ID ${walletId} not found`);
    }

    return wallet;
  }

  async topUp(
    userId: string,
    topUpWalletDto: TopUpWalletDto,
    userType: UserType = UserType.CUSTOMER,
  ): Promise<TransactionDocument> {
    if (topUpWalletDto.amount <= 0) {
      throw new BadRequestException('Top-up amount must be greater than 0');
    }

    // Get dynamic limits from pricing config
    const minAmount = await this.pricingService.getMinTopupAmount(
      userType === UserType.CUSTOMER ? 'customer' : 'driver',
    );
    const maxAmount = await this.pricingService.getMaxTopupAmount();

    if (topUpWalletDto.amount < minAmount) {
      throw new BadRequestException(
        `Top-up amount must be at least ${minAmount.toLocaleString('vi-VN')} VND`,
      );
    }

    if (topUpWalletDto.amount > maxAmount) {
      throw new BadRequestException(
        `Top-up amount must not exceed ${maxAmount.toLocaleString('vi-VN')} VND`,
      );
    }

    const wallet = await this.getWallet(userId);

    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked');
    }

    // Get topup discount from pricing config
    const discountPercent = await this.pricingService.getTopupDiscount(
      userType === UserType.CUSTOMER ? 'customer' : 'driver',
    );

    // Calculate discount amount
    const discountAmount = Math.round(
      (topUpWalletDto.amount * discountPercent) / 100,
    );

    // Actual amount to add to wallet (original - discount)
    const actualAmount = topUpWalletDto.amount - discountAmount;

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + actualAmount;

    // Update wallet balance
    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: {
        balance: actualAmount,
        totalTopUps: actualAmount,
      },
    });

    // Create transaction record with discount info
    const transaction = await this.transactionModel.create({
      userId: new Types.ObjectId(userId),
      userType,
      type: TransactionType.TOP_UP,
      amount: topUpWalletDto.amount,
      status: TransactionStatus.SUCCESS,
      description: topUpWalletDto.description,
      paymentMethod: topUpWalletDto.paymentMethod,
      balanceBefore,
      balanceAfter,
      discountPercent,
      discountAmount,
    });

    console.log('[WalletsService] Topup with discount:', {
      userId,
      userType,
      originalAmount: topUpWalletDto.amount,
      discountPercent: `${discountPercent}%`,
      discountAmount,
      actualAmount,
      balanceBefore,
      balanceAfter,
    });

    return transaction;
  }

  /**
   * Create topup transaction for Sepay payment (customer version)
   * Returns PENDING transaction for QR code generation
   */
  async createTopupTransaction(
    userId: string,
    amount: number,
  ): Promise<TransactionDocument> {
    const customer = await this.customerModel.findById(userId);
    if (customer && !customer.isPhoneVerified) {
      throw new BadRequestException(
        'Vui lòng xác thực số điện thoại trước khi nạp tiền',
      );
    }

    // Get dynamic limits from pricing config
    const minAmount = await this.pricingService.getMinTopupAmount('customer');
    const maxAmount = await this.pricingService.getMaxTopupAmount();

    if (amount < minAmount) {
      throw new BadRequestException(
        `Top-up amount must be at least ${minAmount.toLocaleString('vi-VN')} VND`,
      );
    }

    if (amount > maxAmount) {
      throw new BadRequestException(
        `Top-up amount must not exceed ${maxAmount.toLocaleString('vi-VN')} VND`,
      );
    }

    const wallet = await this.getWallet(userId);

    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked');
    }

    // Get topup discount from pricing config
    console.log('[WalletsService] Getting topup discount for customer...');
    const discountPercent =
      await this.pricingService.getTopupDiscount('customer');
    console.log(`[WalletsService] Discount: ${discountPercent}%`);

    // Calculate discount amount
    const discountAmount = Math.round((amount * discountPercent) / 100);

    // Actual amount to add to wallet (original - discount)
    const actualAmount = amount - discountAmount;

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + actualAmount; // Use actualAmount, not original amount

    // Create PENDING transaction - will be completed when webhook is received
    const transaction = await this.transactionModel.create({
      userId: new Types.ObjectId(userId),
      userType: UserType.CUSTOMER,
      type: TransactionType.TOP_UP,
      amount,
      status: TransactionStatus.PENDING, // Waiting for payment confirmation
      paymentMethod: 'bank_transfer',
      description: 'Nạp tiền qua chuyển khoản ngân hàng',
      balanceBefore,
      balanceAfter,
      discountPercent,
      discountAmount,
    });

    console.log(
      '[WalletsService] ✅ Customer topup transaction created with discount:',
      {
        transactionId: transaction._id,
        userId,
        originalAmount: amount,
        discountPercent: `${discountPercent}%`,
        discountAmount,
        actualAmount,
        balanceBefore,
        balanceAfter,
      },
    );

    return transaction;
  }

  /**
   * Find pending topup transaction by content (for webhook matching)
   */
  async findPendingTopupByContent(
    transactionId: string,
  ): Promise<TransactionDocument | null> {
    console.log(
      '[WalletsService] 🔍 Searching for customer transaction with ID:',
      transactionId,
    );

    let transaction = null;

    // Strategy 1: Try full transaction ID (24 char MongoDB ObjectId)
    if (transactionId.length === 24) {
      try {
        transaction = await this.transactionModel.findOne({
          _id: new Types.ObjectId(transactionId),
          userType: UserType.CUSTOMER,
          type: TransactionType.TOP_UP,
          status: TransactionStatus.PENDING,
        });

        if (transaction) {
          console.log('[WalletsService] ✅ Found by full ID:', transaction._id);
          return transaction;
        }
      } catch (error: any) {
        console.log(
          '[WalletsService] ⚠️ Full ID search failed:',
          error.message,
        );
      }
    }

    // Strategy 2: Try last 8 characters matching
    const last8Chars = transactionId
      .substring(Math.max(0, transactionId.length - 8))
      .toUpperCase();
    console.log('[WalletsService] 🔍 Trying last 8 chars match:', last8Chars);

    const allPending = await this.transactionModel
      .find({
        userType: UserType.CUSTOMER,
        type: TransactionType.TOP_UP,
        status: TransactionStatus.PENDING,
      })
      .sort({ createdAt: -1 })
      .limit(50);

    for (const tx of allPending) {
      const txIdStr = tx._id.toString();
      const txLast8 = txIdStr.substring(txIdStr.length - 8).toUpperCase();

      if (txLast8 === last8Chars) {
        console.log('[WalletsService] ✅ Found by last 8 chars:', tx._id);
        return tx;
      }
    }

    console.log('[WalletsService] ❌ No matching customer transaction found');
    return null;
  }

  /**
   * Complete topup transaction after payment confirmed (customer version)
   * Applies topup discount configured in PricingConfig
   */
  async completeTopupTransaction(
    transactionId: string,
    sepayTransactionId: string,
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      console.log(
        '[WalletsService] ⚠️ Transaction already processed:',
        transaction.status,
      );
      return transaction;
    }

    // Get topup discount from Pricing Config
    const pricingConfig = await this.pricingService.getConfig();
    const discountPercent = pricingConfig.topupDiscountCustomer || 0; // Default 0% if not set
    const discountAmount = Math.round(
      transaction.amount * (discountPercent / 100),
    );

    console.log('[WalletsService] 💳 Applying topup discount:', {
      amount: transaction.amount,
      discountPercent,
      discountAmount,
    });

    // Update transaction status and discount
    transaction.status = TransactionStatus.SUCCESS;
    transaction.completedAt = new Date();
    transaction.discountPercent = discountPercent;
    transaction.discountAmount = discountAmount;
    transaction.description = `${transaction.description} - Confirmed`;
    await transaction.save();

    // Update wallet balance (apply discount)
    const wallet = await this.getWallet(transaction.userId.toString());

    const balanceBefore = wallet.balance;
    // Customer gets: topup amount - discount
    const actualNetAmount = transaction.amount - discountAmount;
    const balanceAfter = balanceBefore + actualNetAmount;

    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: { balance: actualNetAmount, totalTopUps: transaction.amount },
    });

    // Update transaction balance fields
    transaction.balanceBefore = balanceBefore;
    transaction.balanceAfter = balanceAfter;
    await transaction.save();

    console.log('[WalletsService] ✅ Customer topup completed with discount:', {
      transactionId,
      userId: transaction.userId,
      originalAmount: transaction.amount,
      discountAmount,
      netAmount: actualNetAmount,
      newBalance: balanceAfter,
    });

    return transaction;
  }

  async deductBalance(
    userId: string,
    amount: number,
    rideId?: string,
    description?: string,
  ): Promise<TransactionDocument> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.getWallet(userId);

    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked');
    }

    if (wallet.balance < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;

    // Update wallet balance
    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: {
        balance: -amount,
        totalSpent: amount,
      },
    });

    // Create transaction record
    const transaction = await this.transactionModel.create({
      userId: new Types.ObjectId(userId),
      userType: 'customer',
      type: TransactionType.PAYMENT,
      amount,
      status: TransactionStatus.SUCCESS,
      description,
      rideId: rideId ? new Types.ObjectId(rideId) : null,
      balanceBefore,
      balanceAfter,
    });

    return transaction;
  }

  async addBalance(
    userId: string,
    amount: number,
    type: TransactionType = TransactionType.EARNING,
    description?: string,
    userType: UserType = UserType.CUSTOMER,
  ): Promise<TransactionDocument> {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than 0');
    }

    const wallet = await this.getWallet(userId);

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + amount;

    // Update wallet balance
    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: {
        balance: amount,
        ...(type === TransactionType.EARNING && { totalTopUps: amount }),
      },
    });

    // Create transaction record
    const transaction = await this.transactionModel.create({
      userId: new Types.ObjectId(userId),
      userType,
      type,
      amount,
      status: TransactionStatus.SUCCESS,
      description,
      balanceBefore,
      balanceAfter,
    });

    return transaction;
  }

  async refundTransaction(
    transactionId: string,
    reason?: string,
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException(
        `Transaction with ID ${transactionId} not found`,
      );
    }

    if (transaction.status !== TransactionStatus.SUCCESS) {
      throw new BadRequestException(
        'Only successful transactions can be refunded',
      );
    }

    const wallet = await this.getWallet(transaction.userId.toString());
    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + transaction.amount;

    // Update wallet balance
    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: { balance: transaction.amount },
    });

    // Create refund transaction
    const refundTransaction = await this.transactionModel.create({
      userId: transaction.userId,
      userType: transaction.userType,
      type: TransactionType.REFUND,
      amount: transaction.amount,
      status: TransactionStatus.SUCCESS,
      description: `Refund for transaction ${transactionId}. ${reason || ''}`,
      balanceBefore,
      balanceAfter,
    });

    return refundTransaction;
  }

  async getWalletStats(userId: string): Promise<any> {
    const wallet = await this.getWallet(userId);
    const transactions = await this.transactionModel.aggregate([
      {
        $match: { userId: new Types.ObjectId(userId) },
      },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          successfulTransactions: {
            $sum: {
              $cond: [{ $eq: ['$status', TransactionStatus.SUCCESS] }, 1, 0],
            },
          },
          totalTopUps: {
            $sum: {
              $cond: [{ $eq: ['$type', TransactionType.TOP_UP] }, '$amount', 0],
            },
          },
          totalSpent: {
            $sum: {
              $cond: [
                { $eq: ['$type', TransactionType.PAYMENT] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    return {
      wallet,
      stats: transactions[0] || {},
    };
  }

  async lockWallet(
    userId: string,
    reason: string,
    until?: Date,
  ): Promise<WalletDocument> {
    return this.walletModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        isLocked: true,
        lockedReason: reason,
        lockedUntil: until,
      },
      { new: true },
    );
  }

  async unlockWallet(userId: string): Promise<WalletDocument> {
    return this.walletModel.findOneAndUpdate(
      { userId: new Types.ObjectId(userId) },
      {
        isLocked: false,
        lockedReason: null,
        lockedUntil: null,
      },
      { new: true },
    );
  }

  async getTransactionById(
    transactionId: string,
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel
      .findById(transactionId)
      .populate('customerId', 'firstName lastName email phone')
      .populate('driverId', 'firstName lastName email phone')
      .populate('bankAccount', 'accountNumber accountHolder bankName name')
      .lean();
    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }
    return transaction;
  }

  // ==================== Deposit/Withdraw Methods ====================

  async deposit(
    customerId: string,
    amount: number,
    paymentMethodId: string,
    description: string,
  ): Promise<TransactionDocument> {
    if (amount <= 0) {
      throw new BadRequestException('Số tiền nạp phải lớn hơn 0');
    }

    // Get dynamic limits from pricing config
    const minAmount = await this.pricingService.getMinTopupAmount('customer');
    const maxAmount = await this.pricingService.getMaxTopupAmount();

    if (amount < minAmount) {
      throw new BadRequestException(
        `Số tiền tối thiểu ${minAmount.toLocaleString('vi-VN')} VND`,
      );
    }

    if (amount > maxAmount) {
      throw new BadRequestException(
        `Số tiền tối đa ${maxAmount.toLocaleString('vi-VN')} VND`,
      );
    }

    // Get or create wallet for customer (using customerId as identifier)
    let wallet = await this.walletModel.findOne({
      userId: new Types.ObjectId(customerId),
    });

    if (!wallet) {
      wallet = await this.walletModel.create({
        userId: new Types.ObjectId(customerId),
        balance: 0,
      });
    }

    if (wallet.isLocked) {
      throw new BadRequestException('Ví của bạn đã bị khóa');
    }

    const balanceBefore = wallet.balance;
    const transactionCode = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create transaction record with PENDING status (admin needs to approve)
    const transaction = await this.transactionModel.create({
      customerId: new Types.ObjectId(customerId),
      userType: 'customer',
      type: TransactionType.DEPOSIT,
      status: TransactionStatus.PENDING,
      amount,
      fee: 0,
      description: description || 'Nạp tiền vào ví',
      paymentMethod: paymentMethodId,
      transactionCode,
      balanceBefore,
      balanceAfter: balanceBefore, // Will be updated when admin approves
      metadata: {
        source: 'customer_deposit',
        requestedAt: new Date(),
      },
    });

    console.log(
      `[Wallet] Deposit request created: ${customerId} - ${amount}VND - Code: ${transactionCode}`,
    );
    return transaction;
  }

  async withdraw(
    customerId: string,
    amount: number,
    bankAccountId: string,
    description: string,
  ): Promise<TransactionDocument> {
    const customer = await this.customerModel.findById(customerId);
    if (customer && !customer.isPhoneVerified) {
      throw new BadRequestException(
        'Vui lòng xác thực số điện thoại trước khi rút tiền',
      );
    }

    if (amount <= 0) {
      throw new BadRequestException('Số tiền rút phải lớn hơn 0');
    }

    const minWithdrawAmount =
      await this.pricingService.getMinWithdrawAmount('customer');
    if (amount < minWithdrawAmount) {
      throw new BadRequestException(
        `Số tiền tối thiểu ${minWithdrawAmount.toLocaleString('vi-VN')} VND`,
      );
    }

    const wallet = await this.walletModel.findOne({
      userId: new Types.ObjectId(customerId),
    });

    if (!wallet) {
      throw new NotFoundException('Không tìm thấy ví');
    }

    if (wallet.isLocked) {
      throw new BadRequestException('Ví của bạn đã bị khóa');
    }

    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Số dư không đủ. Hiện có: ${wallet.balance}VND`,
      );
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;
    const transactionCode = `WTH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create transaction record FIRST (don't deduct balance yet)
    const transaction = await this.transactionModel.create({
      customerId: new Types.ObjectId(customerId),
      userType: 'customer',
      type: TransactionType.WITHDRAW,
      status: TransactionStatus.PENDING,
      amount,
      fee: 0,
      description: description || 'Rút tiền từ ví',
      bankAccount: bankAccountId,
      transactionCode,
      balanceBefore,
      balanceAfter,
      metadata: {
        requestedAt: new Date(),
      },
    });

    // Deduct balance ONLY after transaction created successfully
    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: {
        balance: -amount,
      },
    });

    console.log(
      `[Wallet] Withdraw request created: ${customerId} - ${amount}VND - Code: ${transactionCode} - Balance deducted immediately`,
    );
    return transaction;
  }

  async withdrawManual(
    customerId: string,
    amount: number,
    bankAccountNumber: string,
    bankName: string,
    accountHolderName: string,
    description?: string,
  ): Promise<TransactionDocument> {
    const customer = await this.customerModel.findById(customerId);
    if (customer && !customer.isPhoneVerified) {
      throw new BadRequestException(
        'Vui lòng xác thực số điện thoại trước khi rút tiền',
      );
    }

    if (amount <= 0) {
      throw new BadRequestException('Số tiền rút phải lớn hơn 0');
    }

    if (amount < 50000) {
      throw new BadRequestException('Số tiền tối thiểu 50,000 VND');
    }

    if (!bankAccountNumber || !bankName || !accountHolderName) {
      throw new BadRequestException('Vui lòng nhập đầy đủ thông tin ngân hàng');
    }

    const wallet = await this.walletModel.findOne({
      userId: new Types.ObjectId(customerId),
    });

    if (!wallet) {
      throw new NotFoundException('Không tìm thấy ví');
    }

    if (wallet.isLocked) {
      throw new BadRequestException('Ví của bạn đã bị khóa');
    }

    if (wallet.balance < amount) {
      throw new BadRequestException(
        `Số dư không đủ. Hiện có: ${wallet.balance}VND`,
      );
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore - amount;
    const transactionCode = `WTH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create transaction record FIRST (don't deduct balance yet)
    const transaction = await this.transactionModel.create({
      customerId: new Types.ObjectId(customerId),
      userType: 'customer',
      type: TransactionType.WITHDRAW,
      status: TransactionStatus.PENDING,
      amount,
      fee: 0,
      description: description || 'Rút tiền từ ví',
      transactionCode,
      balanceBefore,
      balanceAfter,
      metadata: {
        requestedAt: new Date(),
        bankAccountNumber,
        bankName,
        accountHolderName,
      },
    });

    // Deduct balance ONLY after transaction created successfully
    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: {
        balance: -amount,
      },
    });

    console.log(
      `[Wallet] Manual withdraw request created: ${customerId} - ${amount}VND - Bank: ${bankName} ${bankAccountNumber}`,
    );
    return transaction;
  }

  async getTransactionHistory(
    customerId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: TransactionDocument[];
    total: number;
    page: number;
    pages: number;
  }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find({
          customerId: new Types.ObjectId(customerId),
          deletedAt: { $exists: false },
        })
        .populate(
          'bankAccount',
          'accountNumber accountHolder bankName name type',
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.transactionModel.countDocuments({
        customerId: new Types.ObjectId(customerId),
        deletedAt: { $exists: false },
      }),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      data: transactions,
      total,
      page,
      pages,
    };
  }

  async getTransaction(
    transactionId: string,
    customerId: string,
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findOne({
      _id: new Types.ObjectId(transactionId),
      customerId: new Types.ObjectId(customerId),
    });

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    return transaction;
  }

  async getWalletBalance(customerId: string): Promise<number> {
    const wallet = await this.walletModel.findOne({
      userId: new Types.ObjectId(customerId),
    });
    return wallet?.balance || 0;
  }

  // Admin methods for approving/rejecting deposits and withdrawals
  async approveDeposit(transactionId: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (transaction.type !== TransactionType.DEPOSIT) {
      throw new BadRequestException('Giao dịch này không phải là nạp tiền');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(
        `Giao dịch này đã được xử lý (${transaction.status})`,
      );
    }

    const customerId = transaction.customerId;
    const wallet = await this.walletModel.findOne({ userId: customerId });

    if (!wallet) {
      throw new NotFoundException('Không tìm thấy ví');
    }

    const balanceAfter = wallet.balance + transaction.amount;

    // Update wallet balance
    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: {
        balance: transaction.amount,
        totalTopUps: transaction.amount,
      },
    });

    // Update transaction
    const updated = await this.transactionModel.findByIdAndUpdate(
      transactionId,
      {
        status: TransactionStatus.SUCCESS,
        balanceAfter,
        metadata: {
          ...transaction.metadata,
          approvedAt: new Date(),
        },
      },
      { new: true },
    );

    console.log(
      `[Wallet] Deposit approved: ${customerId} - ${transaction.amount}VND`,
    );
    return updated;
  }

  async rejectDeposit(
    transactionId: string,
    reason: string,
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (transaction.type !== TransactionType.DEPOSIT) {
      throw new BadRequestException('Giao dịch này không phải là nạp tiền');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(
        `Giao dịch này đã được xử lý (${transaction.status})`,
      );
    }

    const updated = await this.transactionModel.findByIdAndUpdate(
      transactionId,
      {
        status: TransactionStatus.FAILED,
        metadata: {
          ...transaction.metadata,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      },
      { new: true },
    );

    console.log(
      `[Wallet] Deposit rejected: ${transaction.customerId} - Reason: ${reason}`,
    );
    return updated;
  }

  async approveWithdraw(transactionId: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (
      transaction.type !== TransactionType.WITHDRAW &&
      transaction.type !== TransactionType.WITHDRAWAL
    ) {
      throw new BadRequestException('Giao dịch này không phải là rút tiền');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(
        `Giao dịch này đã được xử lý (${transaction.status})`,
      );
    }

    // Change status from PENDING to PROCESSING
    const updated = await this.transactionModel.findByIdAndUpdate(
      transactionId,
      {
        status: TransactionStatus.PROCESSING,
        metadata: {
          ...transaction.metadata,
          approvedAt: new Date(),
        },
      },
      { new: true },
    );

    console.log(
      `[Wallet] Withdraw approved (processing): ${transaction.customerId} - ${transaction.amount}VND`,
    );
    return updated;
  }

  async updateWithdrawStatus(
    transactionId: string,
    newStatus: string,
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (
      transaction.type !== TransactionType.WITHDRAW &&
      transaction.type !== TransactionType.WITHDRAWAL
    ) {
      throw new BadRequestException('Giao dịch này không phải là rút tiền');
    }

    // Only allow transitions: PROCESSING → TRANSFERRING → SUCCESS
    const allowedTransitions: { [key: string]: string[] } = {
      [TransactionStatus.PROCESSING]: [TransactionStatus.TRANSFERRING],
      [TransactionStatus.TRANSFERRING]: [TransactionStatus.SUCCESS],
    };

    const currentStatus = transaction.status;
    if (
      !allowedTransitions[currentStatus] ||
      !allowedTransitions[currentStatus].includes(
        newStatus as TransactionStatus,
      )
    ) {
      throw new BadRequestException(
        `Không thể chuyển từ trạng thái ${currentStatus} sang ${newStatus}`,
      );
    }

    const updated = await this.transactionModel.findByIdAndUpdate(
      transactionId,
      {
        status: newStatus,
        metadata: {
          ...transaction.metadata,
          statusUpdatedAt: new Date(),
        },
      },
      { new: true },
    );

    console.log(
      `[Wallet] Withdraw status updated: ${transaction.customerId} - ${currentStatus} → ${newStatus}`,
    );
    return updated;
  }

  async rejectWithdraw(
    transactionId: string,
    reason: string,
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    if (
      transaction.type !== TransactionType.WITHDRAW &&
      transaction.type !== TransactionType.WITHDRAWAL
    ) {
      throw new BadRequestException('Giao dịch này không phải là rút tiền');
    }

    if (
      transaction.status === TransactionStatus.SUCCESS ||
      transaction.status === TransactionStatus.FAILED
    ) {
      throw new BadRequestException(
        `Giao dịch này đã được xử lý (${transaction.status})`,
      );
    }

    // Refund the amount back to wallet/driver
    if (transaction.userType === UserType.CUSTOMER) {
      // Customer: refund to Wallet
      const wallet = await this.walletModel.findOne({
        userId: transaction.customerId,
      });
      if (wallet) {
        await this.walletModel.findByIdAndUpdate(wallet._id, {
          $inc: {
            balance: Math.abs(transaction.amount),
          },
        });
      }
    } else if (transaction.userType === UserType.DRIVER) {
      // Driver: refund to Driver.walletBalance
      const driver = await this.driverModel.findById(transaction.driverId);
      if (driver) {
        await this.driverModel.findByIdAndUpdate(driver._id, {
          $inc: {
            walletBalance: Math.abs(transaction.amount),
            pendingBalance: -Math.abs(transaction.amount),
          },
        });
      }
    }

    const updated = await this.transactionModel.findByIdAndUpdate(
      transactionId,
      {
        status: TransactionStatus.FAILED,
        metadata: {
          ...transaction.metadata,
          rejectedAt: new Date(),
          rejectionReason: reason,
        },
      },
      { new: true },
    );

    console.log(
      `[Wallet] Withdraw rejected: ${transaction.customerId} - Reason: ${reason} - Amount refunded`,
    );
    return updated;
  }

  async getPendingTransactions(
    type?: string,
    limit: number = 50,
  ): Promise<TransactionDocument[]> {
    const filter: any = { status: TransactionStatus.PENDING };
    if (type) {
      filter.type = type.toUpperCase();
    }

    const transactions = await this.transactionModel
      .find(filter)
      .populate('customerId', 'firstName lastName email phone')
      .populate('driverId', 'firstName lastName email phone')
      .populate('bankAccount', 'accountNumber accountHolder bankName name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Dynamically populate userId based on userType
    for (const transaction of transactions) {
      if (transaction.userId && transaction.userType) {
        const modelName =
          transaction.userType === 'customer' ? 'Customer' : 'Driver';
        const populated = await this.transactionModel
          .findById(transaction._id)
          .populate({
            path: 'userId',
            model: modelName,
            select: 'firstName lastName email phone',
          })
          .lean();
        if (populated?.userId) {
          transaction.userId = populated.userId;
        }
      }
    }

    return transactions;
  }

  async getAllTransactions(
    limit: number = 100,
  ): Promise<TransactionDocument[]> {
    // Get all transactions in processing states (pending, processing, transferring, success, failed)
    const transactions = await this.transactionModel
      .find({
        status: {
          $in: [
            TransactionStatus.PENDING,
            TransactionStatus.PROCESSING,
            TransactionStatus.TRANSFERRING,
            TransactionStatus.SUCCESS,
            TransactionStatus.FAILED,
          ],
        },
      })
      .populate('customerId', 'firstName lastName email phone')
      .populate('driverId', 'firstName lastName email phone')
      .populate('bankAccount', 'accountNumber accountHolder bankName name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Dynamically populate userId based on userType
    for (const transaction of transactions) {
      if (transaction.userId && transaction.userType) {
        const modelName =
          transaction.userType === 'customer' ? 'Customer' : 'Driver';
        const populated = await this.transactionModel
          .findById(transaction._id)
          .populate({
            path: 'userId',
            model: modelName,
            select: 'firstName lastName email phone',
          })
          .lean();
        if (populated?.userId) {
          transaction.userId = populated.userId;
        }
      }
    }

    return transactions;
  }

  generateEMVQRCode(
    accountNo: string,
    amount: number,
    description: string,
  ): { qrData: string } {
    try {
      // Tạo EMV QR data string chứa đầy đủ thông tin: tài khoản, số tiền, nội dung
      // Định dạng: amount|accountNo|description
      // Banks sẽ parse và auto-fill vào app
      const qrData = `00020101051100068306041000070704128A0F9C240001${this.padZero(accountNo, 2, 'len')}${this.padZero(amount.toString(), 2, 'len')}${this.padZero(description, 2, 'len')}`;

      console.log(
        `[Wallet] Generated QR data for ${accountNo} - ${amount}VND - "${description}"`,
      );
      return { qrData };
    } catch (error) {
      console.error('[Wallet] Error generating QR data:', error);
      throw new BadRequestException('Không thể tạo mã QR');
    }
  }

  private padZero(value: string, length: number, mode = 'val'): string {
    if (mode === 'len') {
      return String(value.length).padStart(length, '0') + value;
    }
    return value.padStart(length, '0');
  }

  private calculateCRC16(data: string): number {
    let crc = 0xffff;
    for (let i = 0; i < data.length; i += 2) {
      const byte = parseInt(data.substr(i, 2), 16);
      crc ^= byte << 8;
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc = crc & 0xffff;
      }
    }
    return crc;
  }

  async cancelWithdraw(
    transactionId: string,
    customerId: string,
  ): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch');
    }

    // Verify ownership (check both customer and driver)
    const isCustomer =
      transaction.customerId &&
      transaction.customerId.toString() === customerId;
    const isDriver =
      transaction.driverId && transaction.driverId.toString() === customerId;

    if (!isCustomer && !isDriver) {
      throw new BadRequestException('Bạn không có quyền hủy giao dịch này');
    }

    if (
      transaction.type !== TransactionType.WITHDRAW &&
      transaction.type !== TransactionType.WITHDRAWAL
    ) {
      throw new BadRequestException('Giao dịch này không phải là rút tiền');
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(
        `Chỉ có thể hủy những giao dịch đang chờ duyệt`,
      );
    }

    // Refund the amount back to wallet/driver
    if (transaction.userType === UserType.CUSTOMER) {
      // Customer: refund to Wallet
      const wallet = await this.walletModel.findOne({
        userId: transaction.customerId,
      });
      if (wallet) {
        await this.walletModel.findByIdAndUpdate(wallet._id, {
          $inc: {
            balance: Math.abs(transaction.amount),
          },
        });
      }
    } else if (transaction.userType === UserType.DRIVER) {
      // Driver: refund to Driver.walletBalance (but this is customer-only endpoint, shouldn't reach here)
      const driver = await this.driverModel.findById(transaction.driverId);
      if (driver) {
        await this.driverModel.findByIdAndUpdate(driver._id, {
          $inc: {
            walletBalance: Math.abs(transaction.amount),
            pendingBalance: -Math.abs(transaction.amount),
          },
        });
      }
    }

    const updated = await this.transactionModel.findByIdAndUpdate(
      transactionId,
      {
        status: TransactionStatus.CANCELLED,
        metadata: {
          ...transaction.metadata,
          cancelledAt: new Date(),
          cancelledBy: 'customer',
        },
      },
      { new: true },
    );

    console.log(
      `[Wallet] Withdraw cancelled: ${customerId} - ${transaction.amount}VND - Code: ${transaction.transactionCode}`,
    );
    return updated;
  }

  /**
   * Get transaction status by ID (for auto-check payment completion)
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
   * Get topup discount percentage for customer/driver
   */
  async getTopupDiscount(userType: 'customer' | 'driver' = 'customer') {
    try {
      console.log(`[WalletsService] Getting topup discount for: ${userType}`);
      const discount = await this.pricingService.getTopupDiscount(userType);
      console.log(`[WalletsService] Discount result: ${discount}%`);
      return {
        discount,
      };
    } catch (error) {
      console.error('[WalletsService] ❌ Error getting topup discount:', error);
      console.error('[WalletsService] ❌ Error stack:', error.stack);
      // Return 0 discount on error instead of crashing
      return {
        discount: 0,
      };
    }
  }
}
