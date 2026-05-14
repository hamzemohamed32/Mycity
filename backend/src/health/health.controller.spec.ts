import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let queueService: {
    getStats: jest.Mock;
  };
  let redisService: {
    ping: jest.Mock;
  };
  let dataSource: {
    query: jest.Mock;
  };

  beforeEach(() => {
    queueService = {
      getStats: jest.fn().mockResolvedValue({
        pending: 1,
        completed: 2,
      }),
    };

    redisService = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    controller = new HealthController(
      queueService as never,
      redisService as never,
      dataSource as never,
    );
  });

  it('returns database, redis, and queue status', async () => {
    const result = await controller.check();

    expect(dataSource.query).toHaveBeenCalledWith('SELECT 1');
    expect(redisService.ping).toHaveBeenCalled();
    expect(queueService.getStats).toHaveBeenCalled();
    expect(result.status).toBe('ok');
    expect(result.database).toBe('ok');
    expect(result.redis).toBe('PONG');
    expect(result.queue).toEqual({
      pending: 1,
      completed: 2,
    });
    expect(result.timestamp).toBeDefined();
  });
});
