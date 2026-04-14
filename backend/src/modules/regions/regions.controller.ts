import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { RegionsService } from './regions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/schemas/user.schema';

@Controller('regions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() createRegionDto: any) {
    return this.regionsService.create(createRegionDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.F1_LEAD)
  findAll() {
    return this.regionsService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.F1_LEAD)
  findOne(@Param('id') id: string) {
    return this.regionsService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateRegionDto: any) {
    return this.regionsService.update(id, updateRegionDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.regionsService.remove(id);
  }
}
