import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { User, UserRole } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(payload: CreateUserDto): Promise<User> {
    if (!payload.email && !payload.phone) {
      throw new ConflictException('Either email or phone is required');
    }

    const existing = await this.findByEmailOrPhone(payload.email, payload.phone);
    if (existing) {
      throw new ConflictException('User already exists');
    }

    const entity = this.usersRepository.create({
      ...payload,
      role: payload.role ?? UserRole.Citizen,
    });

    return this.usersRepository.save(entity);
  }

  async findById(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmailOrPhone(email?: string, phone?: string, includePassword = false): Promise<User | null> {
    if (!email && !phone) {
      return null;
    }

    const query = this.usersRepository.createQueryBuilder('user');
    if (includePassword) {
      query.addSelect('user.password');
    }

    query.where('user.email = :email', { email: email ?? null }).orWhere('user.phone = :phone', {
      phone: phone ?? null,
    });

    return query.getOne();
  }
}
