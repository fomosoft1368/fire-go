import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtService } from '@nestjs/jwt';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
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
    // Find user by email
    const user = await this.userModel.findOne({ email: loginDto.email });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
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
}
