import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Subject } from '../../../shared/enums';
import { JobsQueryDto } from './jobs-query.dto';

// Mirrors the global ValidationPipe in main.ts (whitelist + forbidNonWhitelisted + implicit conversion).
async function run(query: Record<string, unknown>) {
  const dto = plainToInstance(JobsQueryDto, query, { enableImplicitConversion: true });
  const errors = await validate(dto, { whitelist: true, forbidNonWhitelisted: true });
  return { dto, errors };
}

describe('JobsQueryDto — Admin > Jobs subject / experience filters', () => {
  it('wraps a single subject (Express 5 sends a lone value as a plain string) in an array', async () => {
    const { dto, errors } = await run({ subjects: Subject.MATHEMATICS });
    expect(errors).toHaveLength(0);
    expect(dto.subjects).toEqual([Subject.MATHEMATICS]);
  });

  it('keeps repeated subject keys as an array', async () => {
    const { dto, errors } = await run({ subjects: [Subject.PHYSICS, Subject.CHEMISTRY] });
    expect(errors).toHaveLength(0);
    expect(dto.subjects).toEqual([Subject.PHYSICS, Subject.CHEMISTRY]);
  });

  it('rejects an unknown subject', async () => {
    const { errors } = await run({ subjects: 'NOT_A_SUBJECT' });
    expect(errors.length).toBeGreaterThan(0);
  });

  it('coerces experienceFrom / experienceTo from query strings to integers', async () => {
    const { dto, errors } = await run({ experienceFrom: '2', experienceTo: '10' });
    expect(errors).toHaveLength(0);
    expect(dto.experienceFrom).toBe(2);
    expect(dto.experienceTo).toBe(10);
  });

  it('rejects out-of-range experience values', async () => {
    expect((await run({ experienceFrom: '-1' })).errors.length).toBeGreaterThan(0);
    expect((await run({ experienceTo: '51' })).errors.length).toBeGreaterThan(0);
  });

  it('still accepts a request with none of the new filters (public search is unaffected)', async () => {
    const { dto, errors } = await run({ page: '2', limit: '10', city: 'Hyderabad' });
    expect(errors).toHaveLength(0);
    expect(dto.subjects).toBeUndefined();
    expect(dto.experienceFrom).toBeUndefined();
  });
});
