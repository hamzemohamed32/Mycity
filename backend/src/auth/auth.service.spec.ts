import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { hashSync } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { User, UserRole } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let jwtService: jest.Mocked<JwtService>;

  const user: User = {
    id: 'user-1',
    email: 'citizen@mycity.local',
    phone: null,
    fullName: 'Citizen Demo',
    password: hashSync('Password123!', 10),
    role: UserRole.Citizen,
    districtId: null,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    complaints: [],
    comments: [],
    reactions: [],
    devices: [],
    hashPassword: jest.fn(),
  };

  beforeEach(() => {
    usersService = {
      create: jest.fn(),
      findByEmailOrPhone: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    jwtService = {
      signAsync: jest.fn(),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    jwtService.signAsync
      .mockResolvedValueOnce('access-token')
      .mockResolvedValueOnce('refresh-token');

    service = new AuthService(usersService, jwtService);
  });

  it('registers a user and issues tokens', async () => {
    usersService.create.mockResolvedValue(user);

    const result = await service.register({
      fullName: 'Citizen Demo',
      email: 'citizen@mycity.local',
      password: 'Password123!',
    });

    expect(usersService.create).toHaveBeenCalled();
    expect(result.user).toBe(user);
    expect(result.tokens).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('throws when credentials are invalid', async () => {
    usersService.findByEmailOrPhone.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'citizen@mycity.local',
        password: 'wrong-pass',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refreshes tokens from a valid refresh token', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: user.id } as never);
    usersService.findById.mockResolvedValue(user);
    jwtService.signAsync
      .mockReset()
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');

    const result = await service.refreshToken('refresh-token');

    expect(jwtService.verifyAsync).toHaveBeenCalled();
    expect(usersService.findById).toHaveBeenCalledWith(user.id);
    expect(result).toEqual({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  });
});
