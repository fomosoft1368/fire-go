import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument, NotificationType } from './schemas/notification.schema';
import { CreateNotificationDto } from './dto';

@Injectable()
export class NotificationsService {
  constructor(@InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>) {}

  async create(createNotificationDto: CreateNotificationDto): Promise<NotificationDocument> {
    const notification = await this.notificationModel.create({
      ...createNotificationDto,
      userId: new Types.ObjectId(createNotificationDto.userId),
      rideId: createNotificationDto.rideId ? new Types.ObjectId(createNotificationDto.rideId) : null,
    });

    return notification;
  }

  async findById(id: string): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findById(id);

    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }

    return notification;
  }

  async findByUserId(userId: string, limit: number = 20, skip: number = 0): Promise<NotificationDocument[]> {
    const userObjectId = new Types.ObjectId(userId);
    const broadcastId = new Types.ObjectId('000000000000000000000000');
    
    return this.notificationModel
      .find({
        $or: [
          { userId: userObjectId },
          { userId: broadcastId }, // Broadcast to all admins
        ],
        isActive: true,
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  async findUnread(userId: string): Promise<NotificationDocument[]> {
    // Admins see both personal notifications AND broadcast notifications (000000000000000000000000)
    const userObjectId = new Types.ObjectId(userId);
    const broadcastId = new Types.ObjectId('000000000000000000000000');
    
    return this.notificationModel.find({
      $or: [
        { userId: userObjectId },
        { userId: broadcastId }, // Broadcast to all admins
      ],
      isRead: false,
      isActive: true,
    }).sort({ createdAt: -1 });
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userObjectId = new Types.ObjectId(userId);
    const broadcastId = new Types.ObjectId('000000000000000000000000');
    
    return this.notificationModel.countDocuments({
      $or: [
        { userId: userObjectId },
        { userId: broadcastId }, // Broadcast to all admins
      ],
      isRead: false,
      isActive: true,
    });
  }

  async markAsRead(notificationId: string): Promise<NotificationDocument> {
    return this.notificationModel.findByIdAndUpdate(
      notificationId,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true },
    );
  }

  async markMultipleAsRead(notificationIds: string[]): Promise<any> {
    return this.notificationModel.updateMany(
      { _id: { $in: notificationIds.map((id) => new Types.ObjectId(id)) } },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
  }

  async markAllAsRead(userId: string): Promise<any> {
    return this.notificationModel.updateMany(
      { userId: new Types.ObjectId(userId), isRead: false },
      {
        isRead: true,
        readAt: new Date(),
      },
    );
  }

  async deleteNotification(notificationId: string): Promise<void> {
    const result = await this.notificationModel.findByIdAndDelete(notificationId);

    if (!result) {
      throw new NotFoundException(`Notification with ID ${notificationId} not found`);
    }
  }

  async deleteByUserId(userId: string): Promise<any> {
    return this.notificationModel.deleteMany({
      userId: new Types.ObjectId(userId),
    });
  }

  async disableNotification(notificationId: string): Promise<NotificationDocument> {
    return this.notificationModel.findByIdAndUpdate(
      notificationId,
      {
        isActive: false,
      },
      { new: true },
    );
  }

  async getNotificationStats(userId: string): Promise<any> {
    const [total, unread, byType] = await Promise.all([
      this.notificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isActive: true,
      }),
      this.notificationModel.countDocuments({
        userId: new Types.ObjectId(userId),
        isRead: false,
        isActive: true,
      }),
      this.notificationModel.aggregate([
        {
          $match: {
            userId: new Types.ObjectId(userId),
            isActive: true,
          },
        },
        {
          $group: {
            _id: '$type',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    return {
      total,
      unread,
      byType,
    };
  }

  async cleanupExpiredNotifications(): Promise<any> {
    return this.notificationModel.updateMany(
      {
        expiresAt: { $lt: new Date() },
        isExpired: false,
      },
      {
        isExpired: true,
      },
    );
  }

  async sendBulkNotifications(userIds: string[], createNotificationDto: Omit<CreateNotificationDto, 'userId'>): Promise<NotificationDocument[]> {
    const notifications = userIds.map((userId) => ({
      ...createNotificationDto,
      userId: new Types.ObjectId(userId),
      rideId: createNotificationDto.rideId ? new Types.ObjectId(createNotificationDto.rideId) : undefined,
    }));

    return this.notificationModel.insertMany(notifications) as any;
  }

  /**
   * Send notification to driver or customer from admin
   */
  async send(data: {
    title: string;
    message: string;
    type: string;
    driverId?: string;
    customerId?: string;
    broadcastTo?: string;
    channels?: string[];
    description?: string;
    actionUrl?: string;
    imageUrl?: string;
  }): Promise<any> {
    const { driverId, customerId, broadcastTo, channels = ['in_app'], ...notificationData } = data;

    // Validate: either specific recipient OR broadcast
    if (!broadcastTo && !driverId && !customerId) {
      throw new Error('Either broadcastTo, driverId or customerId must be provided');
    }

    // For broadcast notifications, create multiple notifications
    if (broadcastTo === 'drivers' || broadcastTo === 'customers') {
      const Driver = this.notificationModel.collection.conn.model('Driver');
      const Customer = this.notificationModel.collection.conn.model('Customer');

      const model = broadcastTo === 'drivers' ? Driver : Customer;
      const recipients = await model.find({}).select('_id').limit(10000).exec();

      const notifications = await Promise.all(
        recipients.map((recipient: any) =>
          this.notificationModel.create({
            ...notificationData,
            driverId: broadcastTo === 'drivers' ? recipient._id : undefined,
            customerId: broadcastTo === 'customers' ? recipient._id : undefined,
            channels,
            sentAt: new Date(),
          })
        )
      );

      return {
        success: true,
        message: `Đã gửi thông báo cho ${recipients.length} ${broadcastTo === 'drivers' ? 'tài xế' : 'khách hàng'}`,
        totalSent: recipients.length,
      };
    }

    // For specific recipient
    const notification = await this.notificationModel.create({
      ...notificationData,
      driverId: driverId ? new Types.ObjectId(driverId) : undefined,
      customerId: customerId ? new Types.ObjectId(customerId) : undefined,
      channels,
      sentAt: new Date(),
    });

    return notification.populate(['driverId', 'customerId']);
  }

  /**
   * Get all notifications (admin view)
   */
  async getAllNotifications(filters?: {
    type?: string;
    driverId?: string;
    customerId?: string;
    limit?: number;
    skip?: number;
  }): Promise<{ data: NotificationDocument[]; total: number }> {
    const query: any = {};

    if (filters?.type) query.type = filters.type;
    if (filters?.driverId) query.driverId = new Types.ObjectId(filters.driverId);
    if (filters?.customerId) query.customerId = new Types.ObjectId(filters.customerId);

    const limit = filters?.limit || 50;
    const skip = filters?.skip || 0;

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .populate(['driverId', 'customerId'])
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip),
      this.notificationModel.countDocuments(query),
    ]);

    return { data, total };
  }

  /**
   * Get notifications for a specific customer
   */
  async findCustomerNotifications(
    customerId: string,
    filters?: {
      type?: string;
      limit?: number;
      skip?: number;
    }
  ): Promise<{ data: NotificationDocument[]; total: number }> {
    const query: any = {
      customerId: new Types.ObjectId(customerId),
    };

    if (filters?.type) query.type = filters.type;

    const limit = filters?.limit || 20;
    const skip = filters?.skip || 0;

    const [data, total] = await Promise.all([
      this.notificationModel
        .find(query)
        .populate(['customerId', 'driverId'])
        .sort({ sentAt: -1 })
        .limit(limit)
        .skip(skip),
      this.notificationModel.countDocuments(query),
    ]);

    return { data, total };
  }
}

