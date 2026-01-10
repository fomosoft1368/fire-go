import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto, SendNotificationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('send')
  async send(@Body() sendNotificationDto: SendNotificationDto) {
    return this.notificationsService.send(sendNotificationDto);
  }

  @Get('admin/all')
  async findAll(
    @Query('type') type?: string,
    @Query('driverId') driverId?: string,
    @Query('customerId') customerId?: string,
    @Query('limit') limit: number = 50,
    @Query('skip') skip: number = 0,
  ) {
    return this.notificationsService.getAllNotifications({
      type,
      driverId,
      customerId,
      limit,
      skip,
    });
  }

  @Get('unread')
  @UseGuards(JwtAuthGuard)
  async findUnread(@Request() req: any) {
    return this.notificationsService.findUnread(req.user.id);
  }

  @Get('unread/count')
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(@Request() req: any) {
    const count = await this.notificationsService.getUnreadCount(req.user.id);
    return { unreadCount: count };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Request() req: any) {
    return this.notificationsService.getNotificationStats(req.user.id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(
    @Request() req: any,
    @Query('limit') limit: number = 20,
    @Query('skip') skip: number = 0,
  ) {
    return this.notificationsService.findByUserId(req.user.id, limit, skip);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string) {
    return this.notificationsService.findById(id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard)
  async markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  @UseGuards(JwtAuthGuard)
  async markAllAsRead(@Request() req: any) {
    return this.notificationsService.markAllAsRead(req.user.id);
  }

  @Patch('read-multiple')
  @UseGuards(JwtAuthGuard)
  async markMultipleAsRead(@Body('notificationIds') notificationIds: string[]) {
    return this.notificationsService.markMultipleAsRead(notificationIds);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteNotification(@Param('id') id: string) {
    await this.notificationsService.deleteNotification(id);
    return { message: 'Notification deleted successfully' };
  }

  @Patch(':id/disable')
  @UseGuards(JwtAuthGuard)
  async disableNotification(@Param('id') id: string) {
    return this.notificationsService.disableNotification(id);
  }
}
