import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateUploadSessionDto } from './dto/create-upload-session.dto';

@Injectable()
export class UploadsService {
  private s3Client: S3Client | null = null;

  async createSession(userId: string, payload: CreateUploadSessionDto): Promise<Record<string, string>> {
    if (!payload.contentType.startsWith('image/')) {
      throw new BadRequestException('Only image uploads are currently supported');
    }

    const bucket = process.env.STORAGE_BUCKET;
    const region = process.env.STORAGE_REGION;
    const accessKeyId = process.env.STORAGE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.STORAGE_SECRET_ACCESS_KEY;

    if (!bucket || !region || !accessKeyId || !secretAccessKey) {
      throw new InternalServerErrorException('Storage configuration is incomplete');
    }

    const safeFileName = payload.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const objectKey = `complaints/${userId}/${randomUUID()}-${safeFileName}`;
    const expiresIn = Number(process.env.STORAGE_SIGNED_URL_EXPIRES_SECONDS ?? 900);

    const uploadUrl = await getSignedUrl(
      this.getClient(region),
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        ContentType: payload.contentType,
      }),
      { expiresIn },
    );

    const publicBaseUrl =
      process.env.STORAGE_PUBLIC_BASE_URL ??
      `${process.env.STORAGE_ENDPOINT?.replace(/\/$/, '') ?? `https://${bucket}.s3.${region}.amazonaws.com`}`;

    return {
      objectKey,
      uploadUrl,
      publicUrl: `${publicBaseUrl.replace(/\/$/, '')}/${objectKey}`,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  }

  private getClient(region: string): S3Client {
    if (!this.s3Client) {
      this.s3Client = new S3Client({
        region,
        endpoint: process.env.STORAGE_ENDPOINT || undefined,
        forcePathStyle: process.env.STORAGE_FORCE_PATH_STYLE === 'true',
        credentials: {
          accessKeyId: process.env.STORAGE_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.STORAGE_SECRET_ACCESS_KEY ?? '',
        },
      });
    }

    return this.s3Client;
  }
}
