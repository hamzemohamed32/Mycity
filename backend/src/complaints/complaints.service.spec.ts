import { NotFoundException } from '@nestjs/common';
import { ComplaintCategory, ComplaintStatus } from './entities/complaint.entity';
import { ComplaintsService } from './complaints.service';

describe('ComplaintsService', () => {
  let service: ComplaintsService;
  let complaintsRepository: {
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let districtsService: {
    findForLocation: jest.Mock;
  };
  let notificationsService: {
    notifyComplaintCreated: jest.Mock;
    notifyComplaintStatusChanged: jest.Mock;
  };
  let redisService: {
    getJson: jest.Mock;
    setJson: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    complaintsRepository = {
      findOne: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(),
    };

    districtsService = {
      findForLocation: jest.fn(),
    };

    notificationsService = {
      notifyComplaintCreated: jest.fn(),
      notifyComplaintStatusChanged: jest.fn(),
    };

    redisService = {
      getJson: jest.fn(),
      setJson: jest.fn(),
      del: jest.fn(),
    };

    service = new ComplaintsService(
      complaintsRepository as never,
      districtsService as never,
      notificationsService as never,
      redisService as never,
    );
  });

  it('returns an existing complaint for the same clientRequestId', async () => {
    const existing = { id: 'complaint-1', createdById: 'user-1', clientRequestId: 'abc-123' };
    complaintsRepository.findOne.mockResolvedValue(existing);

    const result = await service.create('user-1', {
      description: 'Water leak',
      category: ComplaintCategory.Water,
      clientRequestId: 'abc-123',
      location: { lat: -1.2, lng: 36.8 },
    });

    expect(result).toBe(existing);
    expect(complaintsRepository.create).not.toHaveBeenCalled();
    expect(notificationsService.notifyComplaintCreated).not.toHaveBeenCalled();
  });

  it('creates a complaint, resolves district, and notifies the user', async () => {
    complaintsRepository.findOne.mockResolvedValue(null);
    districtsService.findForLocation.mockResolvedValue({ id: 'district-1' });
    complaintsRepository.save.mockImplementation(async (value) => ({
      id: 'complaint-2',
      ...value,
    }));

    const result = await service.create('user-1', {
      description: 'Street light out',
      category: ComplaintCategory.Lighting,
      clientRequestId: 'request-1',
      location: { lat: -1.286389, lng: 36.817223 },
      imageUrl: 'https://cdn.example.com/light.jpg',
    });

    expect(complaintsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        createdById: 'user-1',
        districtId: 'district-1',
        metadata: { clientRequestId: 'request-1' },
        location: {
          type: 'Point',
          coordinates: [36.817223, -1.286389],
        },
      }),
    );
    expect(notificationsService.notifyComplaintCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'complaint-2' }),
    );
    expect(result.id).toBe('complaint-2');
  });

  it('updates complaint status, clears cache, and notifies the user', async () => {
    const complaint = {
      id: 'complaint-3',
      status: ComplaintStatus.Pending,
      assignedAdminId: null,
      createdById: 'user-1',
    };

    redisService.getJson.mockResolvedValue(complaint);
    complaintsRepository.save.mockImplementation(async (value) => value);

    const result = await service.updateStatus('complaint-3', {
      status: ComplaintStatus.InProgress,
      assignedAdminId: 'admin-1',
    });

    expect(result.status).toBe(ComplaintStatus.InProgress);
    expect(result.assignedAdminId).toBe('admin-1');
    expect(redisService.del).toHaveBeenCalledWith('complaint:detail:complaint-3');
    expect(notificationsService.notifyComplaintStatusChanged).toHaveBeenCalledWith(result);
  });

  it('throws when updating a missing complaint', async () => {
    redisService.getJson.mockResolvedValue(null);
    complaintsRepository.findOne.mockResolvedValue(null);

    await expect(
      service.findOne('missing-complaint'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
