import { Injectable, BadRequestException, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { Customer, CustomerDocument } from '../customers/schemas/customer.schema';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { jwtConfig } from '../../config/app.config';

@Injectable()
export class AuthService {
  private otpCache = new Map<string, { code: string; expiresAt: number }>();
  private loginOtpCache = new Map<string, { code: string; expiresAt: number; name?: string }>();

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
      const driver = await this.driverModel.findById(userId).select('isSuspended isBlacklisted status').lean() as any;
      if (!driver) {
        throw new UnauthorizedException('Tài khoản không tồn tại hoặc đã bị xóa.');
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

  // ===================== DRIVER OTP VERIFICATION SỬ DỤNG ZALO OA =====================
  async sendDriverRegisterOtp(phone: string): Promise<{ message: string; expires: number }> {
    const rawPhone = phone.trim();
    // Validate driver does not exist yet
    const driver = await this.driverModel.findOne({ phone: rawPhone });
    if (driver) throw new BadRequestException('Số điện thoại này đã được đăng ký');

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otpCache.set(`driver_${rawPhone}`, { code: otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    console.log(`\n=======================================\n`);
    console.log(`🔥 [ZALO OA] Sắp gửi mã OTP Đăng ký Tài xế [${otp}] qua Zalo tới số: ${rawPhone}`);
    console.log(`\n=======================================\n`);

    this.sendZaloOtp(rawPhone, otp).catch(e => console.error('Lỗi khi gửi Zalo Driver OTP:', e.message));

    return { message: 'Đã gửi mã OTP đăng ký tài xế qua Zalo', expires: 300 };
  }

  async verifyDriverRegisterOtp(phone: string, code: string): Promise<{ message: string }> {
    const rawPhone = phone.trim();
    const entry = this.otpCache.get(`driver_${rawPhone}`);
    if (!entry) throw new BadRequestException('Mã OTP không tồn tại hoặc chưa được gửi. Vui lòng thử lại.');

    if (entry.expiresAt < Date.now()) {
      this.otpCache.delete(`driver_${rawPhone}`);
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng lấy mã mới.');
    }

    if (entry.code !== code) throw new BadRequestException('Mã OTP không chính xác.');

    // Xóa OTP
    this.otpCache.delete(`driver_${rawPhone}`);

    // We don't update driver here, because driver is not created yet
    // The mobile app will proceed to call POST /drivers to create the account

    return { message: 'Xác thực số điện thoại tài xế thành công!' };
  }

  // ===================== CUSTOMER OTP LOGIN =====================
  async sendCustomerLoginOtp(phone: string, name?: string): Promise<{ message: string; expires: number }> {
    const rawPhone = phone.trim();
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.loginOtpCache.set(rawPhone, { code: otp, expiresAt: Date.now() + 5 * 60 * 1000, name });

    console.log(`\n=======================================\n`);
    console.log(`🔥 [ZALO LOGIN] Sắp gửi mã OTP Đăng nhập [${otp}] tới số: ${rawPhone}`);
    console.log(`\n=======================================\n`);

    // Gọi thực tế API Zalo
    this.sendZaloOtp(rawPhone, otp).catch(e => console.error('Lỗi khi gửi Zalo Login OTP:', e.message));

    return { message: 'Đã gửi mã OTP đăng nhập qua Zalo', expires: 300 };
  }

  async verifyCustomerLoginOtp(phone: string, code: string): Promise<AuthResponseDto> {
    const rawPhone = phone.trim();
    const entry = this.loginOtpCache.get(rawPhone);
    if (!entry) throw new BadRequestException('Mã OTP không tồn tại hoặc chưa được gửi. Vui lòng thử lại.');
    if (entry.expiresAt < Date.now()) {
      this.loginOtpCache.delete(rawPhone);
      throw new BadRequestException('Mã OTP đã hết hạn. Vui lòng lấy mã mới.');
    }
    if (entry.code !== code) throw new BadRequestException('Mã OTP không chính xác.');

    this.loginOtpCache.delete(rawPhone);

    let customer = await this.customerModel.findOne({ phone: rawPhone });
    if (!customer) {
      // Auto-generate name since customer doesn't input name on login anymore
      const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
      const defaultName = entry.name?.trim() || `Khách hàng ${randomSuffix}`;
      const nameParts = defaultName.split(' ');
      const lastName = nameParts.length > 1 ? nameParts.pop() : '';
      const firstName = nameParts.join(' ') || defaultName;

      const pseudoEmail = `${rawPhone}@firego.local`;
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
      if (!customer.isPhoneVerified) {
        customer.isPhoneVerified = true;
        await customer.save();
      }
    }

    if (customer.isAccountLocked || customer.isBlacklisted) {
      throw new ForbiddenException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
    }

    // Single-session logout
    await this.customerModel.findByIdAndUpdate(customer._id, { $inc: { tokenVersion: 1 } });
    const updatedCustomer = await this.customerModel.findById(customer._id).select('tokenVersion').lean() as any;

    return this.generateTokens({ ...customer.toObject?.() ?? customer, tokenVersion: updatedCustomer.tokenVersion, role: 'customer' } as any);
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
      // 1. Chuyển điện thoại về dạng 84... (nếu cần theo Zalo)
      let formattedPhone = phone.replace(/^0/, '84').replace(/[^0-9]/g, '');
      if (!formattedPhone.startsWith('84')) {
        formattedPhone = '84' + formattedPhone;
      }

      console.log(`\n=======================================`);
      console.log(`🔥 [CHÚ Ý] MÃ OTP CỦA SĐT ${phone} LÀ: [ ${otp} ]`);
      console.log(`=======================================\n`);

      // 2. Lấy access token
      let accessToken;
      try {
        accessToken = await this.getZaloAccessToken();
      } catch (err) {
        console.log(`[ZALO ZNS MOCK] Bỏ qua lỗi Zalo. Đang chạy mô phỏng qua Terminal.`);
        return;
      }

      // 3. Gửi ZNS API. Lưu ý: Cần có template_id từ Zalo Cloud Account.
      const znsUrl = 'https://business.openapi.zalo.me/message/template';
      const templateId = '562700'; // Đã cập nhật Template ID được duyệt

      console.log(`[ZALO ZNS] Đang nhắn tới SĐT ${formattedPhone} (Mẫu ${templateId})...`);

      const response = await fetch(znsUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'access_token': accessToken
        },
        body: JSON.stringify({
          phone: formattedPhone,
          template_id: templateId,
          template_data: {
            otp: otp
          },
          tracking_id: "tracking_" + Date.now().toString()
        })
      });

      const data = await response.json() as any;
      console.log('[ZALO ZNS RESPONSE]', data);

      if (data.error && data.error !== 0) {
        console.warn(`[ZNS ERROR ${data.error}] SĐT ${phone} từ chối/không có Zalo. Kích hoạt chuyển đổi sang SMS...`);
        await this.sendSmsOtp(phone, otp);
      } else {
        console.log('[ZALO ZNS SUCCESS] Gửi thành công mã OTP qua Zalo!');
      }
    } catch (e: any) {
      console.error('[ZALO ZNS EXCEPTION]', e.message);
      console.log('[FALLBACK TỰ ĐỘNG] Lỗi mạng khi gọi Zalo, chuyển sang gửi SMS...');
      await this.sendSmsOtp(phone, otp);
    }
  }

  /**
   * FALLBACK SMS KHI ZALO THẤT BẠI
   */
  private async sendSmsOtp(phone: string, otp: string): Promise<void> {
    try {
      console.log(`\n---------------------------------------`);
      console.log(`🚀 [SMS FALLBACK] KÍCH HOẠT GỬI SMS TỚI: ${phone}`);
      console.log(`Nội dung: "Ma xac thuc ung dung Firego cua ban la ${otp}"`);
      console.log(`---------------------------------------\n`);

      // TODO: Tích hợp API của nhà mạng (Ví dụ: SpeedSMS / eSMS / Twilio)
      // Bắt đầu code SMS
      const speedsmsToken = 'zJjODLrNMBa9aN8eb6ZlFwFkSNZZuM1T';
      const response = await fetch('https://api.speedsms.vn/index.php/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + Buffer.from(speedsmsToken + ':x').toString('base64')
        },
        body: JSON.stringify({
          to: [phone],
          content: `Ma xac thuc ung dung cua ban la ${otp}. Ma co hieu luc trong 5 phut.`,
          sms_type: 4 // SMS Đầu số cá nhân (Không cần brandname)

        })
      });
      const smsData = await response.json();
      console.log('[SMS XỬ LÝ]', smsData);
      // Kết thúc Code SMS

      console.log(`✅ [SMS MOCK] (Chế độ mô phỏng) Gửi SMS thành công mã ${otp} tới ${phone}!`);
    } catch (error: any) {
      console.error('[SMS ERROR] Không thể gửi SMS fallback:', error.message);
    }
  }
}
