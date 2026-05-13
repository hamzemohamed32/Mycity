import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadsService } from './uploads.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('UploadsService', () => {
  let service: UploadsService;

  beforeEach(() => {
    jest.resetAllMocks();
    service = new UploadsService();
    process.env.STORAGE_BUCKET = 'my-city-local';
    process.env.STORAGE_REGION = 'us-east-1';
    process.env.STORAGE_ACCESS_KEY_ID = 'access-key';
    process.env.STORAGE_SECRET_ACCESS_KEY = 'secret-key';
    process.env.STORAGE_SIGNED_URL_EXPIRES_SECONDS = '900';
    delete process.env.STORAGE_ENDPOINT;
    delete process.env.STORAGE_PUBLIC_BASE_URL;
  });

  it('rejects non-image content types', async () => {
    await expect(
      service.createSession('user-1', {
        fileName: 'report.pdf',
        contentType: 'application/pdf',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects incomplete storage configuration', async () => {
    delete process.env.STORAGE_BUCKET;

    await expect(
      service.createSession('user-1', {
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('returns a signed upload session', async () => {
    (getSignedUrl as jest.Mock).mockResolvedValue('https://signed-upload-url');

    const result = await service.createSession('user-1', {
      fileName: 'photo.jpg',
      contentType: 'image/jpeg',
    });

    expect(result.uploadUrl).toBe('https://signed-upload-url');
    expect(result.objectKey).toContain('complaints/user-1/');
    expect(result.publicUrl).toContain('/complaints/user-1/');
    expect(result.expiresAt).toBeDefined();
  });
});
