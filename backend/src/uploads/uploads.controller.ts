import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateUploadSessionDto } from './dto/create-upload-session.dto';
import { UploadSessionResponseDto } from './dto/upload-session-response.dto';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('sessions')
  @ApiOkResponse({ type: UploadSessionResponseDto })
  async createSession(@CurrentUser() user: { sub: string }, @Body() payload: CreateUploadSessionDto) {
    return this.uploadsService.createSession(user.sub, payload);
  }
}
