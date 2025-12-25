import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Delete, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, SavedAddressDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Controller('api/customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * POST /api/customers
   * Tạo khách hàng mới (Admin)
   */
  @Post()
  async create(@Body() createCustomerDto: CreateCustomerDto) {
    try {
      const customer = await this.customersService.create(createCustomerDto);
      
      return {
        success: true,
        message: 'Customer created successfully',
        data: customer,
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * POST /api/customers/register
   * Đăng ký tài khoản khách hàng
   */
  @Post('register')
  async register(@Body() createCustomerDto: CreateCustomerDto) {
    try {
      const customer = await this.customersService.create(createCustomerDto);
      
      // Generate JWT tokens
      const accessToken = this.jwtService.sign(
        {
          sub: customer._id,
          email: customer.email,
          role: 'customer',
        },
        {
          secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
          expiresIn: '24h',
        }
      );

      const refreshToken = this.jwtService.sign(
        {
          sub: customer._id,
          email: customer.email,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
          expiresIn: '7d',
        }
      );

      return {
        accessToken,
        refreshToken,
        user: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          role: 'customer',
          avatar: customer.avatar,
        },
      };
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  /**
   * POST /api/customers/login
   * Đăng nhập tài khoản khách hàng bằng email hoặc số điện thoại
   */
  @Post('login')
  async login(@Body() loginDto: { identifier: string; password: string }) {
    try {
      if (!loginDto.identifier || !loginDto.password) {
        throw new UnauthorizedException('Email/Phone and password are required');
      }

      const customer = await this.customersService.findByEmailOrPhone(loginDto.identifier);
      
      if (!customer) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(loginDto.password, customer.password);
      
      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Generate JWT tokens
      const accessToken = this.jwtService.sign(
        {
          sub: customer._id,
          email: customer.email,
          role: 'customer',
        },
        {
          secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
          expiresIn: '24h',
        }
      );

      const refreshToken = this.jwtService.sign(
        {
          sub: customer._id,
          email: customer.email,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
          expiresIn: '7d',
        }
      );

      return {
        accessToken,
        refreshToken,
        user: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          role: 'customer',
          avatar: customer.avatar,
        },
      };
    } catch (error: any) {
      throw new UnauthorizedException(error.message || 'Invalid email or password');
    }
  }

  /**
   * GET /api/customers
   * Lấy danh sách tất cả khách hàng
   */
  @Get()
  async findAll() {
    return this.customersService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: any) {
    return this.customersService.findById(req.user.sub);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.customersService.delete(id);
  }

  @Post(':id/saved-addresses')
  @UseGuards(JwtAuthGuard)
  async addSavedAddress(@Param('id') id: string, @Body() savedAddressDto: SavedAddressDto) {
    return this.customersService.addSavedAddress(id, savedAddressDto);
  }

  @Delete(':id/saved-addresses/:label')
  @UseGuards(JwtAuthGuard)
  async removeSavedAddress(@Param('id') id: string, @Param('label') label: string) {
    return this.customersService.removeSavedAddress(id, label);
  }

  @Post(':id/emergency-contacts')
  @UseGuards(JwtAuthGuard)
  async addEmergencyContact(
    @Param('id') id: string,
    @Body() contact: { name: string; phone: string; relationship: string },
  ) {
    return this.customersService.addEmergencyContact(id, contact);
  }

  @Delete(':id/emergency-contacts/:name')
  @UseGuards(JwtAuthGuard)
  async removeEmergencyContact(@Param('id') id: string, @Param('name') name: string) {
    return this.customersService.removeEmergencyContact(id, name);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.customersService.getStats(id);
  }
}
