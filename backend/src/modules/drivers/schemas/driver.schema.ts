import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

export type DriverDocument = Driver & Document & {
  comparePassword(candidatePassword: string): Promise<boolean>;
};

export enum DocumentStatus {
  NOT_SUBMITTED = 'not_submitted',
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
}

export enum DriverStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  ON_TRIP = 'on_trip',
  BREAK = 'break',
}

export enum DriverType {
  HIRE = 'hire',          // Lái xe hộ
  RIDESHARE = 'rideshare', // Ghép xe
  DELIVERY = 'delivery',   // Vận chuyển
}

export enum VehicleType {
  SEDAN = 'sedan',           // Xe 4 chỗ
  SUV = 'suv',               // Xe SUV 7 chỗ
  PICKUP = 'pickup',         // Bán tải
  MOTORCYCLE = 'motorcycle', // Xe máy
}

@Schema({ timestamps: true })
export class Driver {
  // Authentication fields (drivers have their own credentials, independent from User collection)
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  phone: string;

  // Personal information
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  dateOfBirth?: Date;

  @Prop()
  address?: string;

  @Prop({
    type: String,
    enum: DriverStatus,
    default: DriverStatus.OFFLINE,
  })
  status: DriverStatus;

  @Prop({
    type: [String],
    enum: DriverType,
    default: [DriverType.RIDESHARE],
  })
  driverTypes: DriverType[]; // Tài xế có thể làm nhiều loại

  @Prop({
    type: String,
    enum: VehicleType,
    default: VehicleType.SEDAN,
  })
  vehicleType: VehicleType; // Loại xe: sedan, suv, pickup, motorcycle

  // Vehicle information
  @Prop()
  vehicleLicense?: string;

  @Prop()
  vehicleModel?: string;

  @Prop()
  vehicleColor?: string;

  @Prop({ required: true })
  vehiclePlate: string;

  @Prop()
  vehicleImage?: string;

  @Prop()
  vehicleRegistration?: string;

  // Driver license
  @Prop()
  licenseNumber?: string;

  @Prop()
  licenseExpiry?: Date;

  @Prop()
  licenseImage?: string;

  @Prop({
    type: String,
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  licenseStatus: DocumentStatus;

  // ID verification
  @Prop()
  idNumber?: string;

  @Prop()
  idType?: string;

  @Prop()
  idImage?: string;

  @Prop()
  idCardBack?: string;

  @Prop({
    type: String,
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  idStatus: DocumentStatus;

  // Background check
  @Prop({ default: false })
  backgroundCheckPassed: boolean;

  @Prop()
  backgroundCheckDate?: Date;

  // Insurance
  @Prop()
  insuranceProvider?: string;

  @Prop()
  insuranceExpiry?: Date;

  @Prop()
  insuranceCertificate?: string;

  // Banking information
  @Prop()
  bankName?: string;

  @Prop()
  bankAccount?: string;

  @Prop()
  bankAccountHolder?: string;

  // Ratings and statistics
  @Prop({ default: 0 })
  totalRides: number;

  @Prop({ default: 0 })
  completedRides: number;

  @Prop({ default: 0 })
  cancelledRides: number;

  @Prop({ default: 5 })
  averageRating: number;

  @Prop({ default: 0 })
  totalReviews: number;

  @Prop({ default: 0 })
  priorityScore: number; // Increments by 0.1 for each completed trip (for matching priority)

  @Prop({ default: 0 })
  totalEarnings: number;

  @Prop({ default: 0 })
  completionRate: number; // % (0-100)

  @Prop()
  lastOnlineTime?: Date; // Thời gian cuối cùng online

  @Prop({ default: 0 })
  todayOnlineMinutes: number; // Tổng số phút online hôm nay

  @Prop()
  lastOnlineDate?: Date; // Ngày tracking (để reset mỗi ngày)

  @Prop()
  onlineSessionStart?: Date; // Thời điểm bắt đầu session online hiện tại

  // Current location (geospatial)
  @Prop({
    type: { type: String, enum: ['Point'] },
    coordinates: [Number],
  })
  currentLocation?: {
    type: string;
    coordinates: [number, number];
  };

  @Prop()
  lastLocationUpdate?: Date;

  // Status flags
  @Prop({ default: true })
  isAcceptingRides: boolean;

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ default: false })
  isOnline: boolean;

  @Prop({ default: false })
  isAvailable: boolean;

  // Wallet fields (Driver Wallet System)
  @Prop({ default: 0 })
  walletBalance: number; // Số dư ví hiện tại (VNĐ)

  @Prop({ default: 100000 })
  minimumBalance: number; // Số dư tối thiểu để nhận cuốc (VNĐ)

  @Prop({ default: 0 })
  pendingBalance: number; // Số tiền đang chờ xử lý

  @Prop({ default: false })
  isWalletLocked: boolean; // Khóa ví khi số dư < minimumBalance

  // Commission rate is dynamic from PricingConfig (not stored per driver)
  // Use PricingConfig.driverShare to calculate: commissionRate = 100 - driverShare
  // Example: driverShare=80 → app takes 20% commission

  @Prop({ default: false })
  isSuspended: boolean;

  @Prop()
  suspensionReason?: string;

  @Prop()
  suspendedUntil?: Date;

  // Documents approval
  @Prop({
    type: String,
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  approvalStatus: DocumentStatus; // Tình trạng duyệt tài xế

  @Prop()
  approvedAt?: Date;

  @Prop()
  approvedBy?: string;

  @Prop()
  approvalNotes?: string;

  @Prop()
  rejectedAt?: Date;

  @Prop({ type: Object })
  rejectionReasons?: Record<string, string>;

  @Prop()
  globalRejectionReason?: string;

  @Prop({ type: [String] })
  rejectedDocuments?: string[];

  // Uploaded documents
  @Prop({
    type: Object,
    default: {},
  })
  documents?: {
    idCardFront?: {
      url: string;
      uploadedAt: Date;
    };
    idCardBack?: {
      url: string;
      uploadedAt: Date;
    };
    driverLicense?: {
      url: string;
      uploadedAt: Date;
    };
    vehicleRegistration?: {
      url: string;
      uploadedAt: Date;
    };
    vehiclePlate?: {
      url: string;
      uploadedAt: Date;
    };
    insurance?: {
      url: string;
      uploadedAt: Date;
    };
    facePhoto?: {
      url: string;
      uploadedAt: Date;
    };
  };

  @Prop()
  documentsSubmittedAt?: Date;

  @Prop({
    type: String,
    enum: DocumentStatus,
    default: DocumentStatus.NOT_SUBMITTED,
  })
  verificationStatus?: DocumentStatus;
}

export const DriverSchema = SchemaFactory.createForClass(Driver);

// Hash password before saving
DriverSchema.pre<DriverDocument>('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Add comparePassword method
DriverSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// Sparse index for geospatial queries - only on documents with currentLocation
DriverSchema.index({ 'currentLocation': '2dsphere' }, { sparse: true });
DriverSchema.index({ email: 1 });
DriverSchema.index({ status: 1 });
DriverSchema.index({ licenseExpiry: 1 });
DriverSchema.index({ isSuspended: 1 });
