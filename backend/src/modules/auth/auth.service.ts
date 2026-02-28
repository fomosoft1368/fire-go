import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { jwtConfig } from '../../config/app.config';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Driver.name) private driverModel: Model<DriverDocument>,
    private jwtService: JwtService,
  ) {}

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

      // Generate tokens for driver
      return this.generateTokensForDriver(driver);
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

    // Generate tokens
    return this.generateTokens(user);
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
      },
    };
  }

  private generateTokensForDriver(driver: DriverDocument): AuthResponseDto {
    const payload = {
      sub: driver._id.toString(),
      email: driver.email,
      role: 'driver',
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
    };
  }
}
