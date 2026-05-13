import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { RegisterDeviceDto } from './dto/register-device.dto';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @CurrentUser() user: { sub: string },
    @Query() query: NotificationQueryDto,
  ) {
    return this.notificationsService.listForUser(user.sub, query.limit);
  }

  @Post('devices')
  registerDevice(@CurrentUser() user: { sub: string }, @Body() payload: RegisterDeviceDto) {
    return this.notificationsService.registerDevice(user.sub, payload);
  }
}
