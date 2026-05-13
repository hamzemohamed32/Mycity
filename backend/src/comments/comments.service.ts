import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { complaintDetailCacheKey } from '../complaints/complaint-cache';
import { RedisService } from '../redis/redis.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    private readonly redisService: RedisService,
  ) {}

  async create(userId: string, complaintId: string, payload: CreateCommentDto): Promise<Comment> {
    const entity = this.commentsRepository.create({
      authorId: userId,
      complaintId,
      body: payload.body,
    });

    const saved = await this.commentsRepository.save(entity);
    await this.redisService.del(complaintDetailCacheKey(complaintId));
    return saved;
  }
}
