import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CallService } from './call.service';
import { CreateCallDto, ActionCallDto } from './dto/call.dto';

/**
 * Public controller: không cần JWT (WebView load trang này trực tiếp)
 */
@Controller('call')
export class CallRoomController {
  /**
   * GET /api/call/room?appId=...&channel=...&token=...&uid=...&callId=...&authToken=...&apiBase=...&otherName=...
   * Trả về HTML page với Agora Web SDK để WebView load
   */
  @Get('room')
  serveRoom(@Res() res: Response) {
    const htmlPath = path.join(__dirname, 'call-room.html');
    if (!fs.existsSync(htmlPath)) {
      return res.status(404).send('Call room not found');
    }
    const html = fs.readFileSync(htmlPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(html);
  }
}

@Controller('call')
@UseGuards(JwtAuthGuard)
export class CallController {
  constructor(private readonly callService: CallService) {}

  /**
   * POST /api/call/create
   * Tạo cuộc gọi mới – chỉ khi ride active
   */
  @Post('create')
  @HttpCode(HttpStatus.CREATED)
  async createCall(@Request() req: any, @Body() dto: CreateCallDto) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.callService.createCall(userId, dto);
    return {
      success: true,
      message: 'Đang gọi...',
      data,
    };
  }

  /**
   * POST /api/call/accept
   * Chấp nhận cuộc gọi (receiver)
   */
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptCall(@Request() req: any, @Body() dto: ActionCallDto) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.callService.acceptCall(userId, dto);
    return {
      success: true,
      message: 'Đã chấp nhận cuộc gọi',
      data,
    };
  }

  /**
   * POST /api/call/reject
   * Từ chối cuộc gọi (receiver)
   */
  @Post('reject')
  @HttpCode(HttpStatus.OK)
  async rejectCall(@Request() req: any, @Body() dto: ActionCallDto) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.callService.rejectCall(userId, dto);
    return {
      success: true,
      message: 'Đã từ chối cuộc gọi',
      data,
    };
  }

  /**
   * POST /api/call/end
   * Kết thúc cuộc gọi (bất kỳ bên nào)
   */
  @Post('end')
  @HttpCode(HttpStatus.OK)
  async endCall(@Request() req: any, @Body() dto: ActionCallDto) {
    const userId = req.user?.id || req.user?.sub;
    const data = await this.callService.endCall(userId, dto);
    return {
      success: true,
      message: 'Cuộc gọi đã kết thúc',
      data,
    };
  }

  /**
   * GET /api/call/active/:rideId
   * Kiểm tra có cuộc gọi đang active không
   */
  @Get('active/:rideId')
  async getActiveCall(@Param('rideId') rideId: string) {
    const data = await this.callService.getActiveCall(rideId);
    return {
      success: true,
      data,
      hasActiveCall: !!data,
    };
  }

  /**
   * GET /api/call/history/:rideId
   * Lịch sử cuộc gọi của chuyến đi
   */
  @Get('history/:rideId')
  async getCallHistory(@Param('rideId') rideId: string) {
    const data = await this.callService.getCallHistory(rideId);
    return {
      success: true,
      data,
    };
  }
}
