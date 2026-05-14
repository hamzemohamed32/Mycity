import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueueModule } from '../queue/queue.module';
import { HealthController } from './health.controller';

@Module({
  imports: [QueueModule, NotificationsModule],
  controllers: [HealthController],
})
export class HealthModule {}
