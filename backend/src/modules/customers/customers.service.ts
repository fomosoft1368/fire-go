import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto, UpdateCustomerDto, SavedAddressDto } from './dto';

@Injectable()
export class CustomersService {
  constructor(@InjectModel(Customer.name) private customerModel: Model<CustomerDocument>) {}

  async create(userId: string, createCustomerDto: CreateCustomerDto): Promise<CustomerDocument> {
    const customer = await this.customerModel.create({
      ...createCustomerDto,
      userId: new Types.ObjectId(userId),
      savedAddresses: [],
      emergencyContacts: [],
    });

    return customer.populate('userId');
  }

  async findById(id: string): Promise<CustomerDocument> {
    const customer = await this.customerModel.findById(id).populate('userId');

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async findByUserId(userId: string): Promise<CustomerDocument> {
    const customer = await this.customerModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .populate('userId');

    if (!customer) {
      throw new NotFoundException(`Customer with user ID ${userId} not found`);
    }

    return customer;
  }

  async findAll(filters?: any): Promise<CustomerDocument[]> {
    return this.customerModel
      .find(filters || {})
      .populate('userId')
      .sort({ createdAt: -1 });
  }

  async update(customerId: string, updateCustomerDto: UpdateCustomerDto): Promise<CustomerDocument> {
    return this.customerModel.findByIdAndUpdate(
      customerId,
      updateCustomerDto,
      { new: true },
    );
  }

  async delete(customerId: string): Promise<any> {
    const customer = await this.customerModel.findByIdAndDelete(customerId);
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }
    return { success: true, message: 'Customer deleted successfully', data: customer };
  }

  async addSavedAddress(customerId: string, savedAddressDto: SavedAddressDto): Promise<CustomerDocument> {
    const customer = await this.findById(customerId);

    // Check if address label already exists
    if (customer.savedAddresses.some((addr) => addr.label === savedAddressDto.label)) {
      throw new BadRequestException(`Saved address with label "${savedAddressDto.label}" already exists`);
    }

    return this.customerModel.findByIdAndUpdate(
      customerId,
      {
        $push: {
          savedAddresses: {
            label: savedAddressDto.label,
            address: savedAddressDto.address,
            coordinates: {
              type: 'Point',
              coordinates: savedAddressDto.coordinates,
            },
          },
        },
      },
      { new: true },
    );
  }

  async removeSavedAddress(customerId: string, addressLabel: string): Promise<CustomerDocument> {
    return this.customerModel.findByIdAndUpdate(
      customerId,
      {
        $pull: {
          savedAddresses: { label: addressLabel },
        },
      },
      { new: true },
    );
  }

  async addEmergencyContact(
    customerId: string,
    contact: { name: string; phone: string; relationship: string },
  ): Promise<CustomerDocument> {
    return this.customerModel.findByIdAndUpdate(
      customerId,
      {
        $push: {
          emergencyContacts: contact,
        },
      },
      { new: true },
    );
  }

  async removeEmergencyContact(customerId: string, contactName: string): Promise<CustomerDocument> {
    return this.customerModel.findByIdAndUpdate(
      customerId,
      {
        $pull: {
          emergencyContacts: { name: contactName },
        },
      },
      { new: true },
    );
  }

  async incrementRideStats(customerId: string, completed: boolean = true): Promise<void> {
    const updateData: any = {
      $inc: { totalRides: 1 },
    };

    if (completed) {
      updateData.$inc.completedRides = 1;
    } else {
      updateData.$inc.cancelledRides = 1;
    }

    await this.customerModel.findByIdAndUpdate(customerId, updateData);
  }

  async updateRating(customerId: string, rating: number): Promise<CustomerDocument> {
    const customer = await this.findById(customerId);

    const newTotal = customer.totalReviews + 1;
    const newAverage =
      (customer.averageRating * customer.totalReviews + rating) / newTotal;

    return this.customerModel.findByIdAndUpdate(
      customerId,
      {
        averageRating: Math.round(newAverage * 100) / 100,
        $inc: { totalReviews: 1 },
      },
      { new: true },
    );
  }

  async blacklistCustomer(customerId: string, reason: string): Promise<CustomerDocument> {
    return this.customerModel.findByIdAndUpdate(
      customerId,
      {
        isBlacklisted: true,
        blacklistReason: reason,
      },
      { new: true },
    );
  }

  async removeFromBlacklist(customerId: string): Promise<CustomerDocument> {
    return this.customerModel.findByIdAndUpdate(
      customerId,
      {
        isBlacklisted: false,
        blacklistReason: null,
      },
      { new: true },
    );
  }

  async getStats(customerId: string): Promise<any> {
    return this.customerModel.findById(customerId).select(
      'totalRides completedRides cancelledRides averageRating totalReviews totalSpent',
    );
  }
}
