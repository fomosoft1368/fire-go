import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { Ride, RideSchema } from './schemas/ride.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Ride.name, schema: RideSchema }])],
  controllers: [RidesController],
  providers: [RidesService],
  exports: [RidesService],
})
export class RidesModule {}
