import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { HourlyService, HourlyServiceSchema } from './schemas/hourly-service.schema'
import { HourlyServiceService } from './services/hourly-service.service'
import { HourlyServiceController } from './controllers/hourly-service.controller'

@Module({
  imports: [MongooseModule.forFeature([{ name: HourlyService.name, schema: HourlyServiceSchema }])],
  controllers: [HourlyServiceController],
  providers: [HourlyServiceService],
  exports: [HourlyServiceService],
})
export class HourlyServicesModule {}
