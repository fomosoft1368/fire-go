import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlacesService } from './places.service';
import { PlacesController } from './places.controller';
import { Place, PlaceSchema } from './schemas/place.schema';
import { AppSettingsModule } from '../app-settings/app-settings.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Place.name, schema: PlaceSchema }]),
    AppSettingsModule,
  ],
  controllers: [PlacesController],
  providers: [PlacesService],
  exports: [PlacesService],
})
export class PlacesModule {}
