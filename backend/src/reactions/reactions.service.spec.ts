import { NotFoundException } from '@nestjs/common';
import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  let service: ReactionsService;
  let reactionsRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let complaintsRepository: {
    findOne: jest.Mock;
    increment: jest.Mock;
  };
  let redisService: {
    del: jest.Mock;
  };

  beforeEach(() => {
    reactionsRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'reaction-1', ...value })),
    };

    complaintsRepository = {
      findOne: jest.fn(),
      increment: jest.fn(),
    };

    redisService = {
      del: jest.fn(),
    };

    service = new ReactionsService(
      reactionsRepository as never,
      complaintsRepository as never,
      redisService as never,
    );
  });

  it('returns an existing reaction without incrementing support twice', async () => {
    const existing = { id: 'reaction-existing', complaintId: 'complaint-1', userId: 'user-1' };
    reactionsRepository.findOne.mockResolvedValue(existing);

    const result = await service.create('user-1', 'complaint-1', { type: 'support' });

    expect(result).toBe(existing);
    expect(complaintsRepository.increment).not.toHaveBeenCalled();
    expect(redisService.del).not.toHaveBeenCalled();
  });

  it('creates a support reaction, increments support count, and invalidates cache', async () => {
    reactionsRepository.findOne.mockResolvedValue(null);
    complaintsRepository.findOne.mockResolvedValue({ id: 'complaint-1' });

    const result = await service.create('user-1', 'complaint-1', { type: 'support' });

    expect(complaintsRepository.increment).toHaveBeenCalledWith({ id: 'complaint-1' }, 'supportCount', 1);
    expect(redisService.del).toHaveBeenCalledWith('complaint:detail:complaint-1');
    expect(result.id).toBe('reaction-1');
  });

  it('throws when reacting to a missing complaint', async () => {
    reactionsRepository.findOne.mockResolvedValue(null);
    complaintsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.create('user-1', 'missing-complaint', { type: 'support' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
