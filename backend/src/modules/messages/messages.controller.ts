import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * POST /api/messages
   * Gửi tin nhắn
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(201)
  async sendMessage(
    @Request() req: any,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found');
    }

    const message = await this.messagesService.sendMessage(
      createMessageDto,
      req.user.id,
    );

    return {
      success: true,
      data: message,
    };
  }

  /**
   * GET /api/messages/ride/:rideId
   * Lấy danh sách tin nhắn của cuốc xe
   */
  @Get('ride/:rideId')
  @UseGuards(JwtAuthGuard)
  async getMessagesByRide(
    @Param('rideId') rideId: string,
    @Query('limit') limit: number = 50,
    @Query('skip') skip: number = 0,
  ) {
    const { messages, total } = await this.messagesService.getMessagesByRide(
      rideId,
      Math.min(limit, 100), // Max 100 messages per request
      skip,
    );

    return {
      success: true,
      data: {
        messages,
        total,
        limit,
        skip,
      },
    };
  }

  /**
   * GET /api/messages/ride/:rideId/new
   * Lấy tin nhắn mới từ một thời điểm
   */
  @Get('ride/:rideId/new')
  @UseGuards(JwtAuthGuard)
  async getNewMessages(
    @Param('rideId') rideId: string,
    @Query('since') since?: string,
  ) {
    const sinceTimestamp = since ? parseInt(since) : Date.now() - 60000; // 1 phút trước

    const messages = await this.messagesService.getNewMessages(
      rideId,
      sinceTimestamp,
    );

    return {
      success: true,
      data: {
        messages,
        count: messages.length,
      },
    };
  }

  /**
   * PATCH /api/messages/ride/:rideId/mark-as-read
   * Đánh dấu tất cả tin nhắn của cuốc xe là đã đọc
   */
  @Post('ride/:rideId/mark-as-read')
  @UseGuards(JwtAuthGuard)
  async markRideMessagesAsRead(
    @Param('rideId') rideId: string,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found');
    }

    await this.messagesService.markRideMessagesAsRead(rideId, req.user.id);

    return {
      success: true,
      message: 'Messages marked as read',
    };
  }

  /**
   * GET /api/messages/ride/:rideId/unread-count
   * Lấy số lượng tin nhắn chưa đọc
   */
  @Get('ride/:rideId/unread-count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(
    @Param('rideId') rideId: string,
    @Request() req: any,
  ) {
    if (!req.user?.id) {
      throw new BadRequestException('User ID not found');
    }

    const count = await this.messagesService.getUnreadCount(
      rideId,
      req.user.id,
    );

    return {
      success: true,
      data: {
        rideId,
        unreadCount: count,
      },
    };
  }

  /**
   * DELETE /api/messages/:messageId
   * Xóa tin nhắn
   */
  @Delete(':messageId')
  @UseGuards(JwtAuthGuard)
  async deleteMessage(@Param('messageId') messageId: string) {
    const message = await this.messagesService.deleteMessage(messageId);

    return {
      success: true,
      message: 'Message deleted',
      data: message,
    };
  }
}
