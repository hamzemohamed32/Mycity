import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;
  let commentsRepository: {
    create: jest.Mock;
    save: jest.Mock;
  };
  let redisService: {
    del: jest.Mock;
  };

  beforeEach(() => {
    commentsRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ id: 'comment-1', ...value })),
    };

    redisService = {
      del: jest.fn(),
    };

    service = new CommentsService(commentsRepository as never, redisService as never);
  });

  it('creates a comment and invalidates the complaint detail cache', async () => {
    const result = await service.create('user-1', 'complaint-1', {
      body: 'This is still flooding.',
    });

    expect(commentsRepository.create).toHaveBeenCalledWith({
      authorId: 'user-1',
      complaintId: 'complaint-1',
      body: 'This is still flooding.',
    });
    expect(redisService.del).toHaveBeenCalledWith('complaint:detail:complaint-1');
    expect(result.id).toBe('comment-1');
  });
});
