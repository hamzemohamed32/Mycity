const mockSendEachForMulticast = jest.fn();

jest.mock('firebase-admin/app', () => ({
  cert: jest.fn((value) => value),
  getApps: jest.fn(() => []),
  initializeApp: jest.fn(),
}));

jest.mock('firebase-admin/messaging', () => ({
  getMessaging: jest.fn(() => ({
    sendEachForMulticast: mockSendEachForMulticast,
  })),
}));

import { Complaint, ComplaintCategory, ComplaintStatus } from '../complaints/entities/complaint.entity';
import { QueueService } from '../queue/queue.service';
import { QueueJobType } from '../queue/queue.constants';
import { NotificationDeliveryStatus } from './entities/notification-event.entity';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let devicesRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let notificationEventsRepository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
  };
  let queueService: {
    enqueue: jest.Mock;
  };

  const complaint = {
    id: 'complaint-1',
    createdById: 'user-1',
    category: ComplaintCategory.Water,
    status: ComplaintStatus.Pending,
  } as Complaint;

  beforeEach(() => {
    devicesRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    notificationEventsRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'event-1', ...value })),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };

    queueService = {
      enqueue: jest.fn(),
    };

    delete process.env.FCM_PROJECT_ID;
    delete process.env.FCM_CLIENT_EMAIL;
    delete process.env.FCM_PRIVATE_KEY;
    mockSendEachForMulticast.mockReset();

    service = new NotificationsService(
      devicesRepository as never,
      notificationEventsRepository as never,
      queueService as never,
    );
  });

  it('creates and enqueues complaint-created notifications', async () => {
    await service.notifyComplaintCreated(complaint);

    expect(notificationEventsRepository.save).toHaveBeenCalled();
    expect(queueService.enqueue).toHaveBeenCalledWith(
      QueueJobType.NotificationDelivery,
      { notificationEventId: 'event-1' },
      expect.objectContaining({
        dedupeKey: 'notification.delivery:event-1',
      }),
    );
  });

  it('marks notification events as no-devices when no active devices exist', async () => {
    notificationEventsRepository.findOne.mockResolvedValue({
      id: 'event-1',
      userId: 'user-1',
      complaintId: 'complaint-1',
      title: 'Complaint received',
      body: 'Saved',
      type: 'complaint_created',
      deliveryAttempts: 0,
    });
    devicesRepository.find.mockResolvedValue([]);

    await service.deliverNotificationEvent('event-1');

    expect(notificationEventsRepository.update).toHaveBeenCalledWith(
      { id: 'event-1' },
      expect.objectContaining({
        deliveryStatus: NotificationDeliveryStatus.NoDevices,
      }),
    );
  });

  it('deactivates invalid device tokens and marks the event as no-devices when every token is invalid', async () => {
    process.env.FCM_PROJECT_ID = 'project-id';
    process.env.FCM_CLIENT_EMAIL = 'firebase-admin@example.com';
    process.env.FCM_PRIVATE_KEY = 'private-key';

    notificationEventsRepository.findOne.mockResolvedValue({
      id: 'event-1',
      userId: 'user-1',
      complaintId: 'complaint-1',
      title: 'Complaint received',
      body: 'Saved',
      type: 'complaint_created',
      deliveryAttempts: 2,
    });
    devicesRepository.find.mockResolvedValue([
      { id: 'device-1', fcmToken: 'token-1' },
      { id: 'device-2', fcmToken: 'token-2' },
    ]);
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 0,
      responses: [
        {
          success: false,
          error: {
            code: 'messaging/registration-token-not-registered',
            message: 'Token removed',
          },
        },
        {
          success: false,
          error: {
            code: 'messaging/invalid-registration-token',
            message: 'Token invalid',
          },
        },
      ],
    });

    await service.deliverNotificationEvent('event-1');

    expect(devicesRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.anything(),
      }),
      { isActive: false },
    );
    expect(notificationEventsRepository.update).toHaveBeenCalledWith(
      { id: 'event-1' },
      expect.objectContaining({
        deliveryStatus: NotificationDeliveryStatus.NoDevices,
        deliveryAttempts: 3,
      }),
    );
  });

  it('throws on retryable FCM delivery failures', async () => {
    process.env.FCM_PROJECT_ID = 'project-id';
    process.env.FCM_CLIENT_EMAIL = 'firebase-admin@example.com';
    process.env.FCM_PRIVATE_KEY = 'private-key';

    notificationEventsRepository.findOne.mockResolvedValue({
      id: 'event-1',
      userId: 'user-1',
      complaintId: 'complaint-1',
      title: 'Complaint received',
      body: 'Saved',
      type: 'complaint_created',
      deliveryAttempts: 0,
    });
    devicesRepository.find.mockResolvedValue([{ id: 'device-1', fcmToken: 'token-1' }]);
    mockSendEachForMulticast.mockResolvedValue({
      successCount: 0,
      responses: [
        {
          success: false,
          error: {
            code: 'messaging/internal-error',
            message: 'Provider unavailable',
          },
        },
      ],
    });

    await expect(service.deliverNotificationEvent('event-1')).rejects.toThrow('Provider unavailable');

    expect(notificationEventsRepository.update).toHaveBeenCalledWith(
      { id: 'event-1' },
      expect.objectContaining({
        deliveryStatus: NotificationDeliveryStatus.Failed,
        lastDeliveryError: 'Provider unavailable',
      }),
    );
  });
});
