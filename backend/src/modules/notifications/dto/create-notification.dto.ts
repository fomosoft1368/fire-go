import {
  IsString,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import {
  NotificationType,
  NotificationChannel,
} from '../schemas/notification.schema';

export class CreateNotificationDto {
  @IsString()
  userId: string;

  @IsEnum(NotificationType)
  type: NotificationType;

  @IsArray()
  @IsEnum(NotificationChannel, { each: true })
  channels: NotificationChannel[];

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  rideId?: string;

  @IsOptional()
  data?: Record<string, any>;

  @IsOptional()
  @IsString()
  actionUrl?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
