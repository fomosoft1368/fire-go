import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigController } from './config.controller';
import { ConfigService } from './config.service';
import {
  DriverSearchConfig,
  DriverSearchConfigSchema,
} from './schemas/driver-search-config.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DriverSearchConfig.name, schema: DriverSearchConfigSchema },
    ]),
  ],
  controllers: [ConfigController],
  providers: [ConfigService],
  exports: [ConfigService], // Export để các module khác sử dụng
})
export class DriverSearchConfigModule {}
