import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  /**
   * Tạo URL thanh toán VNPay
   */
  @Post('vnpay/create-payment')
  @UseGuards(JwtAuthGuard)
  createVNPayPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: any,
  ) {
    try {
      const { amount, orderInfo, language } = createPaymentDto;
      const userId = req.user.id || req.user._id;

      // Tạo order ID
      const orderId = `${userId}-${Date.now()}`;

      // Tạo URL thanh toán
      const paymentUrl = this.paymentService.createPaymentUrl(
        amount,
        orderId,
        orderInfo,
        userId,
        language,
      );

      return {
        success: true,
        paymentUrl,
        orderId,
      };
    } catch (error: any) {
      console.error('[PaymentController] Error creating payment:', error);
      return {
        success: false,
        message: error.message || 'Failed to create payment',
      };
    }
  }

  /**
   * VNPay callback - khi user quay lại từ VNPay
   */
  @Get('vnpay/return')
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    try {
      console.log('[PaymentController] VNPay return callback received:', query);

      const { vnp_SecureHash, ...vnpParams } = query;

      // Xác minh chữ ký
      const isValid = this.paymentService.verifyPaymentSignature(
        vnpParams,
        vnp_SecureHash,
      );

      if (!isValid) {
        console.warn('[PaymentController] Invalid signature');
        return res.redirect(
          '/payment/result?success=false&message=Invalid+signature',
        );
      }

      // Xử lý kết quả thanh toán
      const result = await this.paymentService.handlePaymentCallback({
        ...vnpParams,
        userId: this.extractUserIdFromOrderId(vnpParams.vnp_TxnRef),
      });

      // Redirect về app với kết quả
      const redirectUrl =
        result.success === true
          ? `exp://payment/result?success=true&transactionId=${result.transactionId}`
          : `exp://payment/result?success=false&message=${encodeURIComponent(
              result.message || 'Payment failed',
            )}`;

      console.log('[PaymentController] Redirecting to:', redirectUrl);
      return res.redirect(redirectUrl);
    } catch (error: any) {
      console.error('[PaymentController] Error in VNPay return:', error);
      return res.redirect(
        '/payment/result?success=false&message=Error+processing+payment',
      );
    }
  }

  /**
   * VNPay webhook - callback từ VNPay server
   */
  @Post('vnpay/notify')
  async vnpayNotify(@Query() query: any, @Res() res: Response) {
    try {
      console.log('[PaymentController] VNPay notify webhook received');

      const { vnp_SecureHash, ...vnpParams } = query;

      // Xác minh chữ ký
      const isValid = this.paymentService.verifyPaymentSignature(
        vnpParams,
        vnp_SecureHash,
      );

      if (!isValid) {
        console.warn('[PaymentController] Invalid signature on notify');
        return res.json({ RspCode: '97', Message: 'Invalid signature' });
      }

      // Xử lý kết quả thanh toán
      await this.paymentService.handlePaymentCallback({
        ...vnpParams,
        userId: this.extractUserIdFromOrderId(vnpParams.vnp_TxnRef),
      });

      // VNPay yêu cầu response này
      return res.json({ RspCode: '00', Message: 'Notify received' });
    } catch (error: any) {
      console.error('[PaymentController] Error in VNPay notify:', error);
      return res.json({ RspCode: '99', Message: 'Error processing notify' });
    }
  }

  /**
   * Xác minh thanh toán
   */
  @Post('vnpay/verify-payment')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Body() data: any, @Request() req: any) {
    try {
      const result = await this.paymentService.handlePaymentCallback({
        ...data,
        userId: req.user.id || req.user._id,
      });

      return result;
    } catch (error: any) {
      console.error('[PaymentController] Error verifying payment:', error);
      return {
        success: false,
        message: error.message || 'Failed to verify payment',
      };
    }
  }

  /**
   * Lấy lịch sử thanh toán
   */
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getPaymentHistory(
    @Request() req: any,
    @Query('limit') limit: string = '10',
  ) {
    try {
      const userId = req.user.id || req.user._id;
      const parsedLimit = parseInt(limit, 10) || 10;

      const history = await this.paymentService.getPaymentHistory(
        userId,
        parsedLimit,
      );

      return {
        success: true,
        data: history,
      };
    } catch (error: any) {
      console.error(
        '[PaymentController] Error fetching payment history:',
        error,
      );
      return {
        success: false,
        message: error.message || 'Failed to fetch payment history',
      };
    }
  }

  /**
   * Kiểm tra trạng thái thanh toán
   */
  @Get(':transactionId/status')
  @UseGuards(JwtAuthGuard)
  async checkPaymentStatus(@Param('transactionId') transactionId: string) {
    try {
      const status =
        await this.paymentService.checkPaymentStatus(transactionId);

      return {
        success: true,
        data: status,
      };
    } catch (error: any) {
      console.error(
        '[PaymentController] Error checking payment status:',
        error,
      );
      return {
        success: false,
        message: error.message || 'Failed to check payment status',
      };
    }
  }

  /**
   * Hủy thanh toán
   */
  @Post(':transactionId/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelPayment(@Param('transactionId') transactionId: string) {
    try {
      // TODO: Implement payment cancellation logic
      return {
        success: true,
        message: 'Payment cancelled',
      };
    } catch (error: any) {
      console.error('[PaymentController] Error cancelling payment:', error);
      return {
        success: false,
        message: error.message || 'Failed to cancel payment',
      };
    }
  }

  /**
   * Helper function
   */
  private extractUserIdFromOrderId(orderId: string): string {
    return orderId.split('-')[0];
  }
}
