import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DistrictFilterDto } from './dto/district-filter.dto';
import { DistrictsService } from './districts.service';

@ApiTags('districts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('districts')
export class DistrictsController {
  constructor(private readonly districtsService: DistrictsService) {}

  @Get()
  findAll(@Query() _: DistrictFilterDto) {
    return this.districtsService.findAll();
  }
}

