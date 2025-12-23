import { Controller, Get, Post, Patch, Body, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto, SavedAddressDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  /**
   * GET /api/customers
   * Lấy danh sách tất cả khách hàng
   */
  @Get()
  async findAll() {
    return this.customersService.findAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(req.user.id, createCustomerDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Request() req: any) {
    return this.customersService.findByUserId(req.user.id);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.customersService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(id, updateCustomerDto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.customersService.delete(id);
  }

  @Post(':id/saved-addresses')
  @UseGuards(JwtAuthGuard)
  async addSavedAddress(@Param('id') id: string, @Body() savedAddressDto: SavedAddressDto) {
    return this.customersService.addSavedAddress(id, savedAddressDto);
  }

  @Delete(':id/saved-addresses/:label')
  @UseGuards(JwtAuthGuard)
  async removeSavedAddress(@Param('id') id: string, @Param('label') label: string) {
    return this.customersService.removeSavedAddress(id, label);
  }

  @Post(':id/emergency-contacts')
  @UseGuards(JwtAuthGuard)
  async addEmergencyContact(
    @Param('id') id: string,
    @Body() contact: { name: string; phone: string; relationship: string },
  ) {
    return this.customersService.addEmergencyContact(id, contact);
  }

  @Delete(':id/emergency-contacts/:name')
  @UseGuards(JwtAuthGuard)
  async removeEmergencyContact(@Param('id') id: string, @Param('name') name: string) {
    return this.customersService.removeEmergencyContact(id, name);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.customersService.getStats(id);
  }
}
