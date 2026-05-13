import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QueueModule } from '../queue/queue.module';
import { NotificationEvent } from './entities/notification-event.entity';
import { UserDevice } from './entities/user-device.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationDeliveryWorkerService } from './notification-delivery-worker.service';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserDevice, NotificationEvent]), QueueModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationDeliveryWorkerService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
