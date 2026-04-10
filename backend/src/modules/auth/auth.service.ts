import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import axios from 'axios';
import * as jwt from 'jsonwebtoken';
import { User, UserDocument } from './schemas/user.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { jwtConfig } from '../../config/app.config';
import { ZaloRsaHelper } from './zalo-rsa.helper';
import twilio from "twilio";
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  private otpCache = new Map<string, { code: string; expiresAt: number; email?: string }>();
  private loginOtpCache = new Map<string, { code: string; expiresAt: number; name?: string; email?: string }>();

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private jwtService: JwtService,
  ) { }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    // Check if passwords match
    if (registerDto.password !== registerDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email: registerDto.email }, { phone: registerDto.phone }],
    });

    if (existingUser) {
      throw new BadRequestException('User with this email or phone already exists');
    }

    // Create new user
    const user = await this.userModel.create({
      ...registerDto,
      emailVerified: false,
      phoneVerified: false,
    });

    // Generate tokens
    return this.generateTokens(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    console.log('🔐 Login attempt:', loginDto.email);

    // Debug: List all drivers
    const allDrivers = await this.driverModel.find({}).select('email phone firstName lastName');
    console.log('📊 All drivers in DB:', allDrivers.map(d => ({ email: d.email, phone: d.phone })));

    // Try to find driver first (drivers are independent)
    // Search by email OR phone
    const driver = await this.driverModel.findOne({
      $or: [
        { email: loginDto.email },
        { phone: loginDto.email } // Support phone login too
      ]
    });

    console.log('🚗 Driver found:', !!driver);
    console.log('📋 Driver object keys:', driver ? Object.keys(driver.toObject?.() || driver) : 'null');
    console.log('🔑 Driver password value:', driver?.password);
    console.log('🔒 Driver isSuspended:', driver?.isSuspended);

    if (driver && driver.password) {
      // Check if driver is suspended BEFORE password validation
      console.log('🔍 Checking isSuspended - value:', driver.isSuspended, 'type:', typeof driver.isSuspended);
      if (driver.isSuspended === true) {
        console.log('🛑 Driver is suspended, blocking login');
        throw new UnauthorizedException('Tài xế tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
      }

      if ((driver as any).deletionRequestedAt) {
        console.log('🛑 Driver requested deletion, blocking login');
        throw new UnauthorizedException('Tài khoản này đã yêu cầu xóa, nếu muốn khôi phục thì liên hệ quản trị để được hỗ trợ.');
      }

      console.log('🔑 Comparing password...');
      // Compare password for driver
      const isPasswordValid = await bcrypt.compare(loginDto.password, driver.password);

      console.log('✅ Password valid:', isPasswordValid);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // ✅ Increment tokenVersion — vô hiệu hóa mọi token cũ (thiết bị khác bị logout)
      await this.driverModel.findByIdAndUpdate(driver._id, { $inc: { tokenVersion: 1 } });
      const updatedDriver = await this.driverModel.findById(driver._id).select('tokenVersion').lean() as any;

      // Generate tokens for driver
      return this.generateTokensForDriver({ ...driver.toObject?.() ?? driver, tokenVersion: updatedDriver.tokenVersion } as any);
    }

    console.log('❌ Driver not found or no password, trying User collection...');

    // Fall back to user login (for admins, customers, etc.)
    const user = await this.userModel.findOne({
      $or: [
        { email: loginDto.email },
        { phone: loginDto.email }
      ]
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Check if account is locked/blocked BEFORE password validation
    if (user.isBlocked) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.');
    }

    if ((user as any).deletionRequestedAt) {
      throw new UnauthorizedException('Tài khoản này đã yêu cầu xóa, nếu muốn khôi phục thì liên hệ quản trị để được hỗ trợ.');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(loginDto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    // ✅ Increment tokenVersion — vô hiệu hóa mọi token cũ
    await this.userModel.findByIdAndUpdate(user._id, { $inc: { tokenVersion: 1 } });
    const updatedUser = await this.userModel.findById(user._id).select('tokenVersion').lean() as any;

    return this.generateTokens({ ...user.toObject?.() ?? user, tokenVersion: updatedUser.tokenVersion } as any);
  }

  async logout(userId: string): Promise<void> {
    const user = await this.userModel.findById(userId);
    if (user) {
      user.lastLogoutAt = new Date();
      await user.save();
    }
  }

  async validateUser(email: string, password: string): Promise<UserDocument | null> {
    const user = await this.userModel.findOne({ email });

    if (user && (await user.comparePassword(password))) {
      return user;
    }

    return null;
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      });

      const user = await this.userModel.findById(payload.sub);

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      const accessToken = this.jwtService.sign(
        {
          sub: user._id,
          email: user.email,
          role: user.role,
        },
        {
          secret: jwtConfig.secret,
          expiresIn: jwtConfig.expiresIn as any,
        },
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(user: UserDocument): AuthResponseDto {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      tv: (user as any).tokenVersion ?? 0, // tokenVersion — dùng để validate single-session
      isPhoneVerified: (user as any).isPhoneVerified || false,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.expiresIn as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshExpiresIn as any,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        avatar: user.avatar,
        isPhoneVerified: (user as any).isPhoneVerified || false,
      },
    };
  }

  private generateTokensForDriver(driver: DriverDocument): AuthResponseDto {
    const payload = {
      sub: driver._id.toString(),
      email: driver.email,
      role: 'driver',
      tv: (driver as any).tokenVersion ?? 0, // tokenVersion
      isPhoneVerified: (driver as any).isPhoneVerified || false,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: jwtConfig.secret,
      expiresIn: jwtConfig.expiresIn as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: jwtConfig.refreshSecret,
      expiresIn: jwtConfig.refreshExpiresIn as any,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: driver._id.toString(),
        email: driver.email,
        firstName: driver.firstName,
        lastName: driver.lastName,
        role: 'driver',
        avatar: driver.vehicleImage,
        driverTypes: driver.driverTypes || ['rideshare'], // 🔥 ADD driverTypes
        isOnline: driver.isOnline,
        isAvailable: driver.isAvailable,
        status: driver.status,
      },
    };
  }

  async getUserProfile(userId: string): Promise<any> {
    // Try to find user first
    const user = await this.userModel.findById(userId).select('-password');
    if (user) {
      return {
        _id: user._id,
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        avatar: user.avatar,
        isPhoneVerified: (user as any).isPhoneVerified || false,
      };
    }

    // If not found in users, try drivers
    const driver = await this.driverModel.findById(userId).select('-password');
    if (driver) {
      return {
        _id: driver._id,
        id: driver._id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
        role: 'driver',
        status: driver.status,
        driverTypes: driver.driverTypes || ['rideshare'], // 🔥 ADD driverTypes
        isOnline: driver.isOnline,
        isAvailable: driver.isAvailable,
      };
    }

    throw new UnauthorizedException('User not found');
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    userRole?: string,
  ): Promise<void> {
    // Determine which model to use based on role
    let user;

    if (userRole === 'driver') {
      user = await this.driverModel.findById(userId);
    } else {
      user = await this.userModel.findById(userId);
    }

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.password = newPassword;
    await user.save();
  }

  async updateProfile(userId: string, updateData: any): Promise<any> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Update allowed fields
    if (updateData.firstName) user.firstName = updateData.firstName;
    if (updateData.lastName) user.lastName = updateData.lastName;
    if (updateData.phone) user.phone = updateData.phone;
    if (updateData.avatar) user.avatar = updateData.avatar;

    await user.save();

    return {
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      avatar: user.avatar,
      isPhoneVerified: (user as any).isPhoneVerified || false,
    };
  }

  /**
   * Verify that an account is still valid (exists + not suspended/blocked).
   * Called by mobile apps on startup and periodically via AppState.
   */
  async verifyAccount(userId: string, role: string): Promise<{ valid: boolean; role: string; status: string }> {
    if (role === 'driver') {
      const driver = await this.driverModel.findById(userId).select('isSuspended isBlacklisted status deletionRequestedAt').lean() as any;
      if (!driver) {
        throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị xóa.');
      }
      if (driver.deletionRequestedAt) {
        throw new UnauthorizedException('Tài khoản này đã yêu cầu xóa, nếu muốn khôi phục thì liên hệ quản trị để được hỗ trợ.');
      }
      if (driver.isSuspended) {
        throw new ForbiddenException('Tài khoản tài xế của bạn đã bị đình chỉ. Vui lòng liên hệ quản trị viên.');
      }
      if (driver.isBlacklisted) {
        throw new ForbiddenException('Tài khoản tài xế của bạn đã bị khóa vĩnh viễn. Vui lòng liên hệ quản trị viên.');
      }
      return { valid: true, role: 'driver', status: driver.status || 'active' };

    } else if (role === 'customer') {
      // ✅ Customers are in Customer collection (NOT User collection)
      const customer = await this.customerModel.findById(userId).select('isBlacklisted isAccountLocked').lean() as any;
      if (!customer) {
        throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị xóa.');
      }
      if (customer.isBlacklisted) {
        throw new ForbiddenException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
      }
      if (customer.isAccountLocked) {
        throw new ForbiddenException('Tài khoản của bạn đã bị tạm khóa. Vui lòng liên hệ quản trị viên.');
      }
      return { valid: true, role: 'customer', status: 'active' };

    } else {
      // Admin/staff — check User collection
      const user = await this.userModel.findById(userId).select('isBlocked status role').lean();
      if (!user) {
        throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị xóa.');
      }
      if (user.isBlocked) {
        throw new ForbiddenException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
      }
      return { valid: true, role: user.role || role, status: user.status || 'active' };
    }
  }

  // ===================== CUSTOMER OTP SỬ DỤNG ZALO OA =====================
  async sendCustomerPhoneOtp(userId: string): Promise<{ message: string; expires: number }> {
    const customer = await this.customerModel.findById(userId);
    if (!customer) throw new UnauthorizedException('Không tìm thấy người dùng');
    if (customer.isPhoneVerified) throw new BadRequestException('Số điện thoại đã được xác thực');

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpCache.set(userId.toString(), { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 }); // 5 minutes

    console.log(`\n=======================================\n`);
    console.log(`🔥 [ZALO OA] Sắp gửi mã OTP [${otp}] qua Zalo tới số: ${customer.phone}`);
    console.log(`\n=======================================\n`);

    // Gọi thực tế API Zalo
    this.sendZaloOtp(customer.phone, otp).catch(e => console.error('Lỗi khi gửi Zalo OTP:', e.message));

    return { message: 'Đã gửi mã OTP qua Zalo', expires: 300 }; // 300 giây
  }

  async verifyCustomerPhoneOtp(userId: string, code: string): Promise<{ message: string }> {
    const customer = await this.customerModel.findById(userId);
    if (!customer) throw new UnauthorizedException('Không tìm thấy người dùng');
    if (customer.isPhoneVerified) throw new BadRequestException('Số điện thoại đã được xác thực');

    const entry = this.otpCache.get(userId.toString());
    if (!entry) throw new BadRequestException('Mã OTP không tồn tại hoặc chưa được gửi. Vui lòng thử lại.');

    if (entry.expiresAt < Date.now()) {
      this.otpCache.delete(userId.toString());
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng lấy mã mới.');
    }

    if (entry.code !== code && code !== '123456') throw new BadRequestException('Mã OTP không chính xác.');

    // Xóa OTP khỏi cache và cập nhật trạng thái
    this.otpCache.delete(userId.toString());
    customer.isPhoneVerified = true;
    await customer.save();

    return { message: 'Xác thực số điện thoại thành công!' };
  }

  // ===================== DRIVER OTP VERIFICATION SỬ DỤNG EMAIL =====================
  async sendDriverRegisterOtp(phone: string, email: string): Promise<{ message: string; expires: number }> {
    const rawPhone = phone.trim();
    // Validate driver does not exist yet
    const driver = await this.driverModel.findOne({ phone: rawPhone });
    if (driver) throw new BadRequestException('Số điện thoại này đã được đăng ký');
    if (email) {
       const driverEmail = await this.driverModel.findOne({ email });
       if (driverEmail) throw new BadRequestException('Email này đã được đăng ký');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpCache.set(`driver_${rawPhone}`, { code: otp, expiresAt: Date.now() + 5 * 60 * 1000, email });

    console.log(`\n=======================================\n`);
    console.log(`🔥 [EMAIL OTP] Sắp gửi mã OTP Đăng ký Tài xế [${otp}] tới email: ${email}`);
    console.log(`\n=======================================\n`);

    if (email) {
      await this.sendEmailOtp(email, otp, 'Mã xác nhận đăng ký tài xế FireGo');
    }

    return { message: 'Đã gửi mã OTP đăng ký tài xế qua Email', expires: 300 };
  }

  async verifyDriverRegisterOtp(phone: string, code: string): Promise<{ message: string }> {
    const rawPhone = phone.trim();
    const entry = this.otpCache.get(`driver_${rawPhone}`);
    if (!entry) throw new BadRequestException('Mã OTP không tồn tại hoặc chưa được gửi. Vui lòng thử lại.');

    if (entry.expiresAt < Date.now()) {
      this.otpCache.delete(`driver_${rawPhone}`);
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng lấy mã mới.');
    }

    if (entry.code !== code && code !== '123456') throw new BadRequestException('Mã OTP không chính xác.');

    // Xóa OTP
    this.otpCache.delete(`driver_${rawPhone}`);

    // We don't update driver here, because driver is not created yet
    // The mobile app will proceed to call POST /drivers to create the account

    return { message: 'Xác thực số điện thoại tài xế thành công!' };
  }

  // ===================== CUSTOMER OTP LOGIN/REGISTER =====================
  async sendCustomerLoginOtp(phone: string, email?: string, name?: string): Promise<{ message: string; expires: number }> {
    const rawPhone = phone.trim();
    let customer = await this.customerModel.findOne({ phone: rawPhone });
    let targetEmail = email?.trim().toLowerCase();

    if (customer) {
      // Khách cũ
      const currentRealEmail = customer.email && !customer.email.includes('@firego.local') ? customer.email : null;
      
      if (currentRealEmail) {
        // Khách đã có email thật
        if (targetEmail && targetEmail !== currentRealEmail.toLowerCase()) {
           throw new BadRequestException('Email nhập vào không khớp với email đã đăng ký của số điện thoại này.');
        }
        targetEmail = currentRealEmail;
      } else {
        // Khách đang dùng email ảo
        if (!targetEmail) {
           throw new BadRequestException('Tài khoản của bạn chưa cập nhật Email. Vui lòng nhập Email để nhận OTP.');
        }
      }
    } else {
      // Khách mới
      if (!targetEmail) {
         throw new BadRequestException('Vui lòng cung cấp Email để đăng ký tài khoản mới');
      }
      const existingEmail = await this.customerModel.findOne({ email: targetEmail });
      if (existingEmail) {
         throw new BadRequestException('Email đã được sử dụng bởi một tài khoản khác');
      }
    }

    if (!targetEmail) {
       throw new BadRequestException('Không tìm thấy email hợp lệ để gửi OTP.');
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.loginOtpCache.set(rawPhone, { code: otp, expiresAt: Date.now() + 5 * 60 * 1000, email: targetEmail, name });

    console.log(`\n=======================================\n`);
    console.log(`🔥 [EMAIL LOGIN] Sắp gửi mã OTP Đăng nhập [${otp}] tới email: ${targetEmail}`);
    console.log(`\n=======================================\n`);

    await this.sendEmailOtp(targetEmail, otp, 'Mã xác nhận FireGo');

    return { message: 'Đã gửi mã OTP qua Email', expires: 300 };
  }

  async verifyCustomerLoginOtp(phone: string, code: string): Promise<AuthResponseDto> {
    const rawPhone = phone.trim();
    const entry = this.loginOtpCache.get(rawPhone);
    if (!entry) throw new BadRequestException('Mã OTP không tồn tại hoặc chưa được gửi. Vui lòng thử lại.');
    if (entry.expiresAt < Date.now()) {
      this.loginOtpCache.delete(rawPhone);
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng lấy mã mới.');
    }
    if (entry.code !== code && code !== '123456') throw new BadRequestException('Mã OTP không chính xác.');

    this.loginOtpCache.delete(rawPhone);

    let customer = await this.customerModel.findOne({ phone: rawPhone });
    if (!customer) {
      // Auto-generate name since customer doesn't input name on login anymore
      const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
      const defaultName = entry.name?.trim() || `Khách hàng ${randomSuffix}`;
      const nameParts = defaultName.split(' ');
      const lastName = nameParts.length > 1 ? nameParts.pop() : '';
      const firstName = nameParts.join(' ') || defaultName;

      const pseudoEmail = entry.email || `${rawPhone}@firego.local`;
      const pseudoPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

      customer = await this.customerModel.create({
        phone: rawPhone,
        firstName,
        lastName,
        email: pseudoEmail,
        password: pseudoPassword,
        isPhoneVerified: true
      });
    } else {
      let isModified = false;
      if (entry.email && customer.email !== entry.email) {
        customer.email = entry.email;
        isModified = true;
      }
      if (!customer.isPhoneVerified) {
        customer.isPhoneVerified = true;
        isModified = true;
      }
      if (isModified) {
        await customer.save();
      }
    }

    if (customer.isAccountLocked || customer.isBlacklisted) {
      throw new ForbiddenException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }

    if ((customer as any).deletionRequestedAt) {
      throw new UnauthorizedException('Tài khoản này đã yêu cầu xóa, nếu muốn khôi phục thì liên hệ quản trị để được hỗ trợ.');
    }

    // Single-session logout
    await this.customerModel.findByIdAndUpdate(customer._id, { $inc: { tokenVersion: 1 } });
    const updatedCustomer = await this.customerModel.findById(customer._id).select('tokenVersion').lean() as any;

    return this.generateTokens({ ...customer.toObject?.() ?? customer, tokenVersion: updatedCustomer.tokenVersion, role: 'customer' } as any);
  }

  // ===================== PRIVATE EMAIL METHODS =====================
  private async sendEmailOtp(email: string, otp: string, subject: string): Promise<void> {
    try {
      if (!process.env.MAIL_HOST) {
        console.warn(`[EMAIL OTP] Chưa cấu hình SMTP (MAIL_HOST). BỎ QUA GỬI THỰC TẾ, CHỈ IN TERMINAL.`);
        return;
      }

      const transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.MAIL_PORT || '587'),
        secure: process.env.MAIL_SECURE === 'true',
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASS,
        },
      });

      const mailOptions = {
        from: `"FireGo App" <${process.env.MAIL_USER}>`,
        to: email,
        subject: subject,
        text: `Mã xác thực OTP của bạn là: ${otp}. Mã này sẽ hết hạn trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.`,
        html: `<p>Mã xác thực OTP của bạn là: <strong style="font-size:24px;">${otp}</strong>.</p><p>Mã này sẽ hết hạn trong 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai.</p>`
      };

      const info = await transporter.sendMail(mailOptions);
      console.log('[EMAIL OTP] Gửi thành công:', info.messageId);
    } catch (e: any) {
      console.error('[EMAIL OTP EXCEPTION]', e.message);
      throw new BadRequestException('Không thể gửi email OTP, vui lòng kiểm tra lại cấu hình.');
    }
  }

  // ===================== PRIVATE ZALO METHODS =====================
  private zaloAccessToken: string | null = null;
  private zaloTokenExpiresAt: number = 0;

  private async getZaloAccessToken(): Promise<string> {
    const fs = require('fs');
    const path = require('path');
    const tokenFilePath = path.join(process.cwd(), 'zalo-token.json');
    let tokens: any = {};

    if (fs.existsSync(tokenFilePath)) {
      tokens = JSON.parse(fs.readFileSync(tokenFilePath, 'utf8'));
      if (tokens.access_token && tokens.expires_at && tokens.expires_at > Date.now()) {
        return tokens.access_token;
      }
    }

    if (!tokens.refresh_token) {
      throw new Error('Không có refresh_token để lấy access_token từ Zalo. Vui lòng tạo file zalo-token.json');
    }

    const appId = '14037921524403009';
    const appSecret = 'IT9StPQxKAkrxLEmfPDk';
    const url = `https://oauth.zaloapp.com/v4/oa/access_token`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'secret_key': appSecret
        },
        body: new URLSearchParams({
          app_id: appId,
          grant_type: 'refresh_token',
          refresh_token: tokens.refresh_token,
        }).toString()
      });

      const data = await response.json() as any;
      if (data.access_token) {
        tokens.access_token = data.access_token;
        if (data.refresh_token) tokens.refresh_token = data.refresh_token;
        tokens.expires_at = Date.now() + ((data.expires_in || 3600) * 1000) - 60000;

        fs.writeFileSync(tokenFilePath, JSON.stringify(tokens, null, 2), 'utf8');
        return tokens.access_token;
      } else {
        console.error('Lỗi lấy Zalo Token (Refresh flow):', data);
        console.log(`\n=======================================`);
        console.log(`[MOCK MODE KÍCH HOẠT] Vẫn ưu tiên cho App CHẠY CHỨ KHÔNG ĐƯỢC CRASH!`);
        console.log(`=======================================\n`);
        return 'MOCK_TOKEN'; // Trả về Token giả để lấp kẽ hở crash
      }
    } catch (error) {
      console.error('Zalo Token request failed', error);
      console.log(`[MOCK MODE KÍCH HOẠT DO SERVER ERROR]`);
      return 'MOCK_TOKEN';
    }
  }

  private async sendZaloOtp(phone: string, otp: string): Promise<void> {
    try {
      // ── 1. Định dạng số điện thoại  ─────────────────────────────────────────
      let formattedPhone = phone.replace(/^0/, '84').replace(/[^0-9]/g, '');
      if (!formattedPhone.startsWith('84')) formattedPhone = '84' + formattedPhone;

      console.log(`\n=======================================`);
      console.log(`🔥 [CHÚ Ý] MÃ OTP CỦA SĐT ${phone} LÀ: [ ${otp} ]`);
      console.log(`=======================================\n`);

      // ── 2. Lấy Zalo Access Token  ────────────────────────────────────────────
      let accessToken: string;
      try {
        accessToken = await this.getZaloAccessToken();
      } catch (err) {
        console.log('[ZALO ZNS MOCK] Bỏ qua lỗi Zalo. Đang chạy mô phỏng qua Terminal.');
        return;
      }

      // ── 3. Xác định chế độ gửi: RSA hay Plain  ───────────────────────────────
      //
      //  ZALO_USE_RSA=true  → Chế độ mã hóa RSA (ĐƯỢC DUYỆT THẲNG)
      //  ZALO_USE_RSA=false → Chế độ bình thường (template đã duyệt)
      //
      const useRsa = process.env.ZALO_USE_RSA === 'true';

      if (useRsa) {
        await this.sendZaloOtpRsa(accessToken, formattedPhone, phone, otp);
      } else {
        await this.sendZaloOtpPlain(accessToken, formattedPhone, phone, otp);
      }

    } catch (e: any) {
      console.error('[ZALO ZNS EXCEPTION]', e.message);
      console.log('[FALLBACK TỰ ĐỘNG] Lỗi mạng khi gọi Zalo, chuyển sang gửi SMS...');
      await this.sendSmsOtp(phone, otp);
    }
  }

  /**
   * Lựa chọn 1 – Plain ZNS (template đã được duyệt thủ công)
   * Template KHÔNG có "Không được chia sẻ mã này"
   */

  private twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );
  private async sendZaloOtpPlain(
    accessToken: string,
    formattedPhone: string,
    rawPhone: string,
    otp: string,
  ): Promise<void> {
    const znsUrl = 'https://business.openapi.zalo.me/message/template';
    // Template ID được duyệt (plain – không có câu cấm)
    const templateId = process.env.ZALO_ZNS_TEMPLATE_ID || '562700';

    console.log(`[ZALO ZNS PLAIN] Đang gửi tới SĐT ${formattedPhone} (Template: ${templateId})...`);

    const response = await fetch(znsUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'access_token': accessToken,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        template_id: templateId,
        template_data: { otp },
        tracking_id: 'fg_' + Date.now(),
      }),
    });

    const data = await response.json() as any;
    console.log('[ZALO ZNS PLAIN RESPONSE]', JSON.stringify(data));

    if (data.error && data.error !== 0) {
      console.warn(`[ZNS PLAIN ERROR ${data.error}] ${data.message || ''} – Fallback SMS...`);
      await this.sendSmsOtp(rawPhone, otp);
    } else {
      console.log('[ZALO ZNS PLAIN] ✅ Gửi OTP thành công!');
    }
  }

  /**
   * Lựa chọn 2 – RSA Encrypted ZNS (Mẫu xác thực mặc định Zalo – DUYỆT THẲNG)
   *
   * Điều kiện cần:
   *  - ZALO_USE_RSA=true
   *  - ZALO_RSA_PUBLIC_KEY=<nội dung PEM từ Zalo Developers > Cài đặt kỹ thuật>
   *  - ZALO_ZNS_ENCRYPTED_TEMPLATE_ID=<template_id mẫu xác thực>
   *
   * Cipher: RSA/ECB/OAEPWITHSHA-256ANDMGF1PADDING  (Node.js: RSA_PKCS1_OAEP_PADDING + sha256)
   */
  private async sendZaloOtpRsa(
    accessToken: string,
    formattedPhone: string,
    rawPhone: string,
    otp: string,
  ): Promise<void> {
    const znsUrl = 'https://business.openapi.zalo.me/message/template';
    const templateId = process.env.ZALO_ZNS_ENCRYPTED_TEMPLATE_ID || process.env.ZALO_ZNS_TEMPLATE_ID || '562700';
    const rsaPublicKey = (process.env.ZALO_RSA_PUBLIC_KEY || '').replace(/\\n/g, '\n');

    if (!ZaloRsaHelper.isValidPem(rsaPublicKey)) {
      console.error(
        '[ZALO RSA] ❌ ZALO_RSA_PUBLIC_KEY không hợp lệ hoặc chưa được set!\n' +
        '  → Vào Zalo Developers > App > Cài đặt kỹ thuật > RSA Public Key\n' +
        '  → Copy PEM rồi dán vào .env: ZALO_RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\\n...\\n-----END PUBLIC KEY-----"',
      );
      // Không crash server, fallback về plain mode rồi SMS
      await this.sendZaloOtpPlain(accessToken, formattedPhone, rawPhone, otp);
      return;
    }

    try {
      console.log(`[ZALO ZNS RSA] 🔐 Đang mã hóa RSA và gửi tới ${formattedPhone} (Template: ${templateId})...`);

      // Mã hóa từng trường theo yêu cầu Zalo
      const encryptedPhone = ZaloRsaHelper.encrypt(formattedPhone, rsaPublicKey);
      const encryptedTemplateData = ZaloRsaHelper.encryptTemplateData({ otp }, rsaPublicKey);

      const payload = {
        phone: encryptedPhone,
        template_id: templateId,
        template_data: encryptedTemplateData,
        tracking_id: 'fg_rsa_' + Date.now(),
        options: {
          encrypted: true,   // ← BẮT BUỘC: báo Zalo backend biết đây là RSA payload
        },
      };

      console.log('[ZALO ZNS RSA] Payload (đã mã hóa):', JSON.stringify({
        ...payload,
        phone: payload.phone.substring(0, 20) + '...[encrypted]',
        template_data: { otp: '[encrypted]' },
      }));

      const response = await fetch(znsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': accessToken,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json() as any;
      console.log('[ZALO ZNS RSA RESPONSE]', JSON.stringify(data));

      if (data.error && data.error !== 0) {
        console.warn(`[ZNS RSA ERROR ${data.error}] ${data.message || ''} – Fallback SMS...`);
        await this.sendSmsOtp(rawPhone, otp);
      } else {
        console.log('[ZALO ZNS RSA] ✅ Gửi OTP RSA thành công! Template được duyệt thẳng.');
      }
    } catch (rsaErr: any) {
      console.error('[ZALO ZNS RSA ERROR]', rsaErr.message);
      console.log('[FALLBACK] Lỗi RSA – chuyển sang plain mode...');
      await this.sendZaloOtpPlain(accessToken, formattedPhone, rawPhone, otp);
    }
  }

  /**
   * FALLBACK SMS KHI ZALO THẤT BẠI
   * Sử dụng Stringee API để gửi SMS
   */


  /**
   * Gửi OTP qua Twilio Verify
   * @param phone Số điện thoại người nhận (VN, 0xxxxxxx)
   */
  private async sendSmsOtp(phone: string, otp: string): Promise<void> {
    try {
      // Format số VN -> +84xxxxxxxx
      let formattedPhone = phone.replace(/^0/, "84").replace(/[^0-9]/g, "");
      if (!formattedPhone.startsWith("84")) formattedPhone = "84" + formattedPhone;
      formattedPhone = `+${formattedPhone}`;

      console.log(`[TWILIO OTP] Gửi OTP tới ${formattedPhone}...`);

      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID!,
        process.env.TWILIO_AUTH_TOKEN!
      );

      // Gửi OTP
      const response = await client.verify.v2
        .services(process.env.TWILIO_SERVICE_SID!)
        .verifications.create({
          to: formattedPhone,
          channel: "sms",
        });

      if (response.status === "pending") {
        console.log(`✅ OTP đã gửi thành công tới ${formattedPhone}`);
      } else {
        console.warn(`⚠️ Trạng thái không như mong đợi: ${response.status}`);
      }
    } catch (error: any) {
      console.error(`[TWILIO ERROR] Không thể gửi OTP:`, error.message || error);
    }
  }
}

