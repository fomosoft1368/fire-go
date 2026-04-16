import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  HourlyService,
  HourlyServiceDocument,
} from '../schemas/hourly-service.schema';
import {
  CreateHourlyServiceDto,
  UpdateHourlyServiceDto,
  RateHourlyServiceDto,
  GetPricingDto,
} from '../dto/create-hourly-service.dto';
import { Driver } from '../../drivers/schemas/driver.schema';
import { PricingConfig } from '../../pricing/pricing-config.schema';
import { TeamsService } from '../../teams/teams.service';

@Injectable()
export class HourlyServiceService {
  constructor(
    @InjectModel(HourlyService.name)
    private hourlyServiceModel: Model<HourlyServiceDocument>,
    @InjectModel(Driver.name) private driverModel: Model<Driver>,
    @InjectModel('PricingConfig')
    private pricingConfigModel: Model<PricingConfig>,
    private teamsService: TeamsService,
  ) {}

  /**
   * Create a new hourly service
   */
  async create(createDto: CreateHourlyServiceDto): Promise<HourlyService> {
    try {
      // Validate required fields
      if (!createDto.customerId || !createDto.address || !createDto.hours) {
        throw new BadRequestException(
          'Missing required fields: customerId, address, hours',
        );
      }

      const newService = new this.hourlyServiceModel({
        customerId: createDto.customerId,
        hours: createDto.hours,
        selectedDate: createDto.selectedDate,
        selectedTime: createDto.selectedTime,
        address: createDto.address,
        notes: createDto.notes || '',
        services: createDto.services || [],
        estimatedPrice: createDto.estimatedPrice,
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        status: 'pending',
      });

      const savedService = await newService.save();
      console.log('[HourlyServiceService] Service created:', savedService._id);

      return savedService;
    } catch (error) {
      console.error('[HourlyServiceService] Error creating service:', error);
      throw error;
    }
  }

  /**
   * Get all services for a customer
   */
  async findByCustomerId(customerId: string): Promise<HourlyService[]> {
    try {
      const services = await this.hourlyServiceModel
        .find({ customerId })
        .sort({ createdAt: -1 })
        .populate('customerId', 'firstName lastName email phone avatar')
        .populate('workerId', 'firstName lastName email phone avatar')
        .exec();

      return services;
    } catch (error) {
      console.error('[HourlyServiceService] Error finding services:', error);
      throw error;
    }
  }

  /**
   * Get service detail by ID
   */
  async findById(id: string): Promise<HourlyService> {
    try {
      const service = await this.hourlyServiceModel
        .findById(id)
        .populate('customerId', 'firstName lastName email phone avatar')
        .populate('workerId', 'firstName lastName email phone avatar')
        .exec();

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      return service;
    } catch (error) {
      console.error('[HourlyServiceService] Error finding service:', error);
      throw error;
    }
  }

  /**
   * Get all services with filters
   */
  async findAll(
    status?: string,
    limit: number = 100,
    skip: number = 0,
  ): Promise<HourlyService[]> {
    try {
      const query: any = {};
      if (status && status !== 'all') {
        query.status = status;
      }

      const services = await this.hourlyServiceModel
        .find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('customerId', 'firstName lastName email phone avatar')
        .populate('workerId', 'firstName lastName email phone avatar')
        .exec();

      return services;
    } catch (error) {
      console.error(
        '[HourlyServiceService] Error finding all services:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get all services for a specific worker (driver)
   */
  async findByWorkerId(
    workerId: string,
    status?: string,
  ): Promise<HourlyService[]> {
    try {
      const query: any = { workerId };
      if (status && status !== 'all') {
        query.status = status;
      }

      console.log(
        '[HourlyServiceService] Finding services for workerId:',
        workerId,
        'with query:',
        query,
      );

      const services = await this.hourlyServiceModel
        .find(query)
        .sort({ createdAt: -1 })
        .populate('customerId', 'firstName lastName email phone avatar')
        .populate('workerId', 'firstName lastName email phone avatar')
        .exec();

      console.log('[HourlyServiceService] Found services:', services.length);

      return services;
    } catch (error) {
      console.error(
        '[HourlyServiceService] Error finding services by workerId:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get all pending services
   */
  async findPending(
    limit: number = 20,
    skip: number = 0,
  ): Promise<HourlyService[]> {
    try {
      const services = await this.hourlyServiceModel
        .find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .populate('customerId', 'firstName lastName email phone avatar')
        .populate('workerId', 'firstName lastName email phone avatar')
        .exec();

      return services;
    } catch (error) {
      console.error(
        '[HourlyServiceService] Error finding pending services:',
        error,
      );
      throw error;
    }
  }

  /**
   * Update service
   */
  async update(
    id: string,
    updateDto: UpdateHourlyServiceDto,
  ): Promise<HourlyService> {
    try {
      const service = await this.hourlyServiceModel
        .findByIdAndUpdate(id, updateDto, { new: true })
        .populate('customerId', 'firstName lastName email phone avatar')
        .populate('workerId', 'firstName lastName email phone avatar')
        .exec();

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      // Handle commission and wallet deduction when service completes
      if (updateDto.status === 'completed' && service.workerId) {
        const driverId = typeof service.workerId === 'object' ? (service.workerId as any)._id : service.workerId;
        
        try {
          const pricingConfigs = await this.pricingConfigModel.find({}).limit(1);
          const driverShare = pricingConfigs?.[0]?.driverShare || 80;
          const estimatedPrice = service.actualPrice || service.estimatedPrice || 0;
          const platformCommission = Math.round((estimatedPrice * (100 - driverShare)) / 100);

          if (platformCommission > 0) {
             // Deduct waller balance
             await this.driverModel.findByIdAndUpdate(driverId, {
               $inc: { walletBalance: -platformCommission },
               isAvailable: true, // Make driver available again
             });
             console.log(`[HourlyService] ✅ Deducted ${platformCommission}đ from driver ${driverId} (${100 - driverShare}% commission)`);

             // Process marketing commission (Teams) using the 50/50 rule
             try {
                await this.teamsService.processMarketingCommission(
                  driverId.toString(),
                  id,
                  platformCommission
                );
                console.log(`[HourlyService] ✅ Calculated Marketing Team Commission (Platform Fee: ${platformCommission}đ)`);
             } catch (marketingErr) {
                console.warn(`[HourlyService] ⚠️ Marketing Commission Error: ${marketingErr.message}`);
             }
          } else {
             // Just make driver available again if no commission
             await this.driverModel.findByIdAndUpdate(driverId, {
               isAvailable: true,
             });
          }
        } catch (walletErr) {
          console.warn(`[HourlyService] ⚠️ Wallet processing error: ${walletErr.message}`);
        }
      }

      return service;
    } catch (error) {
      console.error('[HourlyServiceService] Error updating service:', error);
      throw error;
    }
  }

  /**
   * Cancel service
   */
  async cancel(id: string, cancelReason: string): Promise<HourlyService> {
    try {
      const service = await this.hourlyServiceModel
        .findByIdAndUpdate(
          id,
          {
            status: 'cancelled',
            cancelReason,
            cancelledTime: new Date(),
          },
          { new: true },
        )
        .exec();

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      return service;
    } catch (error) {
      console.error('[HourlyServiceService] Error cancelling service:', error);
      throw error;
    }
  }

  /**
   * Rate service
   */
  async rate(
    id: string,
    rateDto: RateHourlyServiceDto,
  ): Promise<HourlyService> {
    try {
      const service = await this.hourlyServiceModel
        .findByIdAndUpdate(
          id,
          {
            rating: rateDto.rating,
            comment: rateDto.comment,
            feedback: rateDto.feedback,
          },
          { new: true },
        )
        .exec();

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      return service;
    } catch (error) {
      console.error('[HourlyServiceService] Error rating service:', error);
      throw error;
    }
  }

  /**
   * Get pricing
   */
  async getPricing(
    pricingDto: GetPricingDto,
  ): Promise<{ basePrice: number; addOnPrice: number; totalPrice: number }> {
    try {
      // Base price: 250,000đ per hour
      const basePrice = pricingDto.hours * 250000;

      // Calculate add-on prices if provided
      let addOnPrice = 0;
      if (pricingDto.addOns && pricingDto.addOns.length > 0) {
        // Example pricing for add-ons
        const addOnPrices: { [key: string]: number } = {
          sofa: 250000,
          curtains: 150000,
          kitchen: 100000,
        };

        addOnPrice = pricingDto.addOns.reduce((sum, addOn) => {
          return sum + (addOnPrices[addOn] || 0);
        }, 0);
      }

      const totalPrice = basePrice + addOnPrice;

      return {
        basePrice,
        addOnPrice,
        totalPrice,
      };
    } catch (error) {
      console.error('[HourlyServiceService] Error calculating pricing:', error);
      throw error;
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalServices: number;
    pendingServices: number;
    completedServices: number;
    cancelledServices: number;
    totalRevenue: number;
  }> {
    try {
      const [
        totalServices,
        pendingServices,
        completedServices,
        cancelledServices,
      ] = await Promise.all([
        this.hourlyServiceModel.countDocuments(),
        this.hourlyServiceModel.countDocuments({ status: 'pending' }),
        this.hourlyServiceModel.countDocuments({ status: 'completed' }),
        this.hourlyServiceModel.countDocuments({ status: 'cancelled' }),
      ]);

      const completedServicesData = await this.hourlyServiceModel
        .find({ status: 'completed' })
        .exec();

      const totalRevenue = completedServicesData.reduce((sum, service) => {
        return sum + (service.actualPrice || service.estimatedPrice);
      }, 0);

      return {
        totalServices,
        pendingServices,
        completedServices,
        cancelledServices,
        totalRevenue,
      };
    } catch (error) {
      console.error('[HourlyServiceService] Error getting statistics:', error);
      throw error;
    }
  }

  /**
   * Delete service
   */
  async delete(id: string): Promise<void> {
    try {
      const service = await this.hourlyServiceModel
        .findByIdAndDelete(id)
        .exec();

      if (!service) {
        throw new NotFoundException('Service not found');
      }

      console.log('[HourlyServiceService] Service deleted:', id);
    } catch (error) {
      console.error('[HourlyServiceService] Error deleting service:', error);
      throw error;
    }
  }
}
