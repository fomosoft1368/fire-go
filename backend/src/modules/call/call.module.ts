import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CallController, CallRoomController } from './call.controller';
import { CallService } from './call.service';
import { CallListener } from './call.listener';
import { CallSession, CallSessionSchema } from './schemas/call.schema';
import { CombinedTrip, CombinedTripSchema } from '../combined-trips/schemas/combined-trip.schema';
import { NotificationsModule } from '../notifications/notifications.module';
import { RidesModule } from '../rides/rides.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CallSession.name, schema: CallSessionSchema },
      { name: CombinedTrip.name, schema: CombinedTripSchema },
    ]),
    NotificationsModule,
    RidesModule,
  ],
  controllers: [CallRoomController, CallController],
  providers: [CallService, CallListener],
  exports: [CallService],
})
export class CallModule {}
