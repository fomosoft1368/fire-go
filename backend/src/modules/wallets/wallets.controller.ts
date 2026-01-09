import { Controller, Get, Post, Body, Param, UseGuards, Request, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { TopUpWalletDto, PaymentDto } from './dto';
import { DepositDto, WithdrawDto, TransactionQueryDto } from './dto/transaction.dto';
import { GenerateQRCodeDto } from './dto/qr-code.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyWallet(@Request() req: any) {
    return this.walletsService.getWallet(req.user.id);
  }

  @Post('topup')
  @UseGuards(JwtAuthGuard)
  async topUp(@Request() req: any, @Body() topUpWalletDto: TopUpWalletDto) {
    return this.walletsService.topUp(req.user.id, topUpWalletDto);
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
    console.log(`[WalletsController] Withdraw request from ${req.user.id}`)
    return this.walletsService.withdraw(
      req.user.id,
      withdrawDto.amount,
      withdrawDto.bankAccount,
      withdrawDto.description,
    );
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

  @Get(':id')
  async getWalletById(@Param('id') id: string) {
    return this.walletsService.getWalletById(id);
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
}
