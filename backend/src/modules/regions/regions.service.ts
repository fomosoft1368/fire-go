import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Region, RegionDocument } from './schemas/region.schema';

@Injectable()
export class RegionsService {
  constructor(
    @InjectModel(Region.name) private regionModel: Model<RegionDocument>,
  ) {}

  async create(createRegionDto: any): Promise<Region> {
    const createdRegion = new this.regionModel(createRegionDto);
    return createdRegion.save();
  }

  async findAll(): Promise<Region[]> {
    return this.regionModel.find().exec();
  }

  async findOne(id: string): Promise<Region> {
    const region = await this.regionModel.findById(id).exec();
    if (!region) {
      throw new NotFoundException(`Region #${id} not found`);
    }
    return region;
  }

  async update(id: string, updateRegionDto: any): Promise<Region> {
    const existingRegion = await this.regionModel
      .findByIdAndUpdate(id, updateRegionDto, { new: true })
      .exec();
    if (!existingRegion) {
      throw new NotFoundException(`Region #${id} not found`);
    }
    return existingRegion;
  }

  async remove(id: string): Promise<any> {
    const deletedRegion = await this.regionModel.findByIdAndDelete(id).exec();
    if (!deletedRegion) {
      throw new NotFoundException(`Region #${id} not found`);
    }
    return deletedRegion;
  }
}
