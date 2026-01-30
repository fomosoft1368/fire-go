import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { MessageType } from '../schemas/message.schema';

export class CreateMessageDto {
  @IsOptional()
  @IsString()
  rideId?: string;

  @IsOptional()
  @IsString()
  deliveryId?: string;

  @IsNotEmpty()
  @IsString()
  text: string;

  @IsEnum(['customer', 'driver'])
  senderType: 'customer' | 'driver';

  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}

export class GetMessagesDto {
  @IsNotEmpty()
  @IsString()
  rideId: string;

  @IsOptional()
  limit?: number;

  @IsOptional()
  skip?: number;
}

export class MessageResponseDto {
  _id: string;
  rideId: string;
  senderId: string;
  senderType: 'customer' | 'driver';
  text: string;
  type: MessageType;
  isRead: boolean;
  createdAt: Date;
}
