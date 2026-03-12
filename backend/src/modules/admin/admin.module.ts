import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminLog, AdminLogSchema } from './schemas/admin-log.schema';
import { SystemConfig, SystemConfigSchema } from './schemas/system-config.schema';
import { Permission, PermissionSchema } from './schemas/permission.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { Ride, RideSchema } from '../rides/schemas/ride.schema';
import { RideRequest, RideRequestSchema } from '../combined-trips/schemas/ride-request.schema';
import { Delivery, DeliverySchema } from '../delivery/schemas/delivery.schema';
import { HourlyService, HourlyServiceSchema } from '../hourly-services/schemas/hourly-service.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminLog.name, schema: AdminLogSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: Permission.name, schema: PermissionSchema },
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Driver.name, schema: DriverSchema },
      { name: Ride.name, schema: RideSchema },
      { name: RideRequest.name, schema: RideRequestSchema },
      { name: Delivery.name, schema: DeliverySchema },
      { name: HourlyService.name, schema: HourlyServiceSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
