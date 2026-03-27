import { Controller, Get, Post, Delete, Patch, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { CreateNotificationDto, SendNotificationDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notificationsService: NotificationsService,
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  /**
   * Register Expo push token for the authenticated user (driver or customer)
   * Called by mobile apps after login
   */
  @Post('push-token')
  @UseGuards(JwtAuthGuard)
  async registerPushToken(
    @Request() req: any,
    @Body('token') token: string,
  ): Promise<{ success: boolean }> {
    const { id, role, email } = req.user;
    console.log(`\n🔔 ===== PUSH TOKEN REGISTRATION =====`);
    console.log(`👤 User: ${email} (${role}) | ID: ${id}`);
    console.log(`🔑 Token: ${token ? token.substring(0, 40) + '...' : '(empty)'}`);

    if (!token) {
      console.log('❌ Token is empty, skipping.');
      return { success: false };
    }

    if (role === 'driver') {
      await this.pushNotificationService.saveDriverPushToken(id, token);
      console.log(`✅ Driver token saved successfully.`);
    } else {
      await this.pushNotificationService.saveCustomerPushToken(id, token);
      console.log(`✅ Customer token saved successfully.`);
    }
    console.log(`=====================================\n`);
    return { success: true };
  }

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

  @Get('customer')
  @UseGuards(JwtAuthGuard)
  async findCustomerNotifications(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('limit') limit: number = 20,
    @Query('skip') skip: number = 0,
  ) {
    return this.notificationsService.findCustomerNotifications(req.user.id, {
      type,
      limit,
      skip,
    });
  }

  @Get('driver')
  @UseGuards(JwtAuthGuard)
  async findDriverNotifications(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('limit') limit: number = 50,
    @Query('skip') skip: number = 0,
  ) {
    // ✅ Filter STRICTLY by driverId only (not userId/customerId)
    return this.notificationsService.findDriverNotifications(req.user.id, {
      type,
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
    const notifications = await this.notificationsService.findByUserId(req.user.id, limit, skip);
    const total = await this.notificationsService.getUnreadCount(req.user.id);
    return {
      data: notifications,
      total: notifications.length,
      unreadCount: total,
    };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findById(@Param('id') id: string) {
    // Guard against route conflicts (e.g., 'driver', 'customer' being treated as :id)
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error(`Invalid notification ID: ${id}`);
    }
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
