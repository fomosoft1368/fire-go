import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  HourlyService,
  HourlyServiceSchema,
} from './schemas/hourly-service.schema';
import { HourlyServiceService } from './services/hourly-service.service';
import { HourlyServiceController } from './controllers/hourly-service.controller';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { TeamsModule } from '../teams/teams.module';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { PricingConfig, PricingConfigSchema } from '../pricing/pricing-config.schema';
import { DriversModule } from '../drivers/drivers.module';

@Module({
  imports: [
    DriversModule,
    NotificationsModule,
    TeamsModule,
    MongooseModule.forFeature([
      { name: HourlyService.name, schema: HourlyServiceSchema },
      { name: Customer.name, schema: CustomerSchema },
      { name: Driver.name, schema: DriverSchema },
      { name: 'PricingConfig', schema: PricingConfigSchema },
    ]),
  ],
  controllers: [HourlyServiceController],
  providers: [HourlyServiceService],
  exports: [HourlyServiceService],
})
export class HourlyServicesModule {}
