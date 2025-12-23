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

  async getTransactionHistory(userId: string, limit: number = 20, skip: number = 0): Promise<TransactionDocument[]> {
    return this.transactionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
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
}
