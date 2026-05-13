import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateReactionDto } from './dto/create-reaction.dto';
import { ReactionsService } from './reactions.service';

@ApiTags('reactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('complaints/:complaintId/reactions')
export class ReactionsController {
  constructor(private readonly reactionsService: ReactionsService) {}

  @Post()
  create(
    @CurrentUser() user: { sub: string },
    @Param('complaintId') complaintId: string,
    @Body() payload: CreateReactionDto,
  ) {
    return this.reactionsService.create(user.sub, complaintId, payload);
  }
}

