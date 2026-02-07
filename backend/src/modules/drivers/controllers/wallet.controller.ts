import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { WalletService } from '../services/wallet.service';
import { SepayService } from '../services/sepay.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentMethod } from '../schemas/wallet-transaction.schema';

class TopupDto {
  amount: number;
  paymentMethod: PaymentMethod;
  note?: string;
}

class WithdrawDto {
  amount: number;
  bankAccountNumber: string;
  bankName: string;
  accountHolderName: string;
  note?: string;
}

@Controller('drivers/wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly sepayService: SepayService,
  ) {}

  /**
   * GET /drivers/wallet/balance
   * Get current wallet balance
   */
  @Get('balance')
  async getBalance(@Request() req: any) {
    const driverId = req.user.driverId || req.user.id;
    return await this.walletService.getBalance(driverId);
  }

  /**
   * POST /drivers/wallet/topup
   * Top-up wallet
   */
  @Post('topup')
  async topup(@Request() req: any, @Body() dto: TopupDto) {
    const driverId = req.user.driverId || req.user.id;
    return await this.walletService.topup(
      driverId,
      dto.amount,
      dto.paymentMethod,
      dto.note,
    );
  }

  /**
   * POST /drivers/wallet/withdraw
   * Withdraw money
   */
  @Post('withdraw')
  async withdraw(@Request() req: any, @Body() dto: WithdrawDto) {
    const driverId = req.user.driverId || req.user.id;
    return await this.walletService.withdraw(
      driverId,
      dto.amount,
      dto.bankAccountNumber,
      dto.bankName,
      dto.accountHolderName,
      dto.note,
    );
  }

  /**
   * GET /drivers/wallet/transactions
   * Get transaction history
   */
  @Get('transactions')
  async getTransactions(
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string,
  ) {
    const driverId = req.user.driverId || req.user.id;
    const limitNum = limit ? parseInt(limit) : 20;
    const skipNum = skip ? parseInt(skip) : 0;
    
    return await this.walletService.getTransactions(driverId, limitNum, skipNum);
  }

  /**
   * GET /drivers/wallet/stats
   * Get wallet statistics
   */
  @Get('stats')
  async getStats(@Request() req: any) {
    const driverId = req.user.driverId || req.user.id;
    return await this.walletService.getStats(driverId);
  }

  /**
   * POST /drivers/wallet/sepay/create
   * Create Sepay QR payment for top-up
   */
  @Post('sepay/create')
  async createSepayPayment(@Request() req: any, @Body() dto: { amount: number; note?: string }) {
    const driverId = req.user.driverId || req.user.id;
    
    // Create pending transaction
    const transaction = await this.walletService.topup(
      driverId,
      dto.amount,
      PaymentMethod.BANK_TRANSFER,
      dto.note,
    );

    // Generate Sepay QR code
    const sepayInfo = this.sepayService.generateQRCode(
      dto.amount,
      transaction.transactionId.toString(),
    );

    return {
      success: true,
      transactionId: transaction.transactionId,
      ...sepayInfo,
    };
  }
}
