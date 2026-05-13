import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { QueueJobType } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationDeliveryWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationDeliveryWorkerService.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private readonly queueService: QueueService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    if (process.env.ENABLE_NOTIFICATION_WORKER === 'false') {
      this.logger.log('Notification worker disabled by environment');
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, Number(process.env.NOTIFICATION_WORKER_INTERVAL_MS ?? 3000));
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const job = await this.queueService.reserveNext(QueueJobType.NotificationDelivery);
      if (!job) {
        return;
      }

      try {
        const notificationEventId = job.payload.notificationEventId;
        if (typeof notificationEventId !== 'string' || !notificationEventId) {
          throw new Error('Missing notificationEventId payload');
        }

        await this.notificationsService.deliverNotificationEvent(notificationEventId);
        await this.queueService.complete(job.id);
      } catch (error) {
        await this.queueService.fail(job, error);
      }
    } finally {
      this.isRunning = false;
    }
  }
}
