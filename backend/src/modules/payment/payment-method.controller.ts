import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentMethodService } from './payment-method.service';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
  PaymentMethodResponseDto,
} from './dto/payment-method.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payment-methods')
export class PaymentMethodController {
  constructor(private readonly paymentMethodService: PaymentMethodService) {
    console.log('[PaymentMethodController] Initialized');
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createPaymentMethod(
    @Request() req: any,
    @Body() dto: CreatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    console.log('[PaymentMethod] Create - User:', req.user?.sub);
    return this.paymentMethodService.createPaymentMethod(req.user?.sub, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getPaymentMethods(
    @Request() req: any,
  ): Promise<PaymentMethodResponseDto[]> {
    console.log('[PaymentMethod] Get All - User:', req.user?.sub);
    return this.paymentMethodService.getPaymentMethods(req.user?.sub);
  }

  @Get('default')
  @UseGuards(JwtAuthGuard)
  async getDefaultPaymentMethod(
    @Request() req: any,
  ): Promise<PaymentMethodResponseDto | null> {
    console.log('[PaymentMethod] Get Default - User:', req.user?.sub);
    return this.paymentMethodService.getDefaultPaymentMethod(req.user?.sub);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async updatePaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodResponseDto> {
    console.log('[PaymentMethod] Update - User:', req.user?.sub, 'Method:', id);
    return this.paymentMethodService.updatePaymentMethod(
      id,
      req.user?.sub,
      dto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<void> {
    console.log('[PaymentMethod] Delete - User:', req.user?.sub, 'Method:', id);
    return this.paymentMethodService.deletePaymentMethod(id, req.user?.sub);
  }

  @Patch(':id/set-default')
  @UseGuards(JwtAuthGuard)
  async setDefaultPaymentMethod(
    @Request() req: any,
    @Param('id') id: string,
  ): Promise<PaymentMethodResponseDto> {
    console.log(
      '[PaymentMethod] Set Default - User:',
      req.user?.sub,
      'Method:',
      id,
    );
    return this.paymentMethodService.setDefaultPaymentMethod(id, req.user?.sub);
  }
}
