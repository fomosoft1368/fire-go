import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import {
  NotificationType,
  NotificationChannel,
} from '../notifications/schemas/notification.schema';

/**
 * CallListener – lắng nghe các event từ CallService và tạo in-app notification
 * để mobile app nhận biết trạng thái cuộc gọi qua notification polling.
 */
@Injectable()
export class CallListener {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('call.incoming')
  async handleCallIncoming(payload: {
    callId: string;
    rideId: string;
    channelName: string;
    callerRole: string;
    callerId: string;
    receiverId: string;
    receiverToken: string;
    receiverUid: number;
  }) {
    console.log('📞 [CallListener] call.incoming:', payload.callId);

    try {
      const isCallerDriver = payload.callerRole === 'driver';

      // ✅ FIX: Set the correct recipient field based on who the RECEIVER is.
      // If caller is driver → receiver is customer → set customerId.
      // If caller is customer → receiver is driver → set driverId.
      // Also keep userId for backward compat (findDriverNotifications checks both).
      const recipientFields: Record<string, any> = {
        userId: payload.receiverId,
      };
      if (isCallerDriver) {
        // Receiver is a customer
        recipientFields.customerId = payload.receiverId;
      } else {
        // Receiver is a driver
        recipientFields.driverId = payload.receiverId;
      }

      await this.notificationsService.createRaw({
        ...recipientFields,
        type: NotificationType.CALL_INCOMING,
        channels: [NotificationChannel.IN_APP],
        title: isCallerDriver
          ? 'Tài xế đang gọi cho bạn'
          : 'Khách hàng đang gọi cho bạn',
        message: 'Nhấn để nghe máy',
        data: {
          type: 'CALL_INCOMING',
          callId: payload.callId,
          rideId: payload.rideId,
          channelName: payload.channelName,
          callerRole: payload.callerRole,
          callerId: payload.callerId,
          receiverToken: payload.receiverToken,
          receiverUid: payload.receiverUid,
        },
      });
    } catch (err) {
      console.error(
        '[CallListener] ❌ Error creating CALL_INCOMING notification:',
        err,
      );
    }
  }

  @OnEvent('call.accepted')
  async handleCallAccepted(payload: {
    callId: string;
    rideId: string;
    channelName: string;
    callerId: string;
    receiverId: string;
    callerToken: string;
    callerUid: number;
  }) {
    console.log('✅ [CallListener] call.accepted:', payload.callId);

    try {
      // ✅ Notify the CALLER with callerToken so they can join Agora channel immediately
      await this.notificationsService.createRaw({
        userId: payload.callerId,
        type: NotificationType.CALL_ACCEPTED,
        channels: [NotificationChannel.IN_APP],
        title: 'Cuộc gọi được chấp nhận',
        message: 'Đang kết nối cuộc gọi...',
        data: {
          type: 'CALL_ACCEPTED',
          callId: payload.callId,
          rideId: payload.rideId,
          channelName: payload.channelName,
          callerToken: payload.callerToken,
          callerUid: payload.callerUid,
        },
      });
    } catch (err) {
      console.error(
        '[CallListener] ❌ Error creating CALL_ACCEPTED notification:',
        err,
      );
    }
  }

  @OnEvent('call.rejected')
  async handleCallRejected(payload: {
    callId: string;
    rideId: string;
    callerId: string;
    receiverId: string;
  }) {
    console.log('❌ [CallListener] call.rejected:', payload.callId);

    try {
      await this.notificationsService.create({
        userId: payload.callerId,
        type: NotificationType.CALL_REJECTED,
        channels: [NotificationChannel.IN_APP],
        title: 'Cuộc gọi bị từ chối',
        message: 'Người nhận đã từ chối cuộc gọi',
        data: {
          type: 'CALL_REJECTED',
          callId: payload.callId,
          rideId: payload.rideId,
        },
      });
    } catch (err) {
      console.error(
        '[CallListener] ❌ Error creating CALL_REJECTED notification:',
        err,
      );
    }
  }

  @OnEvent('call.ended')
  async handleCallEnded(payload: {
    callId: string;
    rideId: string;
    callerId: string;
    receiverId: string;
    durationSeconds: number;
  }) {
    console.log(
      '🔚 [CallListener] call.ended:',
      payload.callId,
      `(${payload.durationSeconds}s)`,
    );

    // Notify both parties
    const notifyUsers = [payload.callerId, payload.receiverId];

    for (const userId of notifyUsers) {
      try {
        await this.notificationsService.create({
          userId,
          type: NotificationType.CALL_ENDED,
          channels: [NotificationChannel.IN_APP],
          title: 'Cuộc gọi đã kết thúc',
          message: `Thời gian: ${payload.durationSeconds}s`,
          data: {
            type: 'CALL_ENDED',
            callId: payload.callId,
            rideId: payload.rideId,
            durationSeconds: payload.durationSeconds,
          },
        });
      } catch (err) {
        console.error(
          '[CallListener] ❌ Error creating CALL_ENDED notification:',
          err,
        );
      }
    }
  }

  @OnEvent('call.missed')
  async handleCallMissed(payload: {
    callId: string;
    rideId: string;
    callerId: string;
    receiverId: string;
  }) {
    console.log('📵 [CallListener] call.missed:', payload.callId);

    try {
      // Notify caller that call was missed
      await this.notificationsService.create({
        userId: payload.callerId,
        type: NotificationType.CALL_MISSED,
        channels: [NotificationChannel.IN_APP],
        title: 'Cuộc gọi nhỡ',
        message: 'Người nhận không phản hồi',
        data: {
          type: 'CALL_MISSED',
          callId: payload.callId,
          rideId: payload.rideId,
        },
      });

      // Notify receiver about missed call
      await this.notificationsService.create({
        userId: payload.receiverId,
        type: NotificationType.CALL_MISSED,
        channels: [NotificationChannel.IN_APP],
        title: 'Cuộc gọi nhỡ',
        message: 'Bạn có một cuộc gọi nhỡ',
        data: {
          type: 'CALL_MISSED',
          callId: payload.callId,
          rideId: payload.rideId,
        },
      });
    } catch (err) {
      console.error(
        '[CallListener] ❌ Error creating CALL_MISSED notification:',
        err,
      );
    }
  }
}
