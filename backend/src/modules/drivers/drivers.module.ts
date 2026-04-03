import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { Driver, DriverSchema } from './schemas/driver.schema';
import { WalletService } from './services/wallet.service';
import { SepayService } from './services/sepay.service';
import { WalletController } from './controllers/wallet.controller';
import { WalletAdminController } from './controllers/wallet-admin.controller';
import { SepayWebhookController } from './controllers/sepay-webhook.controller';
import {
  Transaction,
  TransactionSchema,
} from '../wallets/schemas/transaction.schema';
import { PricingModule } from '../pricing/pricing.module';
import { WalletsModule } from '../wallets/wallets.module';
import { Ride, RideSchema } from '../rides/schemas/ride.schema';
import { CombinedTrip, CombinedTripSchema } from '../combined-trips/schemas/combined-trip.schema';
import { RideRequest, RideRequestSchema } from '../combined-trips/schemas/ride-request.schema';
import { Delivery, DeliverySchema } from '../delivery/schemas/delivery.schema';
import { PricingConfig, PricingConfigSchema } from '../pricing/pricing-config.schema';
import { HourlyService, HourlyServiceSchema } from '../hourly-services/schemas/hourly-service.schema';
import { AppSettingsModule } from '../app-settings/app-settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Driver.name, schema: DriverSchema },
      { name: Transaction.name, schema: TransactionSchema },
      { name: Ride.name, schema: RideSchema },
      { name: CombinedTrip.name, schema: CombinedTripSchema },
      { name: RideRequest.name, schema: RideRequestSchema },
      { name: Delivery.name, schema: DeliverySchema },
      { name: PricingConfig.name, schema: PricingConfigSchema },
      { name: HourlyService.name, schema: HourlyServiceSchema },
    ]),
    MulterModule.register({
      dest: './uploads/driver-documents',
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB per file
      },
    }),
    PricingModule,       // Import PricingModule để WalletService có thể dùng PricingService
    WalletsModule,       // Import WalletsModule for customer wallet handling
    AppSettingsModule,   // Import để SepayService đọc keys từ DB
  ],
  controllers: [
    SepayWebhookController, // Webhook must be first (specific path)
    WalletAdminController,  // Admin routes
    WalletController,       // Driver wallet routes
    DriversController,      // Driver routes (must be last, has :id wildcard)
  ],
  providers: [DriversService, WalletService, SepayService],
  exports: [DriversService, WalletService, SepayService],
})
export class DriversModule implements OnModuleInit {
  constructor(private readonly driversService: DriversService) {}

  onModuleInit() {
    // Run auto-offline job every minute
    setInterval(async () => {
      try {
        await this.driversService.autoOfflineInactiveDrivers();
      } catch (error) {
        console.error('[DriversModule] Error in auto-offline job:', error);
      }
    }, 60 * 1000); // Every 60 seconds
    
    console.log('[DriversModule] Auto-offline job started (runs every 60s)');
  }
}
