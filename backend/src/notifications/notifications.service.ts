import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { BatchResponse, getMessaging } from 'firebase-admin/messaging';
import { In, Repository } from 'typeorm';
import { Complaint } from '../complaints/entities/complaint.entity';
import { QueueJobType } from '../queue/queue.constants';
import { QueueService } from '../queue/queue.service';
import { NotificationEvent } from './entities/notification-event.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { NotificationDeliveryStatus } from './entities/notification-event.entity';
import { UserDevice } from './entities/user-device.entity';

const HARD_FAILURE_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(UserDevice)
    private readonly devicesRepository: Repository<UserDevice>,
    @InjectRepository(NotificationEvent)
    private readonly notificationEventsRepository: Repository<NotificationEvent>,
    private readonly queueService: QueueService,
  ) {}

  async registerDevice(userId: string, payload: RegisterDeviceDto): Promise<UserDevice> {
    const existing = await this.devicesRepository.findOne({
      where: {
        userId,
        fcmToken: payload.fcmToken,
      },
    });

    if (existing) {
      existing.platform = payload.platform;
      existing.appVersion = payload.appVersion;
      existing.isActive = true;
      return this.devicesRepository.save(existing);
    }

    const entity = this.devicesRepository.create({
      userId,
      fcmToken: payload.fcmToken,
      platform: payload.platform,
      appVersion: payload.appVersion,
      isActive: true,
    });

    return this.devicesRepository.save(entity);
  }

  async notifyComplaintStatusChanged(complaint: Complaint): Promise<void> {
    const event = await this.notificationEventsRepository.save(
      this.notificationEventsRepository.create({
        userId: complaint.createdById,
        complaintId: complaint.id,
        title: 'Complaint status updated',
        body: `${complaint.category} issue is now ${complaint.status.replaceAll('_', ' ')}.`,
        type: 'complaint_status_changed',
        metadata: {
          status: complaint.status,
        },
      }),
    );

    await this.enqueueDelivery(event.id);
  }

  async notifyComplaintCreated(complaint: Complaint): Promise<void> {
    const event = await this.notificationEventsRepository.save(
      this.notificationEventsRepository.create({
        userId: complaint.createdById,
        complaintId: complaint.id,
        title: 'Complaint received',
        body: 'Your report was saved and is waiting for district review.',
        type: 'complaint_created',
        metadata: {
          category: complaint.category,
        },
      }),
    );

    await this.enqueueDelivery(event.id);
  }

  async listForUser(userId: string, limit: number): Promise<NotificationEvent[]> {
    return this.notificationEventsRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async deliverNotificationEvent(notificationEventId: string): Promise<void> {
    const event = await this.notificationEventsRepository.findOne({
      where: { id: notificationEventId },
    });

    if (!event) {
      return;
    }

    const devices = await this.devicesRepository.find({
      where: {
        userId: event.userId,
        isActive: true,
      },
    });

    if (!devices.length) {
      await this.notificationEventsRepository.update(
        { id: event.id },
        {
          deliveryStatus: NotificationDeliveryStatus.NoDevices,
          deliveryAttempts: event.deliveryAttempts + 1,
          lastDeliveryError: null,
        },
      );
      return;
    }

    try {
      if (this.hasFirebaseCredentials()) {
        await this.ensureFirebaseApp();

        const response = await getMessaging().sendEachForMulticast({
          tokens: devices.map((device) => device.fcmToken),
          notification: {
            title: event.title,
            body: event.body,
          },
          data: {
            notificationEventId: event.id,
            complaintId: event.complaintId ?? '',
            type: event.type,
          },
        });

        const deliveryOutcome = await this.handleBatchResponse(event, devices, response);
        if (deliveryOutcome === NotificationDeliveryStatus.Delivered) {
          return;
        }

        if (deliveryOutcome === NotificationDeliveryStatus.NoDevices) {
          return;
        }
      } else {
        this.logger.log(
          `Notification ${event.id} marked delivered without FCM credentials (local fallback mode)`,
        );
      }

      await this.notificationEventsRepository.update(
        { id: event.id },
        {
          deliveryStatus: NotificationDeliveryStatus.Delivered,
          deliveryAttempts: event.deliveryAttempts + 1,
          deliveredAt: new Date(),
          lastDeliveryError: null,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Notification delivery failed';
      await this.notificationEventsRepository.update(
        { id: event.id },
        {
          deliveryStatus: NotificationDeliveryStatus.Failed,
          deliveryAttempts: event.deliveryAttempts + 1,
          lastDeliveryError: message,
        },
      );
      throw error;
    }
  }

  async getDeliveryStats(): Promise<{
    events: Record<string, number>;
    devices: { active: number; inactive: number };
  }> {
    const eventRows = await this.notificationEventsRepository
      .createQueryBuilder('event')
      .select('event.deliveryStatus', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('event.deliveryStatus')
      .getRawMany<{ status: string; count: string }>();

    const deviceRows = await this.devicesRepository
      .createQueryBuilder('device')
      .select('device.isActive', 'isActive')
      .addSelect('COUNT(*)', 'count')
      .groupBy('device.isActive')
      .getRawMany<{ isActive: boolean | string; count: string }>();

    const events = eventRows.reduce<Record<string, number>>((accumulator, row) => {
      accumulator[row.status] = Number(row.count);
      return accumulator;
    }, {});

    const devices = deviceRows.reduce(
      (accumulator, row) => {
        const isActive = row.isActive === true || row.isActive === 'true';
        if (isActive) {
          accumulator.active = Number(row.count);
        } else {
          accumulator.inactive = Number(row.count);
        }
        return accumulator;
      },
      { active: 0, inactive: 0 },
    );

    return { events, devices };
  }

  private async enqueueDelivery(notificationEventId: string): Promise<void> {
    await this.queueService.enqueue(
      QueueJobType.NotificationDelivery,
      { notificationEventId },
      {
        dedupeKey: `notification.delivery:${notificationEventId}`,
        maxAttempts: 5,
      },
    );
  }

  private hasFirebaseCredentials(): boolean {
    return Boolean(
      process.env.FCM_PROJECT_ID &&
        process.env.FCM_CLIENT_EMAIL &&
        process.env.FCM_PRIVATE_KEY,
    );
  }

  private async ensureFirebaseApp(): Promise<void> {
    if (getApps().length) {
      return;
    }

    initializeApp({
      credential: cert({
        projectId: process.env.FCM_PROJECT_ID,
        clientEmail: process.env.FCM_CLIENT_EMAIL,
        privateKey: process.env.FCM_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  }

  private async handleBatchResponse(
    event: NotificationEvent,
    devices: UserDevice[],
    response: BatchResponse,
  ): Promise<NotificationDeliveryStatus> {
    const invalidDeviceIds: string[] = [];
    const retryableMessages: string[] = [];

    response.responses.forEach((result, index) => {
      if (result.success) {
        return;
      }

      const code = result.error?.code;
      const message = result.error?.message ?? 'Notification delivery failed';
      const device = devices[index];

      if (device && code && HARD_FAILURE_CODES.has(code)) {
        invalidDeviceIds.push(device.id);
        return;
      }

      retryableMessages.push(message);
    });

    if (invalidDeviceIds.length) {
      await this.devicesRepository.update(
        {
          id: In(invalidDeviceIds),
        },
        {
          isActive: false,
        },
      );
    }

    if (response.successCount > 0) {
      await this.notificationEventsRepository.update(
        { id: event.id },
        {
          deliveryStatus: NotificationDeliveryStatus.Delivered,
          deliveryAttempts: event.deliveryAttempts + 1,
          deliveredAt: new Date(),
          lastDeliveryError:
            invalidDeviceIds.length > 0 ? 'Some device tokens were invalidated during delivery' : null,
        },
      );
      return NotificationDeliveryStatus.Delivered;
    }

    if (invalidDeviceIds.length === devices.length && retryableMessages.length === 0) {
      await this.notificationEventsRepository.update(
        { id: event.id },
        {
          deliveryStatus: NotificationDeliveryStatus.NoDevices,
          deliveryAttempts: event.deliveryAttempts + 1,
          lastDeliveryError: 'All active device tokens were invalid and have been deactivated',
        },
      );
      return NotificationDeliveryStatus.NoDevices;
    }

    throw new Error(retryableMessages[0] ?? 'Notification delivery failed');
  }
}
