import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument, ReviewType } from './schemas/review.schema';
import { CreateReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  async create(
    reviewerId: string,
    createReviewDto: CreateReviewDto,
  ): Promise<ReviewDocument> {
    const reviewType: ReviewType = ReviewType.DRIVER; // Default to driver review

    const review = await this.reviewModel.create({
      ...createReviewDto,
      rideId: new Types.ObjectId(createReviewDto.rideId),
      reviewerId: new Types.ObjectId(reviewerId),
      revieweeId: new Types.ObjectId(createReviewDto.revieweeId),
      reviewType,
    });

    return review.populate(['rideId', 'reviewerId', 'revieweeId']);
  }

  async findById(id: string): Promise<ReviewDocument> {
    const review = await this.reviewModel
      .findById(id)
      .populate(['rideId', 'reviewerId', 'revieweeId']);

    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    return review;
  }

  async findByRideId(rideId: string): Promise<ReviewDocument[]> {
    return this.reviewModel
      .find({ rideId: new Types.ObjectId(rideId) })
      .populate(['rideId', 'reviewerId', 'revieweeId']);
  }

  async findByReviewee(
    userId: string,
    limit: number = 20,
    skip: number = 0,
  ): Promise<ReviewDocument[]> {
    return this.reviewModel
      .find({ revieweeId: new Types.ObjectId(userId), isFlagged: false })
      .populate(['rideId', 'reviewerId'])
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip);
  }

  async findByReviewer(
    userId: string,
    limit: number = 20,
  ): Promise<ReviewDocument[]> {
    return this.reviewModel
      .find({ reviewerId: new Types.ObjectId(userId) })
      .populate(['rideId', 'revieweeId'])
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  async update(
    reviewId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewDocument> {
    return this.reviewModel.findByIdAndUpdate(reviewId, updateReviewDto, {
      new: true,
    });
  }

  async flagReview(reviewId: string, reason: string): Promise<ReviewDocument> {
    return this.reviewModel.findByIdAndUpdate(
      reviewId,
      {
        isFlagged: true,
        flagReason: reason,
      },
      { new: true },
    );
  }

  async unflagReview(reviewId: string): Promise<ReviewDocument> {
    return this.reviewModel.findByIdAndUpdate(
      reviewId,
      {
        isFlagged: false,
        flagReason: null,
      },
      { new: true },
    );
  }

  async markAsHelpful(reviewId: string): Promise<ReviewDocument> {
    return this.reviewModel.findByIdAndUpdate(
      reviewId,
      {
        $inc: { helpfulCount: 1 },
      },
      { new: true },
    );
  }

  async markAsUnhelpful(reviewId: string): Promise<ReviewDocument> {
    return this.reviewModel.findByIdAndUpdate(
      reviewId,
      {
        $inc: { unhelpfulCount: 1 },
      },
      { new: true },
    );
  }

  async getAverageRating(userId: string): Promise<number> {
    const result = await this.reviewModel.aggregate([
      {
        $match: {
          revieweeId: new Types.ObjectId(userId),
          isFlagged: false,
        },
      },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
        },
      },
    ]);

    return result[0]?.averageRating || 0;
  }

  async getReviewStats(userId: string): Promise<any> {
    return this.reviewModel.aggregate([
      {
        $match: {
          revieweeId: new Types.ObjectId(userId),
          isFlagged: false,
        },
      },
      {
        $group: {
          _id: null,
          totalReviews: { $sum: 1 },
          averageRating: { $avg: '$rating' },
          averageCommunication: { $avg: '$communication' },
          averageCleanliness: { $avg: '$cleanliness' },
          averageSafety: { $avg: '$safetyCompliance' },
          averageReliability: { $avg: '$reliability' },
          fiveStarCount: {
            $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] },
          },
          fourStarCount: {
            $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] },
          },
          threeStarCount: {
            $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] },
          },
          twoStarCount: {
            $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] },
          },
          oneStarCount: {
            $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] },
          },
        },
      },
    ]);
  }

  async deleteReview(reviewId: string): Promise<void> {
    const result = await this.reviewModel.findByIdAndDelete(reviewId);

    if (!result) {
      throw new NotFoundException(`Review with ID ${reviewId} not found`);
    }
  }
}
