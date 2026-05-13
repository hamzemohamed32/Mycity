import { QueueJob, QueueJobStatus } from './entities/queue-job.entity';
import { QueueService } from './queue.service';

describe('QueueService', () => {
  let service: QueueService;
  let repository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let redisService: {
    withLock: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    redisService = {
      withLock: jest.fn((_: string, __: number, task: () => Promise<QueueJob | null>) => task()),
    };

    service = new QueueService(repository as never, redisService as never);
  });

  it('returns an existing job for a duplicate dedupe key', async () => {
    const existing = { id: 'job-1' } as QueueJob;
    repository.findOne.mockResolvedValue(existing);

    const result = await service.enqueue('notification.delivery', { notificationEventId: 'evt-1' }, {
      dedupeKey: 'notification.delivery:evt-1',
    });

    expect(result).toBe(existing);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('reserves the next pending job through a redis lock', async () => {
    const pendingJob = {
      id: 'job-1',
      type: 'notification.delivery',
      status: QueueJobStatus.Pending,
      attempts: 0,
      createdAt: new Date(),
    } as QueueJob;
    const reservedJob = {
      ...pendingJob,
      status: QueueJobStatus.Processing,
      attempts: 1,
    } as QueueJob;

    repository.findOne
      .mockResolvedValueOnce(pendingJob)
      .mockResolvedValueOnce(reservedJob);
    repository.update.mockResolvedValue({ affected: 1 });

    const result = await service.reserveNext('notification.delivery');

    expect(redisService.withLock).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalled();
    expect(result).toEqual(reservedJob);
  });

  it('marks jobs for retry on failure before max attempts', async () => {
    const job = {
      id: 'job-1',
      type: 'notification.delivery',
      attempts: 1,
      maxAttempts: 5,
      runAfter: new Date(),
    } as QueueJob;

    await service.fail(job, new Error('boom'));

    expect(repository.update).toHaveBeenCalledWith(
      { id: 'job-1' },
      expect.objectContaining({
        status: QueueJobStatus.Pending,
        lastError: 'boom',
      }),
    );
  });
});
