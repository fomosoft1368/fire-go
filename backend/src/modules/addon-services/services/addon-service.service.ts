import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { AddonService, AddonServiceDocument } from '../schemas/addon-service.schema'
import { CreateAddonServiceDto, UpdateAddonServiceDto } from '../dto/create-addon-service.dto'

@Injectable()
export class AddonServiceService {
  constructor(
    @InjectModel(AddonService.name) private addonServiceModel: Model<AddonServiceDocument>,
  ) {}

  /**
   * Create new addon service
   */
  async create(createDto: CreateAddonServiceDto): Promise<AddonServiceDocument> {
    try {
      const service = new this.addonServiceModel({
        ...createDto,
        status: createDto.status || 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      return await service.save()
    } catch (error) {
      console.error('[AddonServiceService] Error creating service:', error)
      throw error
    }
  }

  /**
   * Get all addon services
   */
  async findAll(status?: string, skip: number = 0, limit: number = 100): Promise<AddonServiceDocument[]> {
    try {
      const query: any = {}
      if (status) {
        query.status = status
      }
      return await this.addonServiceModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec()
    } catch (error) {
      console.error('[AddonServiceService] Error fetching services:', error)
      throw error
    }
  }

  /**
   * Get addon service by ID
   */
  async findById(id: string): Promise<AddonServiceDocument | null> {
    try {
      return await this.addonServiceModel.findById(id).exec()
    } catch (error) {
      console.error('[AddonServiceService] Error fetching service:', error)
      throw error
    }
  }

  /**
   * Get active addon services
   */
  async findActive(skip: number = 0, limit: number = 100): Promise<AddonServiceDocument[]> {
    try {
      return await this.addonServiceModel
        .find({ status: 'active' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec()
    } catch (error) {
      console.error('[AddonServiceService] Error fetching active services:', error)
      throw error
    }
  }

  /**
   * Update addon service
   */
  async update(id: string, updateDto: UpdateAddonServiceDto): Promise<AddonServiceDocument | null> {
    try {
      return await this.addonServiceModel
        .findByIdAndUpdate(id, { ...updateDto, updatedAt: new Date() }, { new: true })
        .exec()
    } catch (error) {
      console.error('[AddonServiceService] Error updating service:', error)
      throw error
    }
  }

  /**
   * Toggle addon service status
   */
  async toggleStatus(id: string): Promise<AddonServiceDocument | null> {
    try {
      const service = await this.addonServiceModel.findById(id).exec()
      if (!service) {
        throw new Error('Service not found')
      }
      const newStatus = service.status === 'active' ? 'inactive' : 'active'
      return await this.addonServiceModel
        .findByIdAndUpdate(id, { status: newStatus, updatedAt: new Date() }, { new: true })
        .exec()
    } catch (error) {
      console.error('[AddonServiceService] Error toggling status:', error)
      throw error
    }
  }

  /**
   * Delete addon service
   */
  async delete(id: string): Promise<AddonServiceDocument | null> {
    try {
      return await this.addonServiceModel.findByIdAndDelete(id).exec()
    } catch (error) {
      console.error('[AddonServiceService] Error deleting service:', error)
      throw error
    }
  }

  /**
   * Count addon services
   */
  async count(status?: string): Promise<number> {
    try {
      const query: any = {}
      if (status) {
        query.status = status
      }
      return await this.addonServiceModel.countDocuments(query).exec()
    } catch (error) {
      console.error('[AddonServiceService] Error counting services:', error)
      throw error
    }
  }
}
