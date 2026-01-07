import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { Ride, RideSchema } from './schemas/ride.schema';
import { AutoAssignService } from './services/auto-assign.service';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Ride.name, schema: RideSchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
  ],
  controllers: [RidesController],
  providers: [RidesService, AutoAssignService],
  exports: [RidesService, AutoAssignService],
})
export class RidesModule {}
