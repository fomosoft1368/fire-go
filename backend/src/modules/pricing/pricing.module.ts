import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PricingController } from './pricing.controller';
import { PricingService } from './pricing.service';
import { PricingConfig, PricingConfigSchema } from './pricing-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PricingConfig.name, schema: PricingConfigSchema },
    ]),
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
