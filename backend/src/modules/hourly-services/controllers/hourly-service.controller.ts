import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  Query,
  HttpCode,
} from '@nestjs/common'
import { HourlyServiceService } from '../services/hourly-service.service'
import {
  CreateHourlyServiceDto,
  UpdateHourlyServiceDto,
  RateHourlyServiceDto,
  GetPricingDto,
} from '../dto/create-hourly-service.dto'
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard'
import { DriversService } from '../../drivers/drivers.service'
import { PushNotificationService } from '../../notifications/push-notification.service'
import { NotificationType } from '../../notifications/schemas/notification.schema'

@Controller('hourly-services')
@UseGuards(JwtAuthGuard)
export class HourlyServiceController {
  constructor(
    private readonly hourlyServiceService: HourlyServiceService,
    private readonly driversService: DriversService,
    private readonly pushService: PushNotificationService,
  ) {}

  /**
   * Create new hourly service
   * POST /api/hourly-services
   */
  @Post()
  @HttpCode(201)
  async create(@Body() createDto: CreateHourlyServiceDto, @Request() req: any) {
    try {
      console.log('[HourlyServiceController] Creating service:', createDto)

      // Set customerId from JWT token if not provided
      if (!createDto.customerId && req.user?.id) {
        createDto.customerId = req.user.id
      }

      const service = await this.hourlyServiceService.create(createDto)

      return {
        success: true,
        message: 'Service created successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error creating service:', error)
      return {
        success: false,
        message: error.message || 'Failed to create service',
        error: error.message,
      }
    }
  }

  /**
   * Get all services
   * GET /api/hourly-services?status=pending&limit=100&skip=0
   */
  @Get()
  async getAllServices(
    @Query('status') status?: string,
    @Query('limit') limit: string = '100',
    @Query('skip') skip: string = '0',
  ) {
    try {
      const limitNum = parseInt(limit) || 100
      const skipNum = parseInt(skip) || 0

      const services = await this.hourlyServiceService.findAll(status, limitNum, skipNum)

      return {
        success: true,
        message: 'Services retrieved successfully',
        data: services,
        total: services.length,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error fetching all services:', error)
      return {
        success: false,
        message: error.message || 'Failed to fetch services',
        error: error.message,
      }
    }
  }

  /**
   * Get my services
   * GET /api/hourly-services/my-services
   */
  @Get('my-services')
  async getMyServices(@Request() req: any) {
    try {
      const customerId = req.user?.id
      if (!customerId) {
        return {
          success: false,
          message: 'User not authenticated',
        }
      }

      const services = await this.hourlyServiceService.findByCustomerId(customerId)

      return {
        success: true,
        message: 'Services retrieved successfully',
        data: services,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error fetching services:', error)
      return {
        success: false,
        message: error.message || 'Failed to fetch services',
        error: error.message,
      }
    }
  }

  /**
   * Get pending services
   * GET /api/hourly-services/pending
   */
  @Get('pending')
  async getPendingServices(@Query('limit') limit: string = '20', @Query('skip') skip: string = '0') {
    try {
      const limitNum = parseInt(limit) || 20
      const skipNum = parseInt(skip) || 0

      const services = await this.hourlyServiceService.findPending(limitNum, skipNum)

      return {
        success: true,
        message: 'Pending services retrieved successfully',
        data: services,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error fetching pending services:', error)
      return {
        success: false,
        message: error.message || 'Failed to fetch pending services',
        error: error.message,
      }
    }
  }

  /**
   * Get statistics
   * GET /api/hourly-services/statistics
   */
  @Get('statistics')
  async getStatistics() {
    try {
      const stats = await this.hourlyServiceService.getStatistics()

      return {
        success: true,
        message: 'Statistics retrieved successfully',
        data: stats,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error getting statistics:', error)
      return {
        success: false,
        message: error.message || 'Failed to get statistics',
        error: error.message,
      }
    }
  }

  /**
   * Get worker's services (for driver)
   * GET /api/hourly-services/worker-services
   */
  @Get('worker-services')
  async getWorkerServices(@Request() req: any, @Query('status') status?: string) {
    try {
      const workerId = req.user?.id
      if (!workerId) {
        return {
          success: false,
          message: 'User not authenticated',
        }
      }

      console.log('[HourlyServiceController] Fetching services for worker:', workerId, 'status:', status)

      const services = await this.hourlyServiceService.findByWorkerId(workerId, status)

      return {
        success: true,
        message: 'Services retrieved successfully',
        data: services,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error fetching worker services:', error)
      return {
        success: false,
        message: error.message || 'Failed to fetch services',
        error: error.message,
      }
    }
  }

  /**
   * Get service detail
   * GET /api/hourly-services/:id
   */
  @Get(':id')
  async getServiceDetail(@Param('id') id: string) {
    try {
      const service = await this.hourlyServiceService.findById(id)

      return {
        success: true,
        message: 'Service retrieved successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error fetching service:', error)
      return {
        success: false,
        message: error.message || 'Failed to fetch service',
        error: error.message,
      }
    }
  }

  /**
   * Assign worker to service
   * PATCH /api/hourly-services/:id/assign-worker
   */
  @Patch(':id/assign-worker')
  async assignWorker(@Param('id') id: string, @Body() body: { workerId: string }, @Request() req: any) {
    try {
      // Use workerId from body or from JWT token
      const workerId = body.workerId || req.user?.id

      if (!workerId) {
        return {
          success: false,
          message: 'Worker ID is required',
        }
      }

      // ✅ Check if driver is busy with ANY service
      const busyDriverIds = await this.driversService.getBusyDriverIds()
      if (busyDriverIds.includes(workerId)) {
        return {
          success: false,
          message: 'Tài xế đang bận với một dịch vụ khác. Vui lòng chọn tài xế khác.',
        }
      }

      const service = await this.hourlyServiceService.update(id, {
        workerId: workerId,
        status: 'confirmed',
      })

      // 📣 Notify customer: driver accepted
      const customerId = (service as any).customerId?._id?.toString() || (service as any).customerId?.toString()
      if (customerId) {
        // Get worker name
        const worker = await this.driversService.findById(workerId).catch(() => null)
        const workerName = worker ? `${(worker as any).firstName || ''} ${(worker as any).lastName || ''}`.trim() : 'Tài xế'
        this.pushService.notifyCustomer(
          customerId,
          '👍 Dịch vụ đã được xác nhận!',
          `${workerName} đã nhận dịch vụ theo giờ của bạn`,
          NotificationType.HOURLY_ACCEPTED,
          { type: 'HOURLY_ACCEPTED', serviceId: id },
        ).catch(() => {})
      }

      return {
        success: true,
        message: 'Worker assigned successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error assigning worker:', error)
      return {
        success: false,
        message: error.message || 'Failed to assign worker',
        error: error.message,
      }
    }
  }

  /**
   * Cancel service
   * PATCH /api/hourly-services/:id/cancel
   */
  @Patch(':id/cancel')
  async cancelService(@Param('id') id: string, @Body() body: { cancelReason: string }, @Request() req: any) {
    try {
      const service = await this.hourlyServiceService.cancel(id, body.cancelReason)

      // 📣 Notify the other party
      const customerId = (service as any).customerId?._id?.toString() || (service as any).customerId?.toString()
      const workerId = (service as any).workerId?._id?.toString() || (service as any).workerId?.toString()
      const cancelledByDriver = req.user?.role === 'driver'

      if (cancelledByDriver && customerId) {
        this.pushService.notifyCustomer(
          customerId,
          '❌ Dịch vụ bị hủy',
          'Tài xế đã hủy dịch vụ theo giờ của bạn',
          NotificationType.HOURLY_CANCELLED,
          { type: 'HOURLY_CANCELLED', serviceId: id },
        ).catch(() => {})
      } else if (!cancelledByDriver && workerId) {
        this.pushService.notifyDriver(
          workerId,
          '❌ Dịch vụ bị hủy',
          'Khách hàng đã hủy dịch vụ theo giờ',
          NotificationType.HOURLY_CANCELLED,
          { type: 'HOURLY_CANCELLED', serviceId: id },
        ).catch(() => {})
      }

      return {
        success: true,
        message: 'Service cancelled successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error cancelling service:', error)
      return {
        success: false,
        message: error.message || 'Failed to cancel service',
        error: error.message,
      }
    }
  }

  /**
   * Update service
   * PATCH /api/hourly-services/:id
   */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateDto: UpdateHourlyServiceDto) {
    try {
      const service = await this.hourlyServiceService.update(id, updateDto)

      // 📣 Notify on key status changes
      const customerId = (service as any).customerId?._id?.toString() || (service as any).customerId?.toString()
      const workerId = (service as any).workerId?._id?.toString() || (service as any).workerId?.toString()

      if (updateDto.status === 'in_progress' && customerId) {
        this.pushService.notifyCustomer(
          customerId,
          '🚀 Dịch vụ đã bắt đầu!',
          'Tài xế đang thực hiện dịch vụ cho bạn',
          NotificationType.HOURLY_STARTED,
          { type: 'HOURLY_STARTED', serviceId: id },
        ).catch(() => {})
      } else if (updateDto.status === 'completed') {
        if (customerId) {
          this.pushService.notifyCustomer(
            customerId,
            '✅ Dịch vụ hoàn thành!',
            'Dịch vụ theo giờ đã hoàn thành. Cảm ơn bạn!',
            NotificationType.HOURLY_COMPLETED,
            { type: 'HOURLY_COMPLETED', serviceId: id },
          ).catch(() => {})
        }
        if (workerId) {
          this.pushService.notifyDriver(
            workerId,
            '✅ Hoàn thành dịch vụ!',
            'Dịch vụ theo giờ đã hoàn thành',
            NotificationType.HOURLY_COMPLETED,
            { type: 'HOURLY_COMPLETED', serviceId: id },
          ).catch(() => {})
        }
      } else if (updateDto.status === 'driver_arrived' && customerId) {
        this.pushService.notifyCustomer(
          customerId,
          '📍 Tài xế đã đến!',
          'Tài xế đã đến địa điểm của bạn',
          NotificationType.HOURLY_DRIVER_ARRIVED,
          { type: 'HOURLY_DRIVER_ARRIVED', serviceId: id },
        ).catch(() => {})
      }

      return {
        success: true,
        message: 'Service updated successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error updating service:', error)
      return {
        success: false,
        message: error.message || 'Failed to update service',
        error: error.message,
      }
    }
  }

  /**
   * Rate service
   * POST /api/hourly-services/:id/rate
   */
  @Post(':id/rate')
  async rateService(@Param('id') id: string, @Body() rateDto: RateHourlyServiceDto) {
    try {
      const service = await this.hourlyServiceService.rate(id, rateDto)

      return {
        success: true,
        message: 'Service rated successfully',
        data: service,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error rating service:', error)
      return {
        success: false,
        message: error.message || 'Failed to rate service',
        error: error.message,
      }
    }
  }

  /**
   * Get pricing
   * POST /api/hourly-services/pricing
   */
  @Post('pricing')
  async getPricing(@Body() pricingDto: GetPricingDto) {
    try {
      const pricing = await this.hourlyServiceService.getPricing(pricingDto)

      return {
        success: true,
        message: 'Pricing calculated successfully',
        data: pricing,
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error getting pricing:', error)
      return {
        success: false,
        message: error.message || 'Failed to get pricing',
        error: error.message,
      }
    }
  }

  /**
   * Delete service (admin only)
   * DELETE /api/hourly-services/:id
   */
  @Delete(':id')
  async deleteService(@Param('id') id: string) {
    try {
      await this.hourlyServiceService.delete(id)

      return {
        success: true,
        message: 'Service deleted successfully',
      }
    } catch (error: any) {
      console.error('[HourlyServiceController] Error deleting service:', error)
      return {
        success: false,
        message: error.message || 'Failed to delete service',
        error: error.message,
      }
    }
  }
}
