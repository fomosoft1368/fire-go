import { Controller, Post, Body, UseGuards, Request, Get, Patch } from '@nestjs/common';
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
  async refresh(@Body('refreshToken') refreshToken: string): Promise<{ accessToken: string }> {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: any) {
    return this.authService.getUserProfile(req.user.id);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req: any,
    @Body() { currentPassword, newPassword }: { currentPassword: string; newPassword: string },
  ): Promise<{ message: string }> {
    console.log('[AuthController] changePassword called');
    console.log('[AuthController] req.user:', req.user);
    console.log('[AuthController] req.user.role:', req.user?.role);
    
    await this.authService.changePassword(req.user.id, currentPassword, newPassword, req.user.role);
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
}
