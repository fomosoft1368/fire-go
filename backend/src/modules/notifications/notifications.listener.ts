import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import {
  NotificationType,
  NotificationChannel,
} from './schemas/notification.schema';

@Injectable()
export class NotificationsListener {
  constructor(private notificationsService: NotificationsService) {}

  @OnEvent('driver.registered')
  async handleDriverRegistered(payload: any) {
    console.log('📢 Event: driver.registered', payload);

    // Create notification for admin dashboard
    try {
      const notification = await this.notificationsService.create({
        userId: '000000000000000000000000', // Admin broadcast ID - will be visible to all
        type: NotificationType.DRIVER_REGISTERED,
        channels: [NotificationChannel.IN_APP],
        title: 'Tài xế mới đăng ký',
        message: `${payload.firstName} ${payload.lastName} (${payload.phone}) vừa đăng ký tài xế`,
      });
      console.log(
        '✅ Notification created:',
        notification._id,
        'for driver:',
        payload.firstName,
      );
    } catch (error) {
      console.error('❌ Error creating driver notification:', error);
    }
  }

  @OnEvent('customer.registered')
  async handleCustomerRegistered(payload: any) {
    console.log('📢 Event: customer.registered', payload);

    // Create notification for admin dashboard
    try {
      const notification = await this.notificationsService.create({
        userId: '000000000000000000000000', // Admin broadcast ID
        type: NotificationType.CUSTOMER_REGISTERED,
        channels: [NotificationChannel.IN_APP],
        title: 'Khách hàng mới đăng ký',
        message: `${payload.firstName} ${payload.lastName} (${payload.email}) vừa đăng ký tài khoản`,
      });
      console.log(
        '✅ Notification created:',
        notification._id,
        'for customer:',
        payload.firstName,
      );
    } catch (error) {
      console.error('❌ Error creating customer notification:', error);
    }
  }

  @OnEvent('ride.created')
  async handleRideCreated(payload: any) {
    console.log('📢 Event: ride.created', payload);

    // Create notification for driver dashboard
    if (payload.driverId) {
      try {
        await this.notificationsService.create({
          userId: payload.driverId,
          type: NotificationType.RIDE_CREATED,
          channels: [NotificationChannel.IN_APP],
          title: 'Cuốc xe mới',
          message: `Cuốc xe mới từ ${payload.pickupAddress} đến ${payload.dropoffAddress}`,
          rideId: payload.rideId.toString(),
        });
      } catch (error) {
        console.error('Error creating ride notification:', error);
      }
    }
  }

  @OnEvent('ride.accepted')
  async handleRideAccepted(payload: any) {
    console.log('📢 Event: ride.accepted', payload);

    // Create notification for customer
    if (payload.customerId) {
      try {
        await this.notificationsService.create({
          userId: payload.customerId,
          type: NotificationType.RIDE_ACCEPTED,
          channels: [NotificationChannel.IN_APP],
          title: 'Tài xế đã chấp nhận',
          message: `${payload.driverName} đã chấp nhận cuốc xe của bạn`,
          rideId: payload.rideId.toString(),
        });
      } catch (error) {
        console.error('Error creating ride accepted notification:', error);
      }
    }
  }

  @OnEvent('ride.completed')
  async handleRideCompleted(payload: any) {
    console.log('📢 Event: ride.completed', payload);

    // Create notification for customer
    if (payload.customerId) {
      try {
        await this.notificationsService.create({
          userId: payload.customerId,
          type: NotificationType.RIDE_COMPLETED,
          channels: [NotificationChannel.IN_APP],
          title: 'Cuốc xe hoàn thành',
          message: `Cuốc xe của bạn đã hoàn thành. Tổng giá: ${payload.totalFare}`,
          rideId: payload.rideId.toString(),
        });
      } catch (error) {
        console.error('Error creating ride completed notification:', error);
      }
    }
  }

  @OnEvent('assignment.request.created')
  async handleAssignmentRequestCreated(payload: any) {
    console.log('📢 Event: assignment.request.created', {
      requestId: payload.requestId,
      driverId: payload.driverId,
      type: payload.type,
    });

    // Create notification for driver about new assignment request
    if (payload.driverId) {
      try {
        const message =
          payload.type === 'combined_trip'
            ? `Ghép chuyến mới từ ${payload.pickupAddress} đến ${payload.dropoffAddress}`
            : `Cuốc xe mới từ ${payload.pickupAddress} đến ${payload.dropoffAddress}`;

        await this.notificationsService.create({
          userId: payload.driverId,
          type: NotificationType.RIDE_REQUEST,
          channels: [NotificationChannel.IN_APP],
          title:
            payload.type === 'combined_trip'
              ? 'Ghép chuyến mới'
              : 'Cuốc xe mới',
          message,
          rideId: payload.requestId.toString(),
        });
        console.log(
          '✅ Assignment request notification sent to driver:',
          payload.driverId,
        );
      } catch (error) {
        console.error('Error creating assignment request notification:', error);
      }
    }
  }
}
