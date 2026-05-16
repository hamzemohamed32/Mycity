import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  fullName!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;
}
