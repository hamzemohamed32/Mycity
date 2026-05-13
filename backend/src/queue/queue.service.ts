import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { RedisService } from '../redis/redis.service';
import { QueueJob, QueueJobStatus } from './entities/queue-job.entity';

type EnqueueOptions = {
  dedupeKey?: string;
  maxAttempts?: number;
  delayMs?: number;
};

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectRepository(QueueJob)
    private readonly queueJobsRepository: Repository<QueueJob>,
    private readonly redisService: RedisService,
  ) {}

  async enqueue(
    type: string,
    payload: Record<string, unknown>,
    options?: EnqueueOptions,
  ): Promise<QueueJob> {
    if (options?.dedupeKey) {
      const existing = await this.queueJobsRepository.findOne({
        where: { dedupeKey: options.dedupeKey },
      });

      if (existing) {
        return existing;
      }
    }

    const entity = this.queueJobsRepository.create({
      type,
      payload,
      dedupeKey: options?.dedupeKey ?? null,
      maxAttempts: options?.maxAttempts ?? 5,
      runAfter: new Date(Date.now() + (options?.delayMs ?? 0)),
    });

    return this.queueJobsRepository.save(entity);
  }

  async reserveNext(type: string): Promise<QueueJob | null> {
    return this.redisService.withLock(`queue:reserve:${type}`, 3_000, async () => {
      const candidate = await this.queueJobsRepository.findOne({
        where: {
          type,
          status: QueueJobStatus.Pending,
          runAfter: LessThanOrEqual(new Date()),
        },
        order: {
          createdAt: 'ASC',
        },
      });

      if (!candidate) {
        return null;
      }

      const updateResult = await this.queueJobsRepository.update(
        {
          id: candidate.id,
          status: QueueJobStatus.Pending,
        },
        {
          status: QueueJobStatus.Processing,
          lockedAt: new Date(),
          attempts: candidate.attempts + 1,
        },
      );

      if (!updateResult.affected) {
        return null;
      }

      return this.queueJobsRepository.findOne({ where: { id: candidate.id } });
    });
  }

  async complete(jobId: string): Promise<void> {
    await this.queueJobsRepository.update(
      { id: jobId },
      {
        status: QueueJobStatus.Completed,
        processedAt: new Date(),
        lockedAt: null,
        lastError: null,
      },
    );
  }

  async fail(job: QueueJob, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : 'Unknown worker failure';
    const shouldRetry = job.attempts < job.maxAttempts;
    const delayMs = Math.min(60_000, job.attempts * 5_000);

    await this.queueJobsRepository.update(
      { id: job.id },
      {
        status: shouldRetry ? QueueJobStatus.Pending : QueueJobStatus.Failed,
        lockedAt: null,
        lastError: message,
        runAfter: shouldRetry ? new Date(Date.now() + delayMs) : job.runAfter,
      },
    );

    this.logger.warn(
      `Queue job ${job.id} (${job.type}) ${shouldRetry ? 'scheduled for retry' : 'failed permanently'}: ${message}`,
    );
  }

  async getStats(): Promise<Record<string, number>> {
    const rows = await this.queueJobsRepository
      .createQueryBuilder('job')
      .select('job.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('job.status')
      .getRawMany<{ status: string; count: string }>();

    return rows.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.status] = Number(row.count);
      return accumulator;
    }, {});
  }
}
