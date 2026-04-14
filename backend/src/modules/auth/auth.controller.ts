import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Patch,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@Request() req: any): Promise<{ message: string }> {
    await this.authService.logout(req.user.id);
    return { message: 'Logout successful' };
  }

  @Post('refresh')
  async refresh(
    @Body('refreshToken') refreshToken: string,
  ): Promise<{ accessToken: string }> {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getUserProfile(req.user.id);
  }

  /**
   * Real-time account validity check.
   * Called by mobile apps on startup and periodically to detect:
   * - Deleted accounts
   * - Suspended/blocked accounts
   * Returns 200 { valid: true } or throws 401/403.
   */
  @Get('verify-account')
  @UseGuards(JwtAuthGuard)
  async verifyAccount(@Request() req: any) {
    return this.authService.verifyAccount(req.user.id, req.user.role);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req: any,
    @Body()
    {
      currentPassword,
      newPassword,
    }: { currentPassword: string; newPassword: string },
  ): Promise<{ message: string }> {
    console.log('[AuthController] changePassword called');
    console.log('[AuthController] req.user:', req.user);
    console.log('[AuthController] req.user.role:', req.user?.role);

    await this.authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword,
      req.user.role,
    );
    return { message: 'Password changed successfully' };
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(
    @Request() req: any,
    @Body() updateData: any,
  ): Promise<any> {
    return this.authService.updateProfile(req.user.id, updateData);
  }

  @Post('customer/send-otp')
  @UseGuards(JwtAuthGuard)
  async sendCustomerOtp(
    @Request() req: any,
  ): Promise<{ message: string; expires: number }> {
    return this.authService.sendCustomerPhoneOtp(req.user.id);
  }

  @Post('customer/verify-otp')
  @UseGuards(JwtAuthGuard)
  async verifyCustomerOtp(
    @Request() req: any,
    @Body() { code }: { code: string },
  ): Promise<{ message: string }> {
    return this.authService.verifyCustomerPhoneOtp(req.user.id, code);
  }

  // ==================== NEW: OTP LOGIN FLOW ====================
  @Post('customer/login-otp/send')
  async sendCustomerLoginOtp(
    @Body()
    { phone, email, name }: { phone: string; email?: string; name?: string },
  ): Promise<{ message: string; expires: number }> {
    return this.authService.sendCustomerLoginOtp(phone, email, name);
  }

  @Post('customer/login-otp/verify')
  async verifyCustomerLoginOtp(
    @Body() { phone, code }: { phone: string; code: string },
  ): Promise<AuthResponseDto> {
    return this.authService.verifyCustomerLoginOtp(phone, code);
  }

  // ==================== DRIVER OTP FLOW ====================
  @Post('driver/register-otp/send')
  async sendDriverRegisterOtp(
    @Body() { phone, email }: { phone: string; email: string },
  ): Promise<{ message: string; expires: number }> {
    return this.authService.sendDriverRegisterOtp(phone, email);
  }

  @Post('driver/register-otp/verify')
  async verifyDriverRegisterOtp(
    @Body() { phone, code }: { phone: string; code: string },
  ): Promise<{ message: string }> {
    return this.authService.verifyDriverRegisterOtp(phone, code);
  }
}
