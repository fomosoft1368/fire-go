import { Controller, Post, Body, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, AuthResponseDto } from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('api/auth')
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
  getProfile(@Request() req: any) {
    return req.user;
  }
}
