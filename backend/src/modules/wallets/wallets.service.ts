import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wallet, WalletDocument } from './schemas/wallet.schema';
import { Transaction, TransactionDocument, TransactionType, TransactionStatus } from './schemas/transaction.schema';
import { TopUpWalletDto, PaymentDto } from './dto';

@Injectable()
export class WalletsService {
  constructor(
    @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
    @InjectModel(Transaction.name) private transactionModel: Model<TransactionDocument>,
  ) {}

  async createWallet(userId: string): Promise<WalletDocument> {
    const wallet = await this.walletModel.create({
      userId: new Types.ObjectId(userId),
      balance: 0,
    });

    return wallet;
  }

  async getWallet(userId: string): Promise<WalletDocument> {
    let wallet = await this.walletModel.findOne({ userId: new Types.ObjectId(userId) });

    if (!wallet) {
      wallet = await this.createWallet(userId) as any;
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

  async topUp(userId: string, topUpWalletDto: TopUpWalletDto): Promise<TransactionDocument> {
    if (topUpWalletDto.amount <= 0) {
      throw new BadRequestException('Top-up amount must be greater than 0');
    }

    const wallet = await this.getWallet(userId);

    if (wallet.isLocked) {
      throw new BadRequestException('Wallet is locked');
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore + topUpWalletDto.amount;

    // Update wallet balance
    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: {
        balance: topUpWalletDto.amount,
        totalTopUps: topUpWalletDto.amount,
      },
    });

    // Create transaction record
    const transaction = await this.transactionModel.create({
      userId: new Types.ObjectId(userId),
      type: TransactionType.TOP_UP,
      amount: topUpWalletDto.amount,
      status: TransactionStatus.SUCCESS,
      description: topUpWalletDto.description,
      paymentMethod: topUpWalletDto.paymentMethod,
      balanceBefore,
      balanceAfter,
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
      type,
      amount,
      status: TransactionStatus.SUCCESS,
      description,
      balanceBefore,
      balanceAfter,
    });

    return transaction;
  }

  async refundTransaction(transactionId: string, reason?: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${transactionId} not found`);
    }

    if (transaction.status !== TransactionStatus.SUCCESS) {
      throw new BadRequestException('Only successful transactions can be refunded');
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
            $sum: { $cond: [{ $eq: ['$status', TransactionStatus.SUCCESS] }, 1, 0] },
          },
          totalTopUps: {
            $sum: {
              $cond: [{ $eq: ['$type', TransactionType.TOP_UP] }, '$amount', 0],
            },
          },
          totalSpent: {
            $sum: {
              $cond: [{ $eq: ['$type', TransactionType.PAYMENT] }, '$amount', 0],
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

  async lockWallet(userId: string, reason: string, until?: Date): Promise<WalletDocument> {
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

  async getTransactionById(transactionId: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel
      .findById(transactionId)
      .populate('customerId', 'firstName lastName email phone')
      .populate('bankAccount', 'accountNumber accountHolder bankName name')
      .lean()
    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch')
    }
    return transaction
  }

  // ==================== Deposit/Withdraw Methods ====================

  async deposit(customerId: string, amount: number, paymentMethodId: string, description: string): Promise<TransactionDocument> {
    if (amount <= 0) {
      throw new BadRequestException('Số tiền nạp phải lớn hơn 0')
    }

    if (amount < 10000) {
      throw new BadRequestException('Số tiền tối thiểu 10,000 VND')
    }

    // Get or create wallet for customer (using customerId as identifier)
    let wallet = await this.walletModel.findOne({ userId: new Types.ObjectId(customerId) })
    
    if (!wallet) {
      wallet = await this.walletModel.create({
        userId: new Types.ObjectId(customerId),
        balance: 0,
      })
    }

    if (wallet.isLocked) {
      throw new BadRequestException('Ví của bạn đã bị khóa')
    }

    const balanceBefore = wallet.balance
    const transactionCode = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Create transaction record with PENDING status (admin needs to approve)
    const transaction = await this.transactionModel.create({
      customerId: new Types.ObjectId(customerId),
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
    })

    console.log(`[Wallet] Deposit request created: ${customerId} - ${amount}VND - Code: ${transactionCode}`)
    return transaction
  }

  async withdraw(customerId: string, amount: number, bankAccountId: string, description: string): Promise<TransactionDocument> {
    if (amount <= 0) {
      throw new BadRequestException('Số tiền rút phải lớn hơn 0')
    }

    if (amount < 50000) {
      throw new BadRequestException('Số tiền tối thiểu 50,000 VND')
    }

    const wallet = await this.walletModel.findOne({ userId: new Types.ObjectId(customerId) })
    
    if (!wallet) {
      throw new NotFoundException('Không tìm thấy ví')
    }

    if (wallet.isLocked) {
      throw new BadRequestException('Ví của bạn đã bị khóa')
    }

    if (wallet.balance < amount) {
      throw new BadRequestException(`Số dư không đủ. Hiện có: ${wallet.balance}VND`)
    }

    const balanceBefore = wallet.balance
    const balanceAfter = balanceBefore - amount
    const transactionCode = `WTH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Deduct balance immediately
    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: {
        balance: -amount,
      },
    })

    // Create transaction record with PENDING status (admin needs to process)
    const transaction = await this.transactionModel.create({
      customerId: new Types.ObjectId(customerId),
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
    })

    console.log(`[Wallet] Withdraw request created: ${customerId} - ${amount}VND - Code: ${transactionCode} - Balance deducted immediately`)
    return transaction
  }

  async getTransactionHistory(customerId: string, page: number = 1, limit: number = 20): Promise<{ data: TransactionDocument[], total: number, page: number, pages: number }> {
    const skip = (page - 1) * limit
    
    const [transactions, total] = await Promise.all([
      this.transactionModel
        .find({ customerId: new Types.ObjectId(customerId), deletedAt: { $exists: false } })
        .populate('bankAccount', 'accountNumber accountHolder bankName name type')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.transactionModel.countDocuments({ customerId: new Types.ObjectId(customerId), deletedAt: { $exists: false } }),
    ])

    const pages = Math.ceil(total / limit)

    return {
      data: transactions,
      total,
      page,
      pages,
    }
  }

  async getTransaction(transactionId: string, customerId: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findOne({
      _id: new Types.ObjectId(transactionId),
      customerId: new Types.ObjectId(customerId),
    })

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch')
    }

    return transaction
  }

  async getWalletBalance(customerId: string): Promise<number> {
    const wallet = await this.walletModel.findOne({ userId: new Types.ObjectId(customerId) })
    return wallet?.balance || 0
  }

  // Admin methods for approving/rejecting deposits and withdrawals
  async approveDeposit(transactionId: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId)

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch')
    }

    if (transaction.type !== TransactionType.DEPOSIT) {
      throw new BadRequestException('Giao dịch này không phải là nạp tiền')
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(`Giao dịch này đã được xử lý (${transaction.status})`)
    }

    const customerId = transaction.customerId
    const wallet = await this.walletModel.findOne({ userId: customerId })

    if (!wallet) {
      throw new NotFoundException('Không tìm thấy ví')
    }

    const balanceAfter = wallet.balance + transaction.amount

    // Update wallet balance
    await this.walletModel.findByIdAndUpdate(wallet._id, {
      $inc: {
        balance: transaction.amount,
        totalTopUps: transaction.amount,
      },
    })

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
    )

    console.log(`[Wallet] Deposit approved: ${customerId} - ${transaction.amount}VND`)
    return updated
  }

  async rejectDeposit(transactionId: string, reason: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId)

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch')
    }

    if (transaction.type !== TransactionType.DEPOSIT) {
      throw new BadRequestException('Giao dịch này không phải là nạp tiền')
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(`Giao dịch này đã được xử lý (${transaction.status})`)
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
    )

    console.log(`[Wallet] Deposit rejected: ${transaction.customerId} - Reason: ${reason}`)
    return updated
  }

  async approveWithdraw(transactionId: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId)

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch')
    }

    if (transaction.type !== TransactionType.WITHDRAW) {
      throw new BadRequestException('Giao dịch này không phải là rút tiền')
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(`Giao dịch này đã được xử lý (${transaction.status})`)
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
    )

    console.log(`[Wallet] Withdraw approved (processing): ${transaction.customerId} - ${transaction.amount}VND`)
    return updated
  }

  async updateWithdrawStatus(transactionId: string, newStatus: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId)

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch')
    }

    if (transaction.type !== TransactionType.WITHDRAW) {
      throw new BadRequestException('Giao dịch này không phải là rút tiền')
    }

    // Only allow transitions: PROCESSING → TRANSFERRING → SUCCESS
    const allowedTransitions: { [key: string]: string[] } = {
      [TransactionStatus.PROCESSING]: [TransactionStatus.TRANSFERRING],
      [TransactionStatus.TRANSFERRING]: [TransactionStatus.SUCCESS],
    }

    const currentStatus = transaction.status
    if (!allowedTransitions[currentStatus] || !allowedTransitions[currentStatus].includes(newStatus as TransactionStatus)) {
      throw new BadRequestException(
        `Không thể chuyển từ trạng thái ${currentStatus} sang ${newStatus}`
      )
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
    )

    console.log(`[Wallet] Withdraw status updated: ${transaction.customerId} - ${currentStatus} → ${newStatus}`)
    return updated
  }

  async rejectWithdraw(transactionId: string, reason: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId)

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch')
    }

    if (transaction.type !== TransactionType.WITHDRAW) {
      throw new BadRequestException('Giao dịch này không phải là rút tiền')
    }

    if (transaction.status === TransactionStatus.SUCCESS || transaction.status === TransactionStatus.FAILED) {
      throw new BadRequestException(`Giao dịch này đã được xử lý (${transaction.status})`)
    }

    // Refund the amount back to wallet
    const wallet = await this.walletModel.findOne({ userId: transaction.customerId })
    if (wallet) {
      await this.walletModel.findByIdAndUpdate(wallet._id, {
        $inc: {
          balance: transaction.amount,
        },
      })
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
    )

    console.log(`[Wallet] Withdraw rejected: ${transaction.customerId} - Reason: ${reason} - Amount refunded`)
    return updated
  }

  async getPendingTransactions(type?: string, limit: number = 50): Promise<TransactionDocument[]> {
    const filter: any = { status: TransactionStatus.PENDING }
    if (type) {
      filter.type = type.toUpperCase()
    }

    return this.transactionModel
      .find(filter)
      .populate('customerId', 'firstName lastName email phone')
      .populate('bankAccount', 'accountNumber accountHolder bankName name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  }

  async getAllTransactions(limit: number = 100): Promise<TransactionDocument[]> {
    // Get all transactions in processing states (pending, processing, transferring, success, failed)
    return this.transactionModel
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
      .populate('bankAccount', 'accountNumber accountHolder bankName name')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
  }

  generateEMVQRCode(accountNo: string, amount: number, description: string): { qrData: string } {
    try {
      // Tạo EMV QR data string chứa đầy đủ thông tin: tài khoản, số tiền, nội dung
      // Định dạng: amount|accountNo|description
      // Banks sẽ parse và auto-fill vào app
      const qrData = `00020101051100068306041000070704128A0F9C240001${this.padZero(accountNo, 2, 'len')}${this.padZero(amount.toString(), 2, 'len')}${this.padZero(description, 2, 'len')}`

      console.log(`[Wallet] Generated QR data for ${accountNo} - ${amount}VND - "${description}"`)
      return { qrData }
    } catch (error) {
      console.error('[Wallet] Error generating QR data:', error)
      throw new BadRequestException('Không thể tạo mã QR')
    }
  }

  private padZero(value: string, length: number, mode = 'val'): string {
    if (mode === 'len') {
      return String(value.length).padStart(length, '0') + value
    }
    return value.padStart(length, '0')
  }

  private calculateCRC16(data: string): number {
    let crc = 0xffff
    for (let i = 0; i < data.length; i += 2) {
      const byte = parseInt(data.substr(i, 2), 16)
      crc ^= byte << 8
      for (let j = 0; j < 8; j++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
        crc = crc & 0xffff
      }
    }
    return crc
  }

  async cancelWithdraw(transactionId: string, customerId: string): Promise<TransactionDocument> {
    const transaction = await this.transactionModel.findById(transactionId)

    if (!transaction) {
      throw new NotFoundException('Không tìm thấy giao dịch')
    }

    // Verify ownership
    if (transaction.customerId.toString() !== customerId) {
      throw new BadRequestException('Bạn không có quyền hủy giao dịch này')
    }

    if (transaction.type !== TransactionType.WITHDRAW) {
      throw new BadRequestException('Giao dịch này không phải là rút tiền')
    }

    if (transaction.status !== TransactionStatus.PENDING) {
      throw new BadRequestException(`Chỉ có thể hủy những giao dịch đang chờ duyệt`)
    }

    // Refund the amount back to wallet
    const wallet = await this.walletModel.findOne({ userId: transaction.customerId })
    if (wallet) {
      await this.walletModel.findByIdAndUpdate(wallet._id, {
        $inc: {
          balance: transaction.amount,
        },
      })
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
    )

    console.log(`[Wallet] Withdraw cancelled: ${customerId} - ${transaction.amount}VND - Code: ${transaction.transactionCode}`)
    return updated
  }
}
