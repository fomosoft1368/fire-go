import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Driver, DriverDocument } from '../../drivers/schemas/driver.schema';
import { Ride, RideDocument } from '../schemas/ride.schema';

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

  constructor(
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Ride.name) private rideModel: Model<RideDocument>,
  ) {}

  /**
   * Tính điểm cho tài xế dựa trên công thức:
   * Điểm = (40% Khoảng cách) + (30% Rating) + (20% Hoàn thành) + (10% Thời gian online)
   */
  async autoAssignDriver(rideId: string): Promise<RideDocument> {
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

    this.logger.debug(`Driver scores for ride ${rideId}:`, driverScores);

    const selectedDriver = driverScores[0];
    this.logger.log(
      `Assigned driver ${selectedDriver.driver._id} to ride ${rideId} with score ${selectedDriver.score}`
    );

    // Cập nhật chuyến xe
    const updatedRide = await this.rideModel.findByIdAndUpdate(
      rideId,
      {
        driverId: selectedDriver.driver._id,
        status: 'assigned',
        assignedAt: new Date(),
      },
      { new: true }
    ).populate(['customerId', 'driverId']);

    return updatedRide;
  }

  /**
   * Lấy danh sách tài xế sẵn có
   */
  private async getAvailableDrivers(ride: RideDocument): Promise<DriverDocument[]> {
    const drivers = await this.driverModel.find({
      status: 'online',
      isAcceptingRides: true,
      isSuspended: false,
      driverId: { $eq: null }, // Không có chuyến đang làm
      currentLocation: { $exists: true }, // Có vị trí hiện tại
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
