import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BonusesService } from './bonuses.service';
import { BonusesController } from './bonuses.controller';
import { BonusRule, BonusRuleSchema } from './schemas/bonus-rule.schema';
import { BonusClaim, BonusClaimSchema } from './schemas/bonus-claim.schema';
import { Ride, RideSchema } from '../rides/schemas/ride.schema';
import { CombinedTrip, CombinedTripSchema } from '../combined-trips/schemas/combined-trip.schema';
import { Delivery, DeliverySchema } from '../delivery/schemas/delivery.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BonusRule.name, schema: BonusRuleSchema },
      { name: BonusClaim.name, schema: BonusClaimSchema },
      { name: Ride.name, schema: RideSchema },
      { name: CombinedTrip.name, schema: CombinedTripSchema },
      { name: Delivery.name, schema: DeliverySchema },
      { name: Driver.name, schema: DriverSchema },
    ]),
    WalletsModule,
  ],
  controllers: [BonusesController],
  providers: [BonusesService],
  exports: [BonusesService],
})
export class BonusesModule {}
