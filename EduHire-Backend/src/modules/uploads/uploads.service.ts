import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { MIME_ALLOWLIST, PresignDto, SIZE_LIMITS, type UploadKind } from './dto/presign.dto';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private s3: S3Client;
  private bucket: string;

  constructor(private config: ConfigService) {
    this.s3 = new S3Client({
      region: config.getOrThrow<string>('AWS_REGION'),
      credentials: {
        accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY'),
      },
    });
    this.bucket = config.getOrThrow<string>('AWS_BUCKET_NAME');
  }

  async presign(currentUser: JwtPayload, dto: PresignDto) {
    const allowed = MIME_ALLOWLIST[dto.kind];
    if (!allowed.includes(dto.contentType)) {
      throw new BadRequestException(`Invalid content type for ${dto.kind}. Allowed: ${allowed.join(', ')}`);
    }

    const maxSize = SIZE_LIMITS[dto.kind];
    if (dto.size > maxSize) {
      throw new BadRequestException(`File too large. Max size for ${dto.kind}: ${maxSize / 1024 / 1024}MB`);
    }

    const ext = dto.contentType.split('/')[1]?.replace('jpeg', 'jpg') ?? 'bin';
    const key = `${dto.kind}/${currentUser.sub}/${uuid()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: dto.contentType,
      ContentLength: dto.size,
    });

    const url = await getSignedUrl(this.s3, command, { expiresIn: 300 }); // 5 min

    return {
      uploadUrl: url,
      key,
      publicUrl: `https://${this.bucket}.s3.amazonaws.com/${key}`,
      expiresAt: new Date(Date.now() + 300_000),
    };
  }

  // Verify the object actually landed in S3 with the claimed ContentType and a
  // size within the kind's cap. Call BEFORE persisting a URL anywhere so a client
  // can't lie about what they uploaded. Accepts either an S3 key or a full publicUrl
  // (the key is extracted from the URL path).
  async verifyUploadKey(keyOrUrl: string, expectedKind?: UploadKind): Promise<{
    key: string;
    contentType: string;
    contentLength: number;
  }> {
    const key = this.extractKey(keyOrUrl);
    this.logger.log(`verifyUploadKey key=${key} expectedKind=${expectedKind ?? 'none'}`);

    let head;
    try {
      head = await this.s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (err) {
      this.logger.error(`HeadObject failed key=${key}`, err instanceof Error ? err.message : String(err));
      throw new NotFoundException('Upload not found in storage');
    }

    const contentType = head.ContentType ?? '';
    const contentLength = head.ContentLength ?? 0;
    this.logger.log(`HeadObject ok key=${key} contentType=${contentType} size=${contentLength}`);

    if (expectedKind) {
      const allowed = MIME_ALLOWLIST[expectedKind];
      if (!allowed.includes(contentType)) {
        this.logger.warn(
          `verifyUploadKey contentType mismatch key=${key} got=${contentType} expected kinds for ${expectedKind}=${allowed.join(',')}`,
        );
        throw new BadRequestException(
          `Uploaded ContentType (${contentType}) is not allowed for ${expectedKind}.`,
        );
      }
      const maxSize = SIZE_LIMITS[expectedKind];
      if (contentLength > maxSize) {
        this.logger.warn(
          `verifyUploadKey size exceeded key=${key} size=${contentLength} max=${maxSize}`,
        );
        throw new BadRequestException(
          `Uploaded file too large for ${expectedKind} (${contentLength} > ${maxSize}).`,
        );
      }
    }

    return { key, contentType, contentLength };
  }

  private extractKey(keyOrUrl: string): string {
    if (!keyOrUrl) throw new BadRequestException('Empty upload key');
    if (!keyOrUrl.startsWith('http')) return keyOrUrl;
    try {
      const u = new URL(keyOrUrl);
      // Strip leading slash from pathname → leaves "kind/userId/uuid.ext"
      return decodeURIComponent(u.pathname.replace(/^\/+/, ''));
    } catch {
      throw new BadRequestException('Invalid upload URL');
    }
  }
}
