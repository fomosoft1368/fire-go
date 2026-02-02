import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DeliveryService } from './services/delivery.service';
import { DeliveryAutoAssignService } from './services/delivery-auto-assign.service';
import { DeliveryController } from './controllers/delivery.controller';
import { Delivery, DeliverySchema } from './schemas/delivery.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { DeliveryAssignmentRequest, DeliveryAssignmentRequestSchema } from './schemas/delivery-assignment-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Delivery.name, schema: DeliverySchema },
      { name: Driver.name, schema: DriverSchema },
      { name: DeliveryAssignmentRequest.name, schema: DeliveryAssignmentRequestSchema },
    ]),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService, DeliveryAutoAssignService],
  exports: [DeliveryService, DeliveryAutoAssignService],
})
export class DeliveryModule {}
