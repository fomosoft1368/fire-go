import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { RidesService } from '../rides/services/rides.service';
import {
  CallSession,
  CallSessionDocument,
  CallStatus,
  CallerRole,
} from './schemas/call.schema';
import { CreateCallDto, ActionCallDto } from './dto/call.dto';
import {
  CombinedTrip,
  CombinedTripDocument,
  CombinedTripStatus,
} from '../combined-trips/schemas/combined-trip.schema';

// Agora token builder
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

@Injectable()
export class CallService {
  private readonly timeouts = new Map<string, NodeJS.Timeout>();

  constructor(
    @InjectModel(CallSession.name)
    private callModel: Model<CallSessionDocument>,
    @InjectModel(CombinedTrip.name)
    private combinedTripModel: Model<CombinedTripDocument>,
    private readonly ridesService: RidesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  // ─── Token generation ────────────────────────────────────────────────────────

  private generateAgoraToken(channelName: string, uid: number): string {
    const appId = this.configService.get<string>('AGORA_APP_ID');
    const appCertificate = this.configService.get<string>(
      'AGORA_APP_CERTIFICATE',
    );

    if (!appId) {
      console.warn('[CallService] AGORA_APP_ID missing – set it in .env');
      // Return empty string so mobile can still attempt to join (will fail but won't crash)
      return '';
    }

    // ✅ APP ID only mode (no certificate): return empty token string
    // Mobile calls joinChannel(token='', channelName, uid, {})
    if (!appCertificate) {
      console.log(
        '[CallService] No AGORA_APP_CERTIFICATE – using APP ID only mode (token="")',
      );
      return '';
    }

    // ✅ Token auth mode: generate a proper Agora RTC token
    const expireTs = Math.floor(Date.now() / 1000) + 3600; // 1 hour
    return RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      RtcRole.PUBLISHER,
      expireTs,
    );
  }

  // ─── Create call ────────────────────────────────────────────────────────────

  async createCall(userId: string, dto: CreateCallDto): Promise<any> {
    const { rideId, callerRole } = dto;

    // 1. Try to find ride in both collections
    let ride: any = null;
    let isCombinedTrip = false;

    // Try combined_trips first (most common in this app)
    if (Types.ObjectId.isValid(rideId)) {
      const combinedTrip = await this.combinedTripModel
        .findById(rideId)
        .lean()
        .exec();

      if (combinedTrip) {
        ride = combinedTrip;
        isCombinedTrip = true;
      }
    }

    // Fallback: try rides collection
    if (!ride) {
      try {
        ride = await this.ridesService.findById(rideId);
      } catch {
        // not found in rides either
      }
    }

    if (!ride) {
      throw new NotFoundException(`Chuyến đi ${rideId} không tồn tại`);
    }

    // 2. Validate status
    const activeStatuses = ['accepted', 'in_progress'];
    if (!activeStatuses.includes(ride.status)) {
      throw new BadRequestException(
        `Chỉ có thể gọi khi chuyến đi đang active (accepted hoặc in_progress). Trạng thái hiện tại: ${ride.status}`,
      );
    }

    // 3. Resolve caller & receiver
    const callerObjectId = new Types.ObjectId(userId);
    let receiverObjectId: Types.ObjectId;

    if (callerRole === CallerRole.CUSTOMER) {
      if (!ride.driverId) {
        throw new BadRequestException('Chuyến đi chưa có tài xế');
      }

      // For CombinedTrip: customerId is an array
      if (isCombinedTrip) {
        const customerIds: string[] = (ride.customerId as any[]).map(
          (id: any) => id.toString(),
        );
        if (!customerIds.includes(userId)) {
          throw new ForbiddenException(
            'Bạn không phải là khách hàng của chuyến đi này',
          );
        }
      } else {
        if (String(ride.customerId) !== userId) {
          throw new ForbiddenException(
            'Bạn không phải là khách hàng của chuyến đi này',
          );
        }
      }

      receiverObjectId = new Types.ObjectId(String(ride.driverId));
    } else {
      // Driver calling customer
      if (String(ride.driverId) !== userId) {
        throw new ForbiddenException(
          'Bạn không phải là tài xế của chuyến đi này',
        );
      }

      // For CombinedTrip: pick first customer in the array
      const customerId = isCombinedTrip
        ? (ride.customerId as any[])[0]
        : ride.customerId;

      if (!customerId) {
        throw new BadRequestException('Không tìm thấy thông tin khách hàng');
      }
      receiverObjectId = new Types.ObjectId(String(customerId));
    }

    // 3. Check no active call for this ride
    const existingCall = await this.callModel.findOne({
      rideId: new Types.ObjectId(rideId),
      status: { $in: [CallStatus.CALLING, CallStatus.ACCEPTED] },
    });

    if (existingCall) {
      throw new BadRequestException(
        'Chuyến đi này đang có cuộc gọi khác đang diễn ra',
      );
    }

    // 4. Generate channel name & Agora UIDs
    const channelName = `ride_${rideId}_call`;
    const callerUid = Math.floor(Math.random() * 100000) + 1;
    const receiverUid = Math.floor(Math.random() * 100000) + 100001;
    const callerToken = this.generateAgoraToken(channelName, callerUid);
    const receiverToken = this.generateAgoraToken(channelName, receiverUid);

    // 5. Save to DB
    const callSession = await this.callModel.create({
      rideId: new Types.ObjectId(rideId),
      channelName,
      callerId: callerObjectId,
      callerRole,
      receiverId: receiverObjectId,
      status: CallStatus.CALLING,
      callerUid,
      receiverUid,
    });

    // 6. Emit event → listener will forward as in-app notification
    this.eventEmitter.emit('call.incoming', {
      callId: (callSession._id as Types.ObjectId).toString(),
      rideId,
      channelName,
      callerRole,
      callerId: userId,
      receiverId: receiverObjectId.toString(),
      receiverToken,
      receiverUid,
    });

    // 7. Schedule 30-second auto-miss timeout
    this.scheduleTimeout((callSession._id as Types.ObjectId).toString());

    return {
      callId: (callSession._id as Types.ObjectId).toString(),
      channelName,
      callerToken,
      callerUid,
      receiverUid,
    };
  }

  // ─── Accept call ────────────────────────────────────────────────────────────

  async acceptCall(userId: string, dto: ActionCallDto): Promise<any> {
    const call = await this.findActiveOrThrow(dto.callId);

    if (String(call.receiverId) !== userId) {
      throw new ForbiddenException(
        'Chỉ người nhận mới có thể chấp nhận cuộc gọi',
      );
    }

    if (call.status !== CallStatus.CALLING) {
      throw new BadRequestException(
        `Cuộc gọi có trạng thái ${call.status}, không thể chấp nhận`,
      );
    }

    // Cancel timeout
    this.clearTimeout(dto.callId);

    call.status = CallStatus.ACCEPTED;
    call.startedAt = new Date();
    await call.save();

    // Generate tokens for both parties
    const receiverToken = this.generateAgoraToken(
      call.channelName,
      call.receiverUid,
    );
    const callerToken = this.generateAgoraToken(
      call.channelName,
      call.callerUid,
    );

    this.eventEmitter.emit('call.accepted', {
      callId: dto.callId,
      rideId: call.rideId.toString(),
      channelName: call.channelName,
      callerId: call.callerId.toString(),
      receiverId: call.receiverId.toString(),
      callerToken,
      callerUid: call.callerUid,
    });

    return {
      callId: dto.callId,
      channelName: call.channelName,
      receiverToken,
      receiverUid: call.receiverUid,
    };
  }

  // ─── Reject call ────────────────────────────────────────────────────────────

  async rejectCall(userId: string, dto: ActionCallDto): Promise<any> {
    const call = await this.findActiveOrThrow(dto.callId);

    if (String(call.receiverId) !== userId) {
      throw new ForbiddenException(
        'Chỉ người nhận mới có thể từ chối cuộc gọi',
      );
    }

    if (call.status !== CallStatus.CALLING) {
      throw new BadRequestException(
        `Cuộc gọi có trạng thái ${call.status}, không thể từ chối`,
      );
    }

    this.clearTimeout(dto.callId);

    call.status = CallStatus.REJECTED;
    call.endedAt = new Date();
    await call.save();

    this.eventEmitter.emit('call.rejected', {
      callId: dto.callId,
      rideId: call.rideId.toString(),
      callerId: call.callerId.toString(),
      receiverId: call.receiverId.toString(),
    });

    return { callId: dto.callId, status: CallStatus.REJECTED };
  }

  // ─── End call ───────────────────────────────────────────────────────────────

  async endCall(userId: string, dto: ActionCallDto): Promise<any> {
    const call = await this.findActiveOrThrow(dto.callId);

    const isCaller = String(call.callerId) === userId;
    const isReceiver = String(call.receiverId) === userId;

    if (!isCaller && !isReceiver) {
      throw new ForbiddenException(
        'Bạn không phải là người tham gia cuộc gọi này',
      );
    }

    if (![CallStatus.CALLING, CallStatus.ACCEPTED].includes(call.status)) {
      throw new BadRequestException(`Cuộc gọi đã kết thúc (${call.status})`);
    }

    this.clearTimeout(dto.callId);

    const endedAt = new Date();
    const durationSeconds = call.startedAt
      ? Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000)
      : 0;

    call.status = CallStatus.ENDED;
    call.endedAt = endedAt;
    call.durationSeconds = durationSeconds;
    await call.save();

    this.eventEmitter.emit('call.ended', {
      callId: dto.callId,
      rideId: call.rideId.toString(),
      callerId: call.callerId.toString(),
      receiverId: call.receiverId.toString(),
      durationSeconds,
    });

    return { callId: dto.callId, status: CallStatus.ENDED, durationSeconds };
  }

  // ─── Get active call for a ride ─────────────────────────────────────────────

  async getActiveCall(rideId: string): Promise<CallSessionDocument | null> {
    return this.callModel.findOne({
      rideId: new Types.ObjectId(rideId),
      status: { $in: [CallStatus.CALLING, CallStatus.ACCEPTED] },
    });
  }

  // ─── Get call history for a ride ────────────────────────────────────────────

  async getCallHistory(rideId: string): Promise<CallSessionDocument[]> {
    return this.callModel
      .find({ rideId: new Types.ObjectId(rideId) })
      .sort({ createdAt: -1 });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private async findActiveOrThrow(
    callId: string,
  ): Promise<CallSessionDocument> {
    if (!Types.ObjectId.isValid(callId)) {
      throw new BadRequestException('callId không hợp lệ');
    }

    const call = await this.callModel.findById(callId);
    if (!call) {
      throw new NotFoundException(`Cuộc gọi ${callId} không tồn tại`);
    }

    return call;
  }

  private scheduleTimeout(callId: string): void {
    const timer = setTimeout(async () => {
      try {
        const call = await this.callModel.findById(callId);
        if (call && call.status === CallStatus.CALLING) {
          call.status = CallStatus.MISSED;
          call.endedAt = new Date();
          await call.save();

          this.eventEmitter.emit('call.missed', {
            callId,
            rideId: call.rideId.toString(),
            callerId: call.callerId.toString(),
            receiverId: call.receiverId.toString(),
          });

          console.log(
            `[CallService] ⏱ Call ${callId} auto-missed after 30s timeout`,
          );
        }
      } catch (err) {
        console.error(
          `[CallService] ❌ Timeout handler error for call ${callId}:`,
          err,
        );
      } finally {
        this.timeouts.delete(callId);
      }
    }, 30_000);

    this.timeouts.set(callId, timer);
  }

  private clearTimeout(callId: string): void {
    const timer = this.timeouts.get(callId);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(callId);
    }
  }
}
