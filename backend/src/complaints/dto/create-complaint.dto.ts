import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { ComplaintCategory } from '../entities/complaint.entity';

class LocationDto {
  @ApiProperty()
  @IsNumber()
  lng!: number;

  @ApiProperty()
  @IsNumber()
  lat!: number;
}

export class CreateComplaintDto {
  @ApiProperty()
  @IsString()
  @MaxLength(2000)
  description!: string;

  @ApiProperty({ enum: ComplaintCategory })
  @IsEnum(ComplaintCategory)
  category!: ComplaintCategory;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  location!: LocationDto;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  clientRequestId?: string;
}

