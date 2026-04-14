import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  UseGuards,
} from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Admin guard or JWT

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  /**
   * POST /api/logs/frontend-error
   * Public endpoint cho Mobile App tự gửi lỗi lên
   */
  @Post('frontend-error')
  @HttpCode(201)
  async reportFrontendError(
    @Body()
    body: {
      appName: string;
      functionName: string;
      errorMessage: string;
      errorStack?: string;
      extraData?: any;
    },
  ) {
    // Không bọc guard ở đây vì user có thể chưa đăng nhập mà vẫn dính lỗi UI
    return this.logsService.createLog(body);
  }

  /**
   * GET /api/logs
   * Admin endpoint lấy danh sách log
   * (Nên bọc JwtAuthGuard nhưng để đơn giản test, có thể thay đổi sau)
   */
  @Get()
  //@UseGuards(JwtAuthGuard) // Comment out for now if Admin uses bypass
  async getLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ) {
    return this.logsService.getLogs(parseInt(page), parseInt(limit));
  }

  /**
   * GET /api/logs/:id
   */
  @Get(':id')
  //@UseGuards(JwtAuthGuard)
  async getLogById(@Param('id') id: string) {
    return this.logsService.getLogById(id);
  }
}
