import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { AddonService, AddonServiceSchema } from './schemas/addon-service.schema'
import { AddonServiceService } from './services/addon-service.service'
import { AddonServiceController } from './controllers/addon-service.controller'

@Module({
  imports: [MongooseModule.forFeature([{ name: AddonService.name, schema: AddonServiceSchema }])],
  controllers: [AddonServiceController],
  providers: [AddonServiceService],
  exports: [AddonServiceService],
})
export class AddonServicesModule {}
