import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { NotificationsService } from '../notifications/notifications.service';
import { QueueService } from '../queue/queue.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly queueService: QueueService,
    private readonly redisService: RedisService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  async check() {
    await this.dataSource.query('SELECT 1');

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'ok',
      redis: await this.redisService.ping(),
      queue: await this.queueService.getStats(),
      notifications: await this.notificationsService.getDeliveryStats(),
    };
  }
}
