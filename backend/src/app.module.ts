import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AuthModule } from './modules/auth/auth.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { CustomersModule } from './modules/customers/customers.module';
import { RidesModule } from './modules/rides/rides.module';
import { CombinedTripsModule } from './modules/combined-trips/combined-trips.module';
import { WalletsModule } from './modules/wallets/wallets.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { MessagesModule } from './modules/messages/messages.module';
import { PlacesModule } from './modules/places/places.module';
import { PaymentModule } from './modules/payment/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    MongooseModule.forRoot(
      process.env.MONGODB_URI || 'mongodb+srv://dungjpitfpt:PpNcu63IBcVu9Nfi@natech.yzz43.mongodb.net/fire_go?retryWrites=true&w=majority&appName=NATECH',
    ),
    EventEmitterModule.forRoot(),
    AuthModule,
    DriversModule,
    CustomersModule,
    RidesModule,
    CombinedTripsModule,
    WalletsModule,
    ReviewsModule,
    NotificationsModule,
    AdminModule,
    MessagesModule,
    PlacesModule,
    PaymentModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
