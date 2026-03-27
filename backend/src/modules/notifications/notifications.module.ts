import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsListener } from './notifications.listener';
import { PushNotificationService } from './push-notification.service';
import { Notification, NotificationSchema } from './schemas/notification.schema';
import { Driver, DriverSchema } from '../drivers/schemas/driver.schema';
import { Customer, CustomerSchema } from '../customers/schemas/customer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: Driver.name, schema: DriverSchema },
      { name: Customer.name, schema: CustomerSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationsListener, PushNotificationService],
  exports: [NotificationsService, PushNotificationService],
})
export class NotificationsModule {}
