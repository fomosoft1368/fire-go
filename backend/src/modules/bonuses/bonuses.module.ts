import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BonusesService } from './bonuses.service';
import { BonusesController } from './bonuses.controller';
import { BonusRule, BonusRuleSchema } from './schemas/bonus-rule.schema';
import { BonusClaim, BonusClaimSchema } from './schemas/bonus-claim.schema';
import { Ride, RideSchema } from '../rides/schemas/ride.schema';
import { WalletsModule } from '../wallets/wallets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BonusRule.name, schema: BonusRuleSchema },
      { name: BonusClaim.name, schema: BonusClaimSchema },
      { name: Ride.name, schema: RideSchema },
    ]),
    WalletsModule,
  ],
  controllers: [BonusesController],
  providers: [BonusesService],
  exports: [BonusesService],
})
export class BonusesModule {}
