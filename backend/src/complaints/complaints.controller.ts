import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';
import { ComplaintFilterDto } from './dto/complaint-filter.dto';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { ComplaintsService } from './complaints.service';

@ApiTags('complaints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('complaints')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() payload: CreateComplaintDto) {
    return this.complaintsService.create(user.sub, payload);
  }

  @Get()
  findAll(@CurrentUser() user: { role: UserRole; districtId?: string }, @Query() filters: ComplaintFilterDto) {
    return this.complaintsService.findAll(filters, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.complaintsService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.DistrictAdmin, UserRole.CityAdmin, UserRole.SystemAdmin)
  updateStatus(@Param('id') id: string, @Body() payload: UpdateComplaintStatusDto) {
    return this.complaintsService.updateStatus(id, payload);
  }
}

