import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { LegalDocsService } from './legal-docs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('legal-docs')
export class LegalDocsController {
  constructor(private readonly legalDocsService: LegalDocsService) {}

  // ==================== PUBLIC ENDPOINTS ====================

  /**
   * GET /legal-docs/terms
   * Get active Terms of Service for specific user type
   */
  @Get('terms')
  async getActiveTerms(
    @Query('userType') userType: string = 'driver',
    @Query('language') language: string = 'vi',
  ) {
    return this.legalDocsService.getActiveTerms(userType, language);
  }

  /**
   * GET /legal-docs/privacy
   * Get active Privacy Policy for specific user type
   */
  @Get('privacy')
  async getActivePrivacy(
    @Query('userType') userType: string = 'driver',
    @Query('language') language: string = 'vi',
  ) {
    return this.legalDocsService.getActivePrivacy(userType, language);
  }

  // ==================== ADMIN ENDPOINTS - TERMS OF SERVICE ====================

  /**
   * GET /legal-docs/admin/terms
   * Get all Terms of Service (admin only)
   */
  @Get('admin/terms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'superadmin', 'super_admin')
  async getAllTerms() {
    return this.legalDocsService.getAllTerms();
  }

  /**
   * GET /legal-docs/admin/terms/:id
   * Get specific Terms by ID (admin only)
   */
  @Get('admin/terms/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'superadmin', 'super_admin')
  async getTermsById(@Param('id') id: string) {
    return this.legalDocsService.getTermsById(id);
  }

  /**
   * POST /legal-docs/admin/terms
   * Create new Terms of Service (admin only)
   */
  @Post('admin/terms')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'superadmin', 'super_admin')
  async createTerms(@Body() data: any, @Request() req: any) {
    return this.legalDocsService.createTerms(data, req.user?.userId);
  }

  /**
   * PUT /legal-docs/admin/terms/:id
   * Update Terms of Service (admin only)
   */
  @Put('admin/terms/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'superadmin', 'super_admin')
  async updateTerms(
    @Param('id') id: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.legalDocsService.updateTerms(id, data, req.user?.userId);
  }

  /**
   * DELETE /legal-docs/admin/terms/:id
   * Delete Terms of Service (admin only)
   */
  @Delete('admin/terms/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'superadmin', 'super_admin')
  async deleteTerms(@Param('id') id: string) {
    await this.legalDocsService.deleteTerms(id);
    return { success: true, message: 'Terms of Service deleted successfully' };
  }

  // ==================== ADMIN ENDPOINTS - PRIVACY POLICY ====================

  /**
   * GET /legal-docs/admin/privacy
   * Get all Privacy Policies (admin only)
   */
  @Get('admin/privacy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'superadmin', 'super_admin')
  async getAllPrivacy() {
    return this.legalDocsService.getAllPrivacy();
  }

  /**
   * GET /legal-docs/admin/privacy/:id
   * Get specific Privacy Policy by ID (admin only)
   */
  @Get('admin/privacy/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'superadmin', 'super_admin')
  async getPrivacyById(@Param('id') id: string) {
    return this.legalDocsService.getPrivacyById(id);
  }

  /**
   * POST /legal-docs/admin/privacy
   * Create new Privacy Policy (admin only)
   */
  @Post('admin/privacy')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'superadmin', 'super_admin')
  async createPrivacy(@Body() data: any, @Request() req: any) {
    return this.legalDocsService.createPrivacy(data, req.user?.userId);
  }

  /**
   * PUT /legal-docs/admin/privacy/:id
   * Update Privacy Policy (admin only)
   */
  @Put('admin/privacy/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'superadmin', 'super_admin')
  async updatePrivacy(
    @Param('id') id: string,
    @Body() data: any,
    @Request() req: any,
  ) {
    return this.legalDocsService.updatePrivacy(id, data, req.user?.userId);
  }

  /**
   * DELETE /legal-docs/admin/privacy/:id
   * Delete Privacy Policy (admin only)
   */
  @Delete('admin/privacy/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'staff', 'superadmin', 'super_admin')
  async deletePrivacy(@Param('id') id: string) {
    await this.legalDocsService.deletePrivacy(id);
    return { success: true, message: 'Privacy Policy deleted successfully' };
  }
}
