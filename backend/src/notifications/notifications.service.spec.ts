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
});
