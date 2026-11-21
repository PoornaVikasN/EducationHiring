import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PresignDto, SIZE_LIMITS, UploadKind } from './presign.dto';

const MB = 1024 * 1024;

describe('presign size limits', () => {
  it('caps intro videos at 5 MB', () => {
    expect(SIZE_LIMITS[UploadKind.INTRO_VIDEO]).toBe(5 * MB);
  });

  it('never allows any kind above the DTO-wide ceiling', async () => {
    for (const kind of Object.values(UploadKind)) {
      const dto = plainToInstance(PresignDto, { kind, contentType: 'x/y', size: SIZE_LIMITS[kind] });
      expect(await validate(dto)).toHaveLength(0);
    }
  });

  it('rejects a presign request larger than 5 MB at the DTO layer', async () => {
    const dto = plainToInstance(PresignDto, {
      kind: UploadKind.INTRO_VIDEO,
      contentType: 'video/mp4',
      size: 5 * MB + 1,
    });
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
