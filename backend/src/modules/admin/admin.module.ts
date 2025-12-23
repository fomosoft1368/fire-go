import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminLog, AdminLogSchema } from './schemas/admin-log.schema';
import { SystemConfig, SystemConfigSchema } from './schemas/system-config.schema';
import { User, UserSchema } from '../auth/schemas/user.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AdminLog.name, schema: AdminLogSchema },
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: User.name, schema: UserSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
