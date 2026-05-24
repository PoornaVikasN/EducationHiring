import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuid } from 'uuid';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { MIME_ALLOWLIST, PresignDto, SIZE_LIMITS } from './dto/presign.dto';

@Injectable()
export class UploadsService {
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
}
