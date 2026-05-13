import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { complaintDetailCacheKey } from '../complaints/complaint-cache';
import { Complaint } from '../complaints/entities/complaint.entity';
import { RedisService } from '../redis/redis.service';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { Reaction } from './entities/reaction.entity';

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(Reaction)
    private readonly reactionsRepository: Repository<Reaction>,
    @InjectRepository(Complaint)
    private readonly complaintsRepository: Repository<Complaint>,
    private readonly redisService: RedisService,
  ) {}

  async create(userId: string, complaintId: string, payload: CreateReactionDto): Promise<Reaction> {
    const existing = await this.reactionsRepository.findOne({
      where: {
        complaintId,
        userId,
      },
    });

    if (existing) {
      return existing;
    }

    const complaint = await this.complaintsRepository.findOne({
      where: { id: complaintId },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    const reaction = this.reactionsRepository.create({
      complaintId,
      userId,
      type: payload.type ?? 'support',
    });

    await this.complaintsRepository.increment({ id: complaint.id }, 'supportCount', 1);
    const saved = await this.reactionsRepository.save(reaction);
    await this.redisService.del(complaintDetailCacheKey(complaintId));
    return saved;
  }
}
