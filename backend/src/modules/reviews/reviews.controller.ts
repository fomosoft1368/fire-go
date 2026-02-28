import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Request() req: any, @Body() createReviewDto: CreateReviewDto) {
    return this.reviewsService.create(req.user.id, createReviewDto);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.reviewsService.findById(id);
  }

  @Get('ride/:rideId')
  async findByRideId(@Param('rideId') rideId: string) {
    return this.reviewsService.findByRideId(rideId);
  }

  @Get('user/:userId/received')
  async findByReviewee(
    @Param('userId') userId: string,
    @Query('limit') limit: number = 20,
    @Query('skip') skip: number = 0,
  ) {
    return this.reviewsService.findByReviewee(userId, limit, skip);
  }

  @Get('user/:userId/given')
  async findByReviewer(@Param('userId') userId: string, @Query('limit') limit: number = 20) {
    return this.reviewsService.findByReviewer(userId, limit);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() updateReviewDto: UpdateReviewDto) {
    return this.reviewsService.update(id, updateReviewDto);
  }

  @Patch(':id/flag')
  @UseGuards(JwtAuthGuard)
  async flagReview(@Param('id') id: string, @Body('reason') reason: string) {
    return this.reviewsService.flagReview(id, reason);
  }

  @Patch(':id/helpful')
  async markAsHelpful(@Param('id') id: string) {
    return this.reviewsService.markAsHelpful(id);
  }

  @Patch(':id/unhelpful')
  async markAsUnhelpful(@Param('id') id: string) {
    return this.reviewsService.markAsUnhelpful(id);
  }

  @Get('user/:userId/stats')
  async getReviewStats(@Param('userId') userId: string) {
    return this.reviewsService.getReviewStats(userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteReview(@Param('id') id: string) {
    await this.reviewsService.deleteReview(id);
    return { message: 'Review deleted successfully' };
  }
}
