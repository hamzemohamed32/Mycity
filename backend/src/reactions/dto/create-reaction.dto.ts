import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateReactionDto {
  @ApiPropertyOptional({ default: 'support' })
  @IsOptional()
  @IsString()
  type?: string;
}

