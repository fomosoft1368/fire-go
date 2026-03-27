import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BonusesService } from './bonuses.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('bonuses')
@UseGuards(JwtAuthGuard)
export class BonusesController {
  constructor(private readonly bonusesService: BonusesService) {}

  // ==================== Admin: Rule Management ====================

  /** GET /bonuses/rules - List all rules (admin sees all, driver sees active only) */
  @Get('rules')
  async getRules(@Request() req: any) {
    const role = req.user?.role;
    if (role === 'admin') {
      return this.bonusesService.getAllRules();
    }
    return this.bonusesService.getActiveRules();
  }

  /** POST /bonuses/rules - Admin creates a new bonus rule */
  @Post('rules')
  async createRule(@Body() body: any) {
    return this.bonusesService.createRule(body);
  }

  /** PATCH /bonuses/rules/:id - Admin updates a bonus rule */
  @Patch('rules/:id')
  async updateRule(@Param('id') id: string, @Body() body: any) {
    return this.bonusesService.updateRule(id, body);
  }

  /** DELETE /bonuses/rules/:id - Admin deletes a bonus rule */
  @Delete('rules/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRule(@Param('id') id: string) {
    await this.bonusesService.deleteRule(id);
  }

  // ==================== Driver: Progress ====================

  /** GET /bonuses/driver/progress - Driver gets own progress per active rule */
  @Get('driver/progress')
  async getDriverProgress(@Request() req: any) {
    const driverId = req.user._id || req.user.id;
    return this.bonusesService.getDriverProgress(driverId.toString());
  }

  /** GET /bonuses/driver/claims - Driver gets own claim history */
  @Get('driver/claims')
  async getDriverClaims(@Request() req: any) {
    const driverId = req.user._id || req.user.id;
    return this.bonusesService.getDriverClaims(driverId.toString());
  }

  /** POST /bonuses/driver/claims - Driver creates a claim */
  @Post('driver/claims')
  async createClaim(@Request() req: any, @Body() body: { bonusRuleId: string }) {
    const driverId = req.user._id || req.user.id;
    return this.bonusesService.createClaim(driverId.toString(), body.bonusRuleId);
  }

  // ==================== Admin: Claims Management ====================

  /** GET /bonuses/admin/claims - Admin gets all claims */
  @Get('admin/claims')
  async getAdminClaims(@Query('status') status?: string) {
    return this.bonusesService.getAdminClaims(status);
  }

  /** GET /bonuses/admin/stats - Admin gets claim statistics */
  @Get('admin/stats')
  async getAdminStats() {
    return this.bonusesService.getClaimStats();
  }

  /** PATCH /bonuses/admin/claims/:id/approve - Admin approves a claim */
  @Patch('admin/claims/:id/approve')
  async approveClaim(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user?._id?.toString() || req.user?.id;
    return this.bonusesService.approveClaim(id, adminId);
  }

  /** PATCH /bonuses/admin/claims/:id/reject - Admin rejects a claim */
  @Patch('admin/claims/:id/reject')
  async rejectClaim(
    @Param('id') id: string,
    @Body() body: { rejectionReason: string },
  ) {
    return this.bonusesService.rejectClaim(id, body.rejectionReason);
  }
}
