import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GeoPoint } from '../common/types/geo-point.type';
import { District } from './entities/district.entity';

@Injectable()
export class DistrictsService {
  constructor(
    @InjectRepository(District)
    private readonly districtsRepository: Repository<District>,
  ) {}

  findAll(): Promise<District[]> {
    return this.districtsRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findForLocation(location: GeoPoint): Promise<District | null> {
    const [lng, lat] = location.coordinates;
    return this.districtsRepository
      .createQueryBuilder('district')
      .where(
        'district.boundary IS NOT NULL AND ST_Contains(district.boundary, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326))',
        { lng, lat },
      )
      .getOne();
  }
}

