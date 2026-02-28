import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { TopUpWalletDto, PaymentDto } from './dto';
import { DepositDto, WithdrawDto, TransactionQueryDto } from './dto/transaction.dto';
import { GenerateQRCodeDto } from './dto/qr-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserType } from './schemas/transaction.schema';
import { SepayService } from '../drivers/services/sepay.service';

@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly sepayService: SepayService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyWallet(@Request() req: any) {
    return this.walletsService.getWallet(req.user.id);
  }

  @Post('topup')
  @UseGuards(JwtAuthGuard)
  async topUp(@Request() req: any, @Body() topUpWalletDto: TopUpWalletDto) {
    // Determine user type from request (driver or customer)
    // This depends on your auth system - you may store role/type in req.user
    const userType = req.user.type === 'driver' ? UserType.DRIVER : UserType.CUSTOMER;
    
    return this.walletsService.topUp(req.user.id, topUpWalletDto, userType);
  }

  @Post('deposit')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async deposit(@Request() req: any, @Body() depositDto: DepositDto) {
    console.log(`[WalletsController] Deposit request from ${req.user.id}`)
    return this.walletsService.deposit(
      req.user.id,
      depositDto.amount,
      depositDto.paymentMethodId,
      depositDto.description,
    );
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async withdraw(@Request() req: any, @Body() withdrawDto: WithdrawDto) {
    console.log(`[WalletsController] Withdraw request from ${req.user.id}`, withdrawDto)
    
    // Support both saved payment method and manual entry
    if (withdrawDto.bankAccount && !withdrawDto.bankAccount.startsWith('TEMP_')) {
      // Using saved payment method
      return this.walletsService.withdraw(
        req.user.id,
        withdrawDto.amount,
        withdrawDto.bankAccount,
        withdrawDto.description,
      );
    } else {
      // Manual entry or TEMP_ ID
      return this.walletsService.withdrawManual(
        req.user.id,
        withdrawDto.amount,
        withdrawDto.bankAccountNumber,
        withdrawDto.bankName,
        withdrawDto.accountHolderName,
        withdrawDto.description,
      );
    }
  }

  @Post('payment')
  @UseGuards(JwtAuthGuard)
  async payment(@Request() req: any, @Body() paymentDto: PaymentDto) {
    return this.walletsService.deductBalance(
      req.user.id,
      paymentDto.amount,
      paymentDto.rideId,
      paymentDto.description,
    );
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(
    @Request() req: any,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 20,
  ) {
    return this.walletsService.getTransactionHistory(req.user.id, page, limit);
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  async getBalance(@Request() req: any) {
    const balance = await this.walletsService.getWalletBalance(req.user.id)
    return { balance }
  }

  /**
   * POST /api/wallets/sepay-topup
   * Create a topup transaction and generate Sepay QR code for customers
   */
  @Post('sepay-topup')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createSepayTopup(
    @Request() req: any,
    @Body() dto: { amount: number },
  ) {
    console.log('[WalletsController] Creating customer Sepay topup:', {
      userId: req.user?.id,
      amount: dto.amount,
    });

    try {
      // Validate amount
      if (!dto.amount || dto.amount < 10000) {
        throw new Error('Số tiền nạp tối thiểu là 10.000đ');
      }

      // Create transaction (PENDING status)
      const transaction = await this.walletsService.createTopupTransaction(
        req.user.id,
        dto.amount,
      );

      // Generate QR code
      const qrInfo = this.sepayService.generateQRCode(
        dto.amount,
        transaction._id.toString(),
        'customer',
      );

      console.log('[WalletsController] ✅ Customer topup created with QR code:', qrInfo.content);

      return {
        success: true,
        transactionId: transaction._id,
        amount: dto.amount,
        qrCodeUrl: qrInfo.qrCodeUrl,
        content: qrInfo.content,
        accountNo: qrInfo.accountNo,
        accountName: qrInfo.accountName,
        bankName: qrInfo.bankName,
        bankId: qrInfo.bankId,
      };
    } catch (error: any) {
      console.error('[WalletsController] ❌ Error creating Sepay topup:', error);
      throw error;
    }
  }

  /**
   * GET /api/wallets/transactions/:transactionId/status
   * Check transaction status for auto-check payment completion
   */
  @Get('transactions/:transactionId/status')
  @UseGuards(JwtAuthGuard)
  async getTransactionStatus(@Param('transactionId') transactionId: string) {
    return this.walletsService.getTransactionStatus(transactionId);
  }

  /**
   * GET /api/wallets/topup-discount
   * Get current topup discount percentage for customers
   */
  @Get('topup-discount')
  @UseGuards(JwtAuthGuard)
  async getTopupDiscount(@Request() req: any) {
    try {
      console.log('[WalletsController] Getting topup discount for customer:', req.user?.id);
      const result = await this.walletsService.getTopupDiscount('customer');
      console.log('[WalletsController] Topup discount result:', result);
      return result;
    } catch (error) {
      console.error('[WalletsController] ❌ Error getting topup discount:', error);
      throw error;
    }
  }

  // Admin endpoints for managing deposits and withdrawals
  @Get('admin/pending')
  @UseGuards(JwtAuthGuard)
  async getPendingTransactions(
    @Query('type') type?: string,
    @Query('limit') limit: number = 50,
  ) {
    return this.walletsService.getPendingTransactions(type, limit);
  }

  @Get('admin/transactions')
  @UseGuards(JwtAuthGuard)
  async getAllTransactions(
    @Query('limit') limit: number = 100,
  ) {
    return this.walletsService.getAllTransactions(limit);
  }

  @Post('admin/deposit/:id/approve')
  @UseGuards(JwtAuthGuard)
  async approveDeposit(@Param('id') id: string) {
    return this.walletsService.approveDeposit(id);
  }

  @Post('admin/deposit/:id/reject')
  @UseGuards(JwtAuthGuard)
  async rejectDeposit(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.walletsService.rejectDeposit(id, reason);
  }

  @Post('admin/withdraw/:id/approve')
  @UseGuards(JwtAuthGuard)
  async approveWithdraw(@Param('id') id: string) {
    return this.walletsService.approveWithdraw(id);
  }

  @Post('admin/withdraw/:id/reject')
  @UseGuards(JwtAuthGuard)
  async rejectWithdraw(
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    return this.walletsService.rejectWithdraw(id, reason);
  }

  @Post('admin/withdraw/:id/status')
  @UseGuards(JwtAuthGuard)
  async updateWithdrawStatus(
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    // Check current status
    const transaction = await this.walletsService.getTransactionById(id)
    
    // If trying to move from PENDING to PROCESSING, call approveWithdraw
    if (transaction.status === 'pending' && status === 'processing') {
      return this.walletsService.approveWithdraw(id)
    }
    
    // Otherwise call updateWithdrawStatus for other transitions
    return this.walletsService.updateWithdrawStatus(id, status)
  }
  @Post('withdraw/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelWithdraw(@Param('id') id: string, @Request() req: any) {
    return this.walletsService.cancelWithdraw(id, req.user.sub)
  }
  @Post('generate-qr-code')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async generateQRCode(@Body() dto: GenerateQRCodeDto) {
    return this.walletsService.generateEMVQRCode(
      '0986190053',
      dto.amount,
      dto.description,
    );
  }

  /**
   * GET /api/wallets/:id
   * Get wallet by ID (place last to avoid route conflicts with specific routes)
   */
  @Get(':id')
  async getWalletById(@Param('id') id: string) {
    return this.walletsService.getWalletById(id);
  }
}
