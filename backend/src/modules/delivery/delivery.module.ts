import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryService } from './services/delivery.service';
import { DeliveryAutoAssignService } from './services/delivery-auto-assign.service';
import { DeliveryController } from './controllers/delivery.controller';
import { Delivery, DeliverySchema } from './schemas/delivery.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { DriversModule } from '../drivers/drivers.module';
import { DeliveryAssignmentRequest, DeliveryAssignmentRequestSchema } from './schemas/delivery-assignment-request.schema';
import { PricingConfig, PricingConfigSchema } from '../pricing/pricing-config.schema';
import { DriverSearchConfigModule } from '../config/config.module';

@Module({
  imports: [
    DriverSearchConfigModule,
    DriversModule,
    MongooseModule.forFeature([
      { name: Delivery.name, schema: DeliverySchema },
      { name: Driver.name, schema: DriverSchema },
      { name: DeliveryAssignmentRequest.name, schema: DeliveryAssignmentRequestSchema },
      { name: 'PricingConfig', schema: PricingConfigSchema },
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, DeliveryAutoAssignService],
  exports: [DeliveryService, DeliveryAutoAssignService],
})
export class DeliveryModule {}
