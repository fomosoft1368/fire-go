import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { AppSettingsService } from './app-settings.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

/** Keys được phép expose công khai cho mobile apps (không phải secret) */
const PUBLIC_KEYS = ['OSRM_BASE_URL'];

@Controller('app-settings')
export class AppSettingsController {
  constructor(private readonly appSettingsService: AppSettingsService) {}

  /**
   * GET /api/app-settings/public
   * Không cần auth — trả về config an toàn cho mobile apps fetch khi khởi động
   */
  @Get('public')
  async getPublicConfig() {
    const all = await this.appSettingsService.findAll(true); // lấy giá trị thật
    const publicSettings = (all as any[])
      .filter((s) => PUBLIC_KEYS.includes(s.key))
      .map((s) => ({ key: s.key, value: s.value }));
    return { data: publicSettings };
  }

  /**
   * GET /api/app-settings
   * Cần auth admin/staff — lấy tất cả settings (secret bị mask mặc định)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  async findAll(@Query('showSecrets') showSecrets?: string) {
    const reveal = showSecrets === 'true';
    return this.appSettingsService.findAll(reveal);
  }

  /**
   * PATCH /api/app-settings/:key
   * Cần auth admin/staff — cập nhật giá trị 1 setting
   */
  @Patch(':key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff')
  async update(
    @Param('key') key: string,
    @Body() body: { value: string },
  ) {
    if (body.value === undefined || body.value === null) {
      throw new BadRequestException('value là bắt buộc');
    }
    const updated = await this.appSettingsService.upsert(key, body.value);
    await this.appSettingsService.invalidateCache();
    return {
      success: true,
      message: `Đã cập nhật ${key}`,
      data: updated,
    };
  }
}
