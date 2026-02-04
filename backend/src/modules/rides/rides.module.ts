import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { RidesService } from './services/rides.service'
import { RidesController } from './controllers/rides.controller'
import { Ride, RideSchema } from './schemas/ride.schema'
import { Pricing, PricingSchema } from './schemas/pricing.schema'
import { AssignmentRequest, AssignmentRequestSchema } from './schemas/assignment-request.schema'
import { AutoAssignService } from './services/auto-assign.service'
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema'
import { CombinedTripsModule } from '../combined-trips/combined-trips.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ride.name, schema: RideSchema },
      { name: Pricing.name, schema: PricingSchema },
      { name: AssignmentRequest.name, schema: AssignmentRequestSchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
    CombinedTripsModule,
  ],
  controllers: [RidesController],
  providers: [RidesService, AutoAssignService],
  exports: [RidesService, AutoAssignService],
})
export class RidesModule {}
