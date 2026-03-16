import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { HourlyService, HourlyServiceSchema } from './schemas/hourly-service.schema'
import { HourlyServiceService } from './services/hourly-service.service'
import { HourlyServiceController } from './controllers/hourly-service.controller'
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema'
import { DriversModule } from '../drivers/drivers.module'

@Module({
  imports: [
    DriversModule,
    MongooseModule.forFeature([
      { name: HourlyService.name, schema: HourlyServiceSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [HourlyServiceController],
  providers: [HourlyServiceService],
  exports: [HourlyServiceService],
})
export class HourlyServicesModule {}
