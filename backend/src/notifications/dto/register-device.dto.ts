import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RegisterDeviceDto {
  @ApiProperty()
  @IsString()
  fcmToken!: string;

  @ApiProperty()
  @IsString()
  platform!: string;

  @ApiProperty()
  @IsString()
  appVersion!: string;
}

