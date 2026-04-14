import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

export interface IUserDocument extends User, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserDocument = IUserDocument;

export enum UserRole {
  DRIVER = 'driver',
  CUSTOMER = 'customer',
  ADMIN = 'admin',
  STAFF = 'staff',
  F1_LEAD = 'f1_lead',
  F2_SUB_LEAD = 'f2_sub_lead',
  F3_STAFF_MKT = 'f3_staff_mkt',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

export enum UserPermission {
  // Dispatch Management
  VIEW_DISPATCH = 'view_dispatch',
  MANAGE_DISPATCH = 'manage_dispatch',
  RESOLVE_DISPUTES = 'resolve_disputes',

  // Driver Management
  VIEW_DRIVERS = 'view_drivers',
  APPROVE_DRIVERS = 'approve_drivers',
  SUSPEND_DRIVERS = 'suspend_drivers',
  MANAGE_DRIVERS = 'manage_drivers',

  // Customer Management
  VIEW_CUSTOMERS = 'view_customers',
  BLOCK_CUSTOMERS = 'block_customers',
  MANAGE_CUSTOMERS = 'manage_customers',

  // Financial
  VIEW_REVENUE = 'view_revenue',
  MANAGE_PAYMENTS = 'manage_payments',
  VIEW_WALLETS = 'view_wallets',

  // System
  MANAGE_USERS = 'manage_users',
  MANAGE_PERMISSIONS = 'manage_permissions',
  VIEW_LOGS = 'view_logs',
  MANAGE_SETTINGS = 'manage_settings',
}

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  avatar?: string;

  @Prop({
    type: String,
    enum: UserRole,
    required: true,
  })
  role: UserRole;

  @Prop({
    type: String,
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop()
  emailVerifiedAt?: Date;

  @Prop({ default: false })
  phoneVerified: boolean;

  @Prop()
  phoneVerifiedAt?: Date;

  @Prop({ default: false })
  identityVerified: boolean;

  @Prop()
  identityVerifiedAt?: Date;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  lastLogoutAt?: Date;

  @Prop({ default: false })
  isBlocked?: boolean;

  @Prop()
  blockedReason?: string;

  @Prop()
  department?: string;

  @Prop({ type: [String], default: [] })
  permissions?: string[];

  @Prop()
  lastActivityAt?: Date;

  // Marketing & Referral System
  @Prop({ type: Types.ObjectId, ref: 'Region' })
  regionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  marketingReferrerId?: Types.ObjectId;

  @Prop({ sparse: true, unique: true })
  referralCode?: string;

  @Prop()
  address?: string;

  // Wallet fields for Marketing
  @Prop({ default: 0 })
  walletBalance?: number;

  @Prop({ default: 0 })
  pendingBalance?: number;

  // Push notification
  @Prop()
  expoPushToken?: string;

  // Single-session control: increment on every login to invalidate old tokens
  @Prop({ default: 0 })
  tokenVersion: number;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  // Sinh mã giới thiệu cho Marketing staff nếu chưa có
  if (
    !this.referralCode &&
    ['F1_LEAD', 'F2_SUB_LEAD', 'F3_STAFF_MKT'].includes(this.role)
  ) {
    this.referralCode =
      'MKT' + Math.random().toString(36).substring(2, 6).toUpperCase();
  }

  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as any);
  }
});

// Add method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
) {
  return bcrypt.compare(candidatePassword, this.password);
};

UserSchema.index({ email: 1 });
UserSchema.index({ phone: 1 });
UserSchema.index({ role: 1 });
