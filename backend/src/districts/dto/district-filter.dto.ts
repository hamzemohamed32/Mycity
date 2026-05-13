import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class DistrictFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}

