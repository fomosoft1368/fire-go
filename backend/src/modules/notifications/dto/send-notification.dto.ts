import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsMongoId,
  IsIn,
} from 'class-validator';
import {
  NotificationType,
  NotificationChannel,
} from '../schemas/notification.schema';

export class SendNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  @IsOptional()
  channels?: NotificationChannel[];

  @IsMongoId()
  @IsOptional()
  driverId?: string;

  @IsMongoId()
  @IsOptional()
  customerId?: string;

  @IsString()
  @IsOptional()
  @IsIn(['drivers', 'customers'])
  broadcastTo?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  actionUrl?: string;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
