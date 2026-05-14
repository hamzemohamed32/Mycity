import { ApiProperty } from '@nestjs/swagger';

export class UploadSessionResponseDto {
  @ApiProperty()
  objectKey!: string;

  @ApiProperty()
  uploadUrl!: string;

  @ApiProperty()
  publicUrl!: string;

  @ApiProperty()
  expiresAt!: string;

  @ApiProperty({ example: 'PUT' })
  method!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'string',
    },
  })
  headers!: Record<string, string>;
}
