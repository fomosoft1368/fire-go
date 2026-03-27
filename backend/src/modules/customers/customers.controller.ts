import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Delete, BadRequestException, UnauthorizedException, Query } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, SavedAddressDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Controller('customers')
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly jwtService: JwtService,
  ) {
    console.log('[CustomersController] Initialized');
  }

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
        }
      );

      const refreshToken = this.jwtService.sign(
        {
          sub: customer._id,
          email: customer.email,
        },
        {
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
      console.log('[Customers Login] Identifier:', loginDto.identifier)
      
      if (!loginDto.identifier || !loginDto.password) {
        throw new UnauthorizedException('Email/Phone and password are required');
      }

      const customer = await this.customersService.findByEmailOrPhone(loginDto.identifier);
      console.log('[Customers Login] Customer found:', {
        id: customer._id,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
      })
      
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
        }
      );

      console.log('[Customers Login] Generated access token - decoding payload:');
      try {
        const parts = accessToken.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          console.log('[Customers Login] Token payload:', payload);
        }
      } catch (e) {
        console.log('[Customers Login] Could not decode token:', e);
      }

      const refreshToken = this.jwtService.sign(
        {
          sub: customer._id,
          email: customer.email,
        },
        {
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

  @Get('search')
  async search(@Query('q') query: string) {
    if (!query || query.length < 2) {
      return [];
    }
    return this.customersService.search(query);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: any) {
    return this.customersService.findById(req.user.sub);
  }

  @Get('me/wallet')
  @UseGuards(JwtAuthGuard)
  async getMyWallet(@Request() req: any) {
    const customer = await this.customersService.findById(req.user.sub);
    return {
      walletBalance: (customer as any).walletBalance || 0,
      currency: 'VND',
    };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req: any,
    @Body() body: { currentPassword: string; newPassword: string }
  ) {
    console.log('[ChangePassword] Endpoint called!')
    console.log('[ChangePassword] Request received:', {
      method: req.method,
      path: req.path,
      headers: Object.keys(req.headers),
    })
    console.log('[ChangePassword] Request user:', {
      sub: req.user?.sub,
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
    })
    
    // Validate that this is a customer token, not a user/staff token
    if (req.user?.role !== 'customer') {
      throw new UnauthorizedException('This endpoint is only for customers. Current role: ' + req.user?.role);
    }
    
    console.log('[ChangePassword] Body:', {
      currentPassword: body.currentPassword ? '***' : 'missing',
      newPassword: body.newPassword ? '***' : 'missing',
    })
    
    return this.customersService.changePassword(
      req.user.sub,
      body.currentPassword,
      body.newPassword
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    console.log('[Patch :id] Update endpoint called with id:', id);
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
