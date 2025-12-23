import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { WalletsService } from './wallets.service';
import { TopUpWalletDto, PaymentDto } from './dto';
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
    @Query('limit') limit: number = 20,
    @Query('skip') skip: number = 0,
  ) {
    return this.walletsService.getTransactionHistory(req.user.id, limit, skip);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req: any) {
    return this.walletsService.getWalletStats(req.user.id);
  }

  @Get(':id')
  async getWalletById(@Param('id') id: string) {
    return this.walletsService.getWalletById(id);
  }
}
