import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/schemas/user.schema';

@Controller('teams')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get('my-team')
  @Roles(UserRole.ADMIN, UserRole.F1_LEAD, UserRole.F2_SUB_LEAD)
  getMyTeam(@Request() req: any) {
    const userId = req.user.sub || req.user._id;
    return this.teamsService.getMyTeam(userId);
  }
}
