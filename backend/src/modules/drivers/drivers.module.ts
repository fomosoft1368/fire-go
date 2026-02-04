import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';
import { Driver, DriverSchema } from './schemas/driver.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Driver.name, schema: DriverSchema }])],
  controllers: [DriversController],
  providers: [DriversService],
  exports: [DriversService],
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
