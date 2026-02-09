import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TransactionType, TransactionStatus } from '../schemas/wallet-transaction.schema';

@Controller('api/wallet/admin')
@UseGuards(JwtAuthGuard) // Only authenticated admins
export class WalletAdminController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * GET /api/wallet/admin/transactions
   * Get all wallet transactions (topup, withdrawal, commission, bonus)
   */
  @Get('transactions')
  async getAllTransactions(
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
    @Query('type') type?: TransactionType,
    @Query('status') status?: TransactionStatus,
    @Query('driverId') driverId?: string,
  ) {
    const limitNum = limit ? parseInt(limit) : 50;
    const skipNum = skip ? parseInt(skip) : 0;

    return await this.walletService.getAllTransactions(limitNum, skipNum, {
      type,
      status,
      driverId,
    });
  }

  /**
   * GET /api/wallet/admin/pending-withdrawals
   * Get all pending withdrawal requests
   */
  @Get('pending-withdrawals')
  async getPendingWithdrawals() {
    return await this.walletService.getAllTransactions(100, 0, {
      type: TransactionType.WITHDRAWAL,
      status: TransactionStatus.PENDING,
    });
  }

  /**
   * POST /api/wallet/admin/approve-withdrawal/:transactionId
   * Approve withdrawal request (after admin transferred money)
   */
  @Post('approve-withdrawal/:transactionId')
  @HttpCode(HttpStatus.OK)
  async approveWithdrawal(@Param('transactionId') transactionId: string) {
    // TODO: Implement approve withdrawal logic
    // Update transaction status to COMPLETED
    return {
      success: true,
      message: 'Withdrawal approved (implementation pending)',
      transactionId,
    };
  }

  /**
   * POST /api/wallet/admin/reject-withdrawal/:transactionId
   * Reject withdrawal request (refund money to driver)
   */
  @Post('reject-withdrawal/:transactionId')
  @HttpCode(HttpStatus.OK)
  async rejectWithdrawal(@Param('transactionId') transactionId: string) {
    // TODO: Implement reject withdrawal logic
    // Refund money to driver walletBalance
    // Update transaction status to FAILED
    return {
      success: true,
      message: 'Withdrawal rejected (implementation pending)',
      transactionId,
    };
  }
}
