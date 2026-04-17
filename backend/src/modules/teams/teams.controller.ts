import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/schemas/user.schema';

@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // ─── GET /teams/dashboard ─────────────────────────────────────────────────
  // Trả về toàn bộ dữ liệu dashboard scoped theo team của người gọi
  // F1 thấy F2+F3 của mình; F2 thấy F3 của mình; F3 chỉ thấy bản thân
  @Get('dashboard')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.F1_LEAD,
    UserRole.F2_SUB_LEAD,
    UserRole.F3_STAFF_MKT,
  )
  getMyDashboard(
    @Request() req: any,
    @Query('targetUserId') targetUserId?: string,
  ) {
    const userId = req.user.sub || req.user._id;
    return this.teamsService.getMyDashboard(userId, targetUserId);
  }

  // ─── GET /teams/my-team (legacy, giữ nguyên) ─────────────────────────────
  @Get('my-team')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.F1_LEAD, UserRole.F2_SUB_LEAD)
  getMyTeam(@Request() req: any) {
    const userId = req.user.sub || req.user._id;
    return this.teamsService.getMyTeam(userId);
  }

  // ─── GET /teams/members ──────────────────────────────────────────────────
  // Danh sách thành viên trong team (có phân trang), team-scoped
  @Get('members')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.F1_LEAD,
    UserRole.F2_SUB_LEAD,
    UserRole.F3_STAFF_MKT,
  )
  getMyMembers(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('targetUserId') targetUserId?: string,
  ) {
    const userId = req.user.sub || req.user._id;
    return this.teamsService.getMyMembers(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      targetUserId
    );
  }

  // ─── GET /teams/drivers ──────────────────────────────────────────────────
  @Get('drivers')
  @Roles(
    UserRole.ADMIN,
    UserRole.STAFF,
    UserRole.F1_LEAD,
    UserRole.F2_SUB_LEAD,
    UserRole.F3_STAFF_MKT,
  )
  getMyDrivers(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('targetUserId') targetUserId?: string,
  ) {
    const userId = req.user.sub || req.user._id;
    return this.teamsService.getMyDrivers(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 50,
      targetUserId
    );
  }

  // ─── POST /teams/add-member ──────────────────────────────────────────────
  // F1 thêm F2 hoặc F3; F2 thêm F3.
  // newMemberId phải là User đã tồn tại trong DB (đã được tạo tài khoản)
  @Post('add-member')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.F1_LEAD, UserRole.F2_SUB_LEAD)
  addMember(
    @Request() req: any,
    @Body() body: { newMemberId: string; newMemberRole: string },
  ) {
    const callerId = req.user.sub || req.user._id;
    const callerRole = req.user.role;
    return this.teamsService.addMemberToMyTeam(
      callerId,
      callerRole,
      body.newMemberId,
      body.newMemberRole,
    );
  }

  // ─── GET /teams/config/marketing ──────────────────────────────────────────
  @Get('config/marketing')
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.F1_LEAD, UserRole.F2_SUB_LEAD, UserRole.F3_STAFF_MKT)
  getMarketingConfig() {
    return this.teamsService.getMarketingConfig();
  }

  // ─── PUT /teams/config/marketing ──────────────────────────────────────────
  @Put('config/marketing')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  updateMarketingConfig(@Body() body: any) {
    return this.teamsService.updateMarketingConfig(body);
  }
}
