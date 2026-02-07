import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { Driver, DriverSchema } from './schemas/driver.schema';
import { WalletService } from './services/wallet.service';
import { SepayService } from './services/sepay.service';
import { WalletController } from './controllers/wallet.controller';
import {
  WalletTransaction,
  WalletTransactionSchema,
} from './schemas/wallet-transaction.schema';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Driver.name, schema: DriverSchema },
      { name: WalletTransaction.name, schema: WalletTransactionSchema },
    ]),
    PricingModule, // Import PricingModule để WalletService có thể dùng PricingService
  ],
  controllers: [WalletController, DriversController], // WalletController MUST be first (more specific routes)
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
