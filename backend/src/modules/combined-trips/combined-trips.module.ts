import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { CombinedTrip, CombinedTripSchema } from './schemas/combined-trip.schema';
import { RideRequest, RideRequestSchema } from '../combined-trips/schemas/ride-request.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { CombinedTripsService } from './services/combined-trips.service';
import { CombinedTripsController } from './controllers/combined-trips.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: CombinedTrip.name, schema: CombinedTripSchema },
      { name: RideRequest.name, schema: RideRequestSchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
  ],
  controllers: [CombinedTripsController],
  providers: [CombinedTripsService],
  exports: [CombinedTripsService],
})
export class CombinedTripsModule {}
