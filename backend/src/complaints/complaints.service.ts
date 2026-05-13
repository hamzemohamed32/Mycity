import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DistrictsService } from '../districts/districts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RedisService } from '../redis/redis.service';
import { UserRole } from '../users/entities/user.entity';
import { complaintDetailCacheKey } from './complaint-cache';
import { ComplaintFilterDto } from './dto/complaint-filter.dto';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { Complaint } from './entities/complaint.entity';

@Injectable()
export class ComplaintsService {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaintsRepository: Repository<Complaint>,
    private readonly districtsService: DistrictsService,
    private readonly notificationsService: NotificationsService,
    private readonly redisService: RedisService,
  ) {}

  async create(userId: string, payload: CreateComplaintDto): Promise<Complaint> {
    if (payload.clientRequestId) {
      const existing = await this.complaintsRepository.findOne({
        where: {
          createdById: userId,
          clientRequestId: payload.clientRequestId,
        },
      });

      if (existing) {
        return existing;
      }
    }

    const location = {
      type: 'Point' as const,
      coordinates: [payload.location.lng, payload.location.lat] as [number, number],
    };

    const district = await this.districtsService.findForLocation(location);
    const entity = this.complaintsRepository.create({
      description: payload.description,
      category: payload.category,
      imageUrl: payload.imageUrl ?? null,
      clientRequestId: payload.clientRequestId ?? null,
      createdById: userId,
      districtId: district?.id ?? null,
      location,
      metadata: payload.clientRequestId ? { clientRequestId: payload.clientRequestId } : null,
    });

    const saved = await this.complaintsRepository.save(entity);
    await this.notificationsService.notifyComplaintCreated(saved);
    return saved;
  }

  async findAll(filters: ComplaintFilterDto, user: { role: UserRole; districtId?: string }) {
    const query = this.complaintsRepository.createQueryBuilder('complaint');
    query.leftJoinAndSelect('complaint.createdBy', 'createdBy');
    query.leftJoinAndSelect('complaint.district', 'district');

    if (filters.districtId) {
      query.andWhere('complaint.districtId = :districtId', { districtId: filters.districtId });
    }

    if (filters.category) {
      query.andWhere('complaint.category = :category', { category: filters.category });
    }

    if (filters.status) {
      query.andWhere('complaint.status = :status', { status: filters.status });
    }

    if (user.role === UserRole.DistrictAdmin && user.districtId) {
      query.andWhere('complaint.districtId = :scopedDistrictId', { scopedDistrictId: user.districtId });
    }

    query.orderBy('complaint.createdAt', 'DESC');
    query.skip((filters.page - 1) * filters.limit);
    query.take(filters.limit);

    const [items, total] = await query.getManyAndCount();
    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  async findOne(id: string): Promise<Complaint> {
    const cached = await this.redisService.getJson<Complaint>(complaintDetailCacheKey(id));
    if (cached) {
      return cached;
    }

    const complaint = await this.complaintsRepository.findOne({
      where: { id },
      relations: {
        comments: {
          author: true,
        },
        reactions: {
          user: true,
        },
      },
    });

    if (!complaint) {
      throw new NotFoundException('Complaint not found');
    }

    await this.redisService.setJson(complaintDetailCacheKey(id), complaint, 60);
    return complaint;
  }

  async updateStatus(id: string, payload: UpdateComplaintStatusDto): Promise<Complaint> {
    const complaint = await this.findOne(id);
    complaint.status = payload.status;
    complaint.assignedAdminId = payload.assignedAdminId ?? complaint.assignedAdminId;
    const saved = await this.complaintsRepository.save(complaint);

    await this.redisService.del(complaintDetailCacheKey(id));
    await this.notificationsService.notifyComplaintStatusChanged(saved);
    return saved;
  }
}
