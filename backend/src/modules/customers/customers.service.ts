import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Customer, CustomerDocument } from './schemas/customer.schema';
import { CreateCustomerDto, UpdateCustomerDto, SavedAddressDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CustomersService {
  constructor(
    @InjectModel(Customer.name) private customerModel: Model<CustomerDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createCustomerDto: CreateCustomerDto): Promise<CustomerDocument> {
    // Check if customer with this email or phone already exists
    const existing = await this.customerModel.findOne({
      $or: [{ email: createCustomerDto.email }, { phone: createCustomerDto.phone }],
    });

    if (existing) {
      throw new BadRequestException('Customer with this email or phone already exists');
    }

    // Generate password if not provided
    const password = createCustomerDto.password || Math.random().toString(36).slice(-12);

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const customer = await this.customerModel.create({
      ...createCustomerDto,
      password: hashedPassword,
      savedAddresses: [],
      emergencyContacts: [],
    });

    // Emit event for new customer registration
    this.eventEmitter.emit('customer.registered', {
      customerId: customer._id.toString(),
      firstName: createCustomerDto.firstName,
      lastName: createCustomerDto.lastName,
      email: createCustomerDto.email,
    });

    return customer;
  }

  async findById(id: string): Promise<CustomerDocument> {
    const customer = await this.customerModel.findById(id);

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async findByEmail(email: string): Promise<CustomerDocument> {
    const customer = await this.customerModel.findOne({ email });

    if (!customer) {
      throw new NotFoundException(`Customer with email ${email} not found`);
    }

    return customer;
  }

  async findByEmailOrPhone(identifier: string): Promise<CustomerDocument> {
    const customer = await this.customerModel.findOne({
      $or: [
        { email: identifier },
        { phone: identifier }
      ]
    });

    if (!customer) {
      throw new NotFoundException(`Customer with email/phone ${identifier} not found`);
    }

    return customer;
  }

  async findAll(filters?: any): Promise<CustomerDocument[]> {
    return this.customerModel
      .find(filters || {})
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
