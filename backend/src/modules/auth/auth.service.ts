import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Driver, DriverDocument } from '../drivers/schemas/driver.schema';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';

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
    
    // Try to find driver first (drivers are independent)
    const driver = await this.driverModel.findOne({ email: loginDto.email });

    console.log('🚗 Driver found:', !!driver);
    console.log('📋 Driver object keys:', driver ? Object.keys(driver.toObject?.() || driver) : 'null');
    console.log('🔑 Driver password value:', driver?.password);
    
    if (driver && driver.password) {
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
    const user = await this.userModel.findOne({ email: loginDto.email });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare password for user
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
          secret: process.env.JWT_SECRET || 'your-secret-key',
          expiresIn: '24h' as any,
        },
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private generateTokens(user: UserDocument): AuthResponseDto {
    const payload = {
      sub: user._id,
      email: user.email,
      role: user.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '24h' as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      expiresIn: '7d' as any,
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
      sub: driver._id,
      email: driver.email,
      role: 'driver',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_SECRET || 'your-secret-key',
      expiresIn: '24h' as any,
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
      expiresIn: '7d' as any,
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
      },
    };
  }
}
