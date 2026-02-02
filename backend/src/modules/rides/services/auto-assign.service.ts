import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Driver, DriverDocument } from '../../drivers/schemas/driver.schema';
import { Ride, RideDocument } from '../schemas/ride.schema';
import { AssignmentRequest, AssignmentRequestDocument } from '../schemas/assignment-request.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';

interface DriverScore {
  driver: DriverDocument;
  score: number;
  breakdown: {
    distance: number; // 0-40
    rating: number; // 0-30
    completion: number; // 0-20
    onlineTime: number; // 0-10
  };
}

@Injectable()
export class AutoAssignService {
  private readonly logger = new Logger(AutoAssignService.name);
  private readonly REQUEST_TIMEOUT_SECONDS = 15; // Timeout 15 giây
  private timeoutHandlers = new Map<string, NodeJS.Timeout>(); // Track timeout handlers

  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
    @InjectModel(AssignmentRequest.name) private assignmentRequestModel: Model<AssignmentRequestDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Tự động chỉ định tài xế cho chuyến đi
   * FLOW MỚI: Gửi request tới tài xế phù hợp nhất, đợi accept/reject
   */
  async autoAssignDriver(rideId: string): Promise<{ success: boolean; message: string; requestId?: string }> {
    const ride = await this.rideModel.findById(rideId);
    if (!ride) {
      throw new NotFoundException(`Không tìm thấy chuyến xe với ID: ${rideId}`);
    }

    if (ride.driverId) {
      throw new BadRequestException('Chuyến xe này đã được gán tài xế');
    }

    // Lấy danh sách tài xế sẵn có
    const availableDrivers = await this.getAvailableDrivers(ride);

    if (availableDrivers.length === 0) {
      throw new BadRequestException('Không có tài xế sẵn có');
    }

    // Tính điểm cho từng tài xế
    const driverScores = await Promise.all(
      availableDrivers.map(async (driver) =>
        this.calculateDriverScore(driver, ride)
      )
    );

    // Sắp xếp theo điểm cao nhất
    driverScores.sort((a, b) => b.score - a.score);

    this.logger.debug(`Driver scores for ride ${rideId}:`, driverScores.map(ds => ({
      driverId: ds.driver._id,
      score: ds.score,
      breakdown: ds.breakdown
    })));

    // Tạo assignment request cho tài xế đầu tiên
    const selectedDriver = driverScores[0];
    const assignmentRequest = await this.createAssignmentRequest(
      ride._id.toString(),
      selectedDriver.driver._id.toString(),
      selectedDriver.score,
      1 // Attempt 1
    );

    this.logger.log(
      `Created assignment request ${assignmentRequest._id} for driver ${selectedDriver.driver._id} (score: ${selectedDriver.score})`
    );

    // Emit event để notify driver (via polling hoặc socket)
    this.eventEmitter.emit('assignment.request.created', {
      requestId: assignmentRequest._id,
      driverId: selectedDriver.driver._id,
      rideId: ride._id,
      ride: ride,
      expiresAt: assignmentRequest.expiresAt,
    });

    // Lên lịch timeout check
    this.scheduleTimeoutCheck(assignmentRequest._id.toString(), driverScores);

    return {
      success: true,
      message: `Đã gửi yêu cầu tới tài xế ${selectedDriver.driver._id}`,
      requestId: assignmentRequest._id.toString(),
    };
  }

  /**
   * Tạo assignment request
   */
  private async createAssignmentRequest(
    rideId: string,
    driverId: string,
    score: number,
    attemptNumber: number,
  ): Promise<AssignmentRequestDocument> {
    const expiresAt = new Date(Date.now() + this.REQUEST_TIMEOUT_SECONDS * 1000);

    const request = new this.assignmentRequestModel({
      rideId: new Types.ObjectId(rideId),
      driverId: new Types.ObjectId(driverId),
      status: 'pending',
      score,
      expiresAt,
      attemptNumber,
    });

    return await request.save();
  }

  /**
   * Lên lịch kiểm tra timeout
   */
  private scheduleTimeoutCheck(requestId: string, driverScores: DriverScore[]) {
    const timeoutHandler = setTimeout(async () => {
      const request = await this.assignmentRequestModel.findById(requestId);
      
      if (!request || request.status !== 'pending') {
        this.timeoutHandlers.delete(requestId); // Cleanup
        return; // Đã được xử lý rồi
      }

      this.logger.warn(`Assignment request ${requestId} timeout, retrying with next driver`);

      // Update status sang timeout
      await this.assignmentRequestModel.findByIdAndUpdate(requestId, {
        status: 'timeout',
        respondedAt: new Date(),
      });

      // Retry với driver tiếp theo
      await this.retryWithNextDriver(request, driverScores);
      this.timeoutHandlers.delete(requestId); // Cleanup
    }, this.REQUEST_TIMEOUT_SECONDS * 1000);

    // Store timeout handler để có thể cancel sau
    this.timeoutHandlers.set(requestId, timeoutHandler);
  }

  /**
   * Thử lại với tài xế tiếp theo
   */
  private async retryWithNextDriver(
    previousRequest: AssignmentRequestDocument,
    driverScores: DriverScore[],
  ): Promise<void> {
    const attemptNumber = previousRequest.attemptNumber + 1;
    
    // Lấy danh sách drivers đã được request rồi
    const previousRequests = await this.assignmentRequestModel.find({
      rideId: previousRequest.rideId,
    }).select('driverId');

    const triedDriverIds = previousRequests.map(r => r.driverId.toString());

    // Tìm driver tiếp theo chưa được request
    const nextDriver = driverScores.find(
      ds => !triedDriverIds.includes(ds.driver._id.toString())
    );

    if (!nextDriver) {
      this.logger.error(`No more drivers available for ride ${previousRequest.rideId}`);
      
      // Update ride status
      await this.rideModel.findByIdAndUpdate(previousRequest.rideId, {
        status: 'no_driver_available',
      });

      // Emit event để notify customer
      this.eventEmitter.emit('ride.no_driver_available', {
        rideId: previousRequest.rideId,
      });
      
      return;
    }

    // Tạo request mới cho driver tiếp theo
    const newRequest = await this.createAssignmentRequest(
      previousRequest.rideId.toString(),
      nextDriver.driver._id.toString(),
      nextDriver.score,
      attemptNumber,
    );

    this.logger.log(
      `Retry attempt ${attemptNumber}: Created assignment request ${newRequest._id} for driver ${nextDriver.driver._id}`
    );

    // Emit event
    this.eventEmitter.emit('assignment.request.created', {
      requestId: newRequest._id,
      driverId: nextDriver.driver._id,
      rideId: previousRequest.rideId,
      expiresAt: newRequest.expiresAt,
    });

    // Lên lịch timeout check
    this.scheduleTimeoutCheck(newRequest._id.toString(), driverScores);
  }

  /**
   * Driver accept assignment request
   */
  async acceptAssignmentRequest(requestId: string, driverId: string): Promise<RideDocument> {
    const request = await this.assignmentRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu');
    }

    // Check if request is still valid (not expired)
    if (new Date() > request.expiresAt) {
      throw new BadRequestException('Yêu cầu này đã hết hạn');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Yêu cầu này đã được xử lý hoặc hết hạn');
    }

    if (request.driverId.toString() !== driverId) {
      throw new BadRequestException('Yêu cầu này không dành cho bạn');
    }

    // Sử dụng atomic update để tránh race condition
    const updatedRequest = await this.assignmentRequestModel.findOneAndUpdate(
      {
        _id: requestId,
        status: 'pending', // Chỉ update nếu vẫn còn pending
        expiresAt: { $gt: new Date() }, // Và chưa hết hạn
      },
      {
        status: 'accepted',
        respondedAt: new Date(),
      },
      { new: true }
    );

    if (!updatedRequest) {
      throw new BadRequestException('Yêu cầu này đã được xử lý hoặc hết hạn');
    }

    // QUAN TRỌNG: Cancel timeout handler để tránh retry sau khi đã accept
    const timeoutHandler = this.timeoutHandlers.get(requestId);
    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
      this.timeoutHandlers.delete(requestId);
      this.logger.log(`✅ Cancelled timeout handler for request ${requestId}`);
    }

    // Update ride
    const updatedRide = await this.rideModel.findByIdAndUpdate(
      request.rideId,
      {
        driverId: new Types.ObjectId(driverId),
        status: 'accepted',
        acceptedAt: new Date(),
      },
      { new: true }
    ).populate(['customerId', 'driverId']);

    this.logger.log(`Driver ${driverId} accepted assignment request ${requestId}`);

    // Cancel tất cả pending requests khác của ride này
    await this.assignmentRequestModel.updateMany(
      {
        rideId: request.rideId,
        _id: { $ne: requestId },
        status: 'pending',
      },
      {
        status: 'cancelled',
        respondedAt: new Date(),
      }
    );

    // Emit event
    this.eventEmitter.emit('assignment.request.accepted', {
      requestId,
      driverId,
      rideId: request.rideId,
      ride: updatedRide,
    });

    return updatedRide;
  }

  /**
   * Driver reject assignment request
   */
  async rejectAssignmentRequest(
    requestId: string,
    driverId: string,
    reason?: string,
  ): Promise<void> {
    const request = await this.assignmentRequestModel.findById(requestId);

    if (!request) {
      throw new NotFoundException('Không tìm thấy yêu cầu');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Yêu cầu này đã được xử lý hoặc hết hạn');
    }

    if (request.driverId.toString() !== driverId) {
      throw new BadRequestException('Yêu cầu này không dành cho bạn');
    }

    // Cancel timeout handler
    const timeoutHandler = this.timeoutHandlers.get(requestId);
    if (timeoutHandler) {
      clearTimeout(timeoutHandler);
      this.timeoutHandlers.delete(requestId);
      this.logger.log(`✅ Cancelled timeout handler for request ${requestId}`);
    }

    // Update request status
    await this.assignmentRequestModel.findByIdAndUpdate(requestId, {
      status: 'rejected',
      respondedAt: new Date(),
      rejectionReason: reason,
    });

    this.logger.log(`Driver ${driverId} rejected assignment request ${requestId}${reason ? `: ${reason}` : ''}`);

    // Lấy lại driver scores để retry
    const ride = await this.rideModel.findById(request.rideId);
    const availableDrivers = await this.getAvailableDrivers(ride);
    const driverScores = await Promise.all(
      availableDrivers.map(async (driver) =>
        this.calculateDriverScore(driver, ride)
      )
    );
    driverScores.sort((a, b) => b.score - a.score);

    // Retry với driver tiếp theo
    await this.retryWithNextDriver(request, driverScores);
  }

  /**
   * Lấy danh sách tài xế sẵn có
   */
  private async getAvailableDrivers(ride: RideDocument): Promise<DriverDocument[]> {
    // Tìm các ride đang active để exclude drivers đang có cuốc
    const activeRides = await this.rideModel.find({
      status: { $in: ['accepted', 'in_progress', 'assigned'] },
      driverId: { $exists: true, $ne: null },
    }).select('driverId');

    const busyDriverIds = activeRides.map(r => r.driverId?.toString()).filter(Boolean);

    const drivers = await this.driverModel.find({
      status: 'online',
      isAcceptingRides: true,
      isSuspended: false,
      currentLocation: { $exists: true }, // Có vị trí hiện tại
      _id: { $nin: busyDriverIds }, // Không có trong danh sách đang bận
    });

    console.log('[AutoAssignService] Found available drivers:', {
      total: drivers.length,
      busyCount: busyDriverIds.length,
    });

    return drivers;
  }

  /**
   * Tính điểm cho một tài xế
   */
  private async calculateDriverScore(
    driver: DriverDocument,
    ride: RideDocument
  ): Promise<DriverScore> {
    // 1️⃣ Điểm khoảng cách (40%) - Tài xế càng gần thì điểm càng cao
    const distanceScore = this.calculateDistanceScore(driver, ride);

    // 2️⃣ Điểm rating (30%) - Normalize rating từ 0-5 thành 0-30
    const ratingScore = (driver.averageRating / 5) * 30;

    // 3️⃣ Điểm hoàn thành (20%) - % hoàn thành chuyến
    const completionScore = ((driver.completionRate || 0) / 100) * 20;

    // 4️⃣ Điểm thời gian online (10%) - Tài xế online lâu hơn được điểm cao hơn
    const onlineTimeScore = this.calculateOnlineTimeScore(driver);

    const totalScore = distanceScore + ratingScore + completionScore + onlineTimeScore;

    return {
      driver,
      score: totalScore,
      breakdown: {
        distance: distanceScore,
        rating: ratingScore,
        completion: completionScore,
        onlineTime: onlineTimeScore,
      },
    };
  }

  /**
   * Tính điểm dựa trên khoảng cách (Sử dụng MongoDB geospatial)
   * Tài xế gần nhất = 40 điểm, sau đó giảm dần
   */
  private calculateDistanceScore(driver: DriverDocument, ride: RideDocument): number {
    if (!driver.currentLocation?.coordinates || !ride.pickupLocation?.coordinates) {
      return 0;
    }

    const driverCoords = driver.currentLocation.coordinates;
    const pickupCoords = ride.pickupLocation.coordinates;

    // Tính khoảng cách bằng Haversine formula (đơn giản hóa)
    const distance = this.haversineDistance(
      [driverCoords[1], driverCoords[0]], // [lat, lng]
      [pickupCoords[1], pickupCoords[0]]
    );

    // distance tính bằng km
    // Nếu dưới 1km = 40 điểm
    // Nếu 1-3km = 40 -> 20 điểm
    // Nếu > 3km = < 20 điểm
    if (distance <= 1) {
      return 40;
    } else if (distance <= 3) {
      return 40 - (distance - 1) * 10;
    } else {
      return Math.max(5, 40 - distance * 5);
    }
  }

  /**
   * Tính điểm dựa trên thời gian online
   * Online 0-5 phút = 10 điểm
   * Online > 5 phút = 10 điểm
   */
  private calculateOnlineTimeScore(driver: DriverDocument): number {
    if (!driver.lastOnlineTime) {
      return 0; // Không có dữ liệu
    }

    const lastOnlineMinutesAgo =
      (Date.now() - new Date(driver.lastOnlineTime).getTime()) / (1000 * 60);

    // Tài xế vừa online (< 5 phút) được 10 điểm
    // Tài xế online lâu (> 1 giờ) được 5 điểm
    if (lastOnlineMinutesAgo <= 5) {
      return 10;
    } else if (lastOnlineMinutesAgo <= 60) {
      return 10 - (lastOnlineMinutesAgo - 5) * (5 / 55);
    } else {
      return 5;
    }
  }

  /**
   * Haversine formula - Tính khoảng cách giữa 2 điểm toạ độ
   * @param [lat1, lng1] - Điểm thứ nhất
   * @param [lat2, lng2] - Điểm thứ hai
   * @returns Khoảng cách tính bằng km
   */
  private haversineDistance(
    [lat1, lng1]: [number, number],
    [lat2, lng2]: [number, number]
  ): number {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(value: number): number {
    return (value * Math.PI) / 180;
  }
}
