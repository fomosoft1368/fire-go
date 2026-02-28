import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  Query,
  HttpCode,
  BadRequestException,
} from '@nestjs/common'
import { AddonServiceService } from '../services/addon-service.service'
import { CreateAddonServiceDto, UpdateAddonServiceDto } from '../dto/create-addon-service.dto'

@Controller('api/addon-services')
export class AddonServiceController {
  constructor(private readonly addonServiceService: AddonServiceService) {}

  /**
   * Create new addon service
   * POST /api/addon-services
   */
  @Post()
  @HttpCode(201)
  async create(@Body() createDto: CreateAddonServiceDto) {
    try {
      console.log('[AddonServiceController] Creating addon service:', createDto)
      const service = await this.addonServiceService.create(createDto)

      return {
        success: true,
        message: 'Addon service created successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[AddonServiceController] Error creating service:', error)
      throw new BadRequestException(error.message || 'Failed to create addon service')
    }
  }

  /**
   * Get all addon services
   * GET /api/addon-services?status=active&skip=0&limit=100
   */
  @Get()
  async findAll(
    @Query('status') status?: string,
    @Query('skip') skip: string = '0',
    @Query('limit') limit: string = '100',
  ) {
    try {
      const skipNum = parseInt(skip) || 0
      const limitNum = parseInt(limit) || 100

      const services = await this.addonServiceService.findAll(status, skipNum, limitNum)
      const total = await this.addonServiceService.count(status)

      return {
        success: true,
        message: 'Addon services retrieved successfully',
        data: services,
        total,
        skip: skipNum,
        limit: limitNum,
      }
    } catch (error: any) {
      console.error('[AddonServiceController] Error fetching services:', error)
      throw new BadRequestException(error.message || 'Failed to fetch addon services')
    }
  }

  /**
   * Get active addon services
   * GET /api/addon-services/active?skip=0&limit=100
   */
  @Get('active')
  async findActive(@Query('skip') skip: string = '0', @Query('limit') limit: string = '100') {
    try {
      const skipNum = parseInt(skip) || 0
      const limitNum = parseInt(limit) || 100

      const services = await this.addonServiceService.findActive(skipNum, limitNum)
      const total = await this.addonServiceService.count('active')

      return {
        success: true,
        message: 'Active addon services retrieved successfully',
        data: services,
        total,
        skip: skipNum,
        limit: limitNum,
      }
    } catch (error: any) {
      console.error('[AddonServiceController] Error fetching active services:', error)
      throw new BadRequestException(error.message || 'Failed to fetch active addon services')
    }
  }

  /**
   * Get addon service by ID
   * GET /api/addon-services/:id
   */
  @Get(':id')
  async findById(@Param('id') id: string) {
    try {
      const service = await this.addonServiceService.findById(id)

      if (!service) {
        throw new BadRequestException('Addon service not found')
      }

      return {
        success: true,
        message: 'Addon service retrieved successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[AddonServiceController] Error fetching service:', error)
      throw new BadRequestException(error.message || 'Failed to fetch addon service')
    }
  }

  /**
   * Update addon service
   * PATCH /api/addon-services/:id
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateAddonServiceDto) {
    try {
      console.log('[AddonServiceController] Updating addon service:', id, updateDto)
      const service = await this.addonServiceService.update(id, updateDto)

      if (!service) {
        throw new BadRequestException('Addon service not found')
      }

      return {
        success: true,
        message: 'Addon service updated successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[AddonServiceController] Error updating service:', error)
      throw new BadRequestException(error.message || 'Failed to update addon service')
    }
  }

  /**
   * Toggle addon service status
   * PATCH /api/addon-services/:id/toggle-status
   */
  @Patch(':id/toggle-status')
  async toggleStatus(@Param('id') id: string) {
    try {
      console.log('[AddonServiceController] Toggling status for addon service:', id)
      const service = await this.addonServiceService.toggleStatus(id)

      if (!service) {
        throw new BadRequestException('Addon service not found')
      }

      return {
        success: true,
        message: 'Addon service status toggled successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[AddonServiceController] Error toggling status:', error)
      throw new BadRequestException(error.message || 'Failed to toggle addon service status')
    }
  }

  /**
   * Delete addon service
   * DELETE /api/addon-services/:id
   */
  @Delete(':id')
  async delete(@Param('id') id: string) {
    try {
      console.log('[AddonServiceController] Deleting addon service:', id)
      const service = await this.addonServiceService.delete(id)

      if (!service) {
        throw new BadRequestException('Addon service not found')
      }

      return {
        success: true,
        message: 'Addon service deleted successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[AddonServiceController] Error deleting service:', error)
      throw new BadRequestException(error.message || 'Failed to delete addon service')
    }
  }
}
