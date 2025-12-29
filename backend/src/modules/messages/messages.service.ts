import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { CreateMessageDto } from './dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name)
    private messageModel: Model<MessageDocument>,
  ) {}

  /**
   * Gửi tin nhắn
   */
  async sendMessage(
    createMessageDto: CreateMessageDto,
    senderId: string,
  ): Promise<MessageDocument> {
    if (!createMessageDto.rideId || !senderId || !createMessageDto.text) {
      throw new BadRequestException('rideId, senderId, and text are required');
    }

    try {
      const message = await this.messageModel.create({
        rideId: new Types.ObjectId(createMessageDto.rideId),
        senderId: new Types.ObjectId(senderId),
        senderType: createMessageDto.senderType,
        text: createMessageDto.text.trim(),
        type: createMessageDto.type || 'text',
        imageUrl: createMessageDto.imageUrl,
        isRead: false,
      });

      console.log(`[MessagesService] Message saved to DB:`, {
        messageId: message._id,
        rideId: createMessageDto.rideId,
        sender: senderId,
        senderType: createMessageDto.senderType,
        createdAt: message.createdAt,
      });

      return message;
    } catch (error: any) {
      console.error(`[MessagesService] Error saving message:`, {
        error: error.message,
        rideId: createMessageDto.rideId,
        senderId,
      });
      throw error;
    }
  }

  /**
   * Lấy danh sách tin nhắn của cuốc xe
   */
  async getMessagesByRide(
    rideId: string,
    limit: number = 50,
    skip: number = 0,
  ): Promise<{
    messages: MessageDocument[];
    total: number;
  }> {
    const objectId = new Types.ObjectId(rideId);

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ rideId: objectId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .lean(),
      this.messageModel.countDocuments({ rideId: objectId }),
    ]);

    console.log(`[MessagesService] Retrieved messages for ride:`, {
      rideId,
      count: messages.length,
      total,
    });

    return {
      messages: messages.reverse(), // Đảo lại để có thứ tự tăng dần (cũ -> mới)
      total,
    };
  }

  /**
   * Lấy tin nhắn mới nhất từ một thời điểm
   */
  async getNewMessages(
    rideId: string,
    sinceTimestamp: number,
  ): Promise<MessageDocument[]> {
    const messages = await this.messageModel
      .find({
        rideId: new Types.ObjectId(rideId),
        createdAt: { $gt: new Date(sinceTimestamp) },
      })
      .sort({ createdAt: 1 })
      .lean();

    return messages;
  }

  /**
   * Đánh dấu tin nhắn là đã đọc
   */
  async markAsRead(messageId: string): Promise<MessageDocument> {
    const message = await this.messageModel.findByIdAndUpdate(
      messageId,
      {
        isRead: true,
        readAt: new Date(),
      },
      { new: true },
    );

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    return message;
  }

  /**
   * Đánh dấu tất cả tin nhắn của cuốc xe là đã đọc
   */
  async markRideMessagesAsRead(
    rideId: string,
    recipientId: string,
  ): Promise<void> {
    await this.messageModel.updateMany(
      {
        rideId: new Types.ObjectId(rideId),
        senderId: { $ne: new Types.ObjectId(recipientId) },
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    console.log(`[MessagesService] Marked ride messages as read:`, {
      rideId,
      recipientId,
    });
  }

  /**
   * Xóa tin nhắn
   */
  async deleteMessage(messageId: string): Promise<MessageDocument> {
    const message = await this.messageModel.findByIdAndDelete(messageId);

    if (!message) {
      throw new NotFoundException(`Message with ID ${messageId} not found`);
    }

    return message;
  }

  /**
   * Lấy số lượng tin nhắn chưa đọc
   */
  async getUnreadCount(rideId: string, userId: string): Promise<number> {
    const count = await this.messageModel.countDocuments({
      rideId: new Types.ObjectId(rideId),
      senderId: { $ne: new Types.ObjectId(userId) },
      isRead: false,
    });

    return count;
  }
}
