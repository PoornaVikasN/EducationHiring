import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { json, urlencoded, type NextFunction, type Request, type Response } from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app/app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * Body-only Mongo-operator sanitizer. Walks req.body in place and renames any
 * key starting with $ or containing a dot. Skips req.query/req.params because
 * (a) those are read-only getters on Node 20+ (express-mongo-sanitize crashes
 * trying to mutate them) and (b) our query/path DTOs already type-coerce, so
 * `{$ne:null}` in a query string lands as the string `"[object Object]"`
 * and fails validation cleanly.
 */
function sanitizeMongoOperators(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    for (const item of value) sanitizeMongoOperators(item);
    return;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      const safeKey = key.replace(/^\$/, '_').replace(/\./g, '_');
      obj[safeKey] = obj[key];
      delete obj[key];
      sanitizeMongoOperators(obj[safeKey]);
    } else {
      sanitizeMongoOperators(obj[key]);
    }
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });

  // Replace Nest's default logger with pino — existing Logger calls auto-pipe through
  // with structured JSON output + PII redaction (see config/logger.config.ts).
  app.useLogger(app.get(Logger));

  // Behind a reverse proxy (nginx on Hostinger). Lets Express trust the
  // X-Forwarded-* headers so req.ip and req.secure reflect the real client / scheme.
  // Required for accurate IPs in audit logs and for `secure: true` cookies to be set.
  const expressApp = app.getHttpAdapter().getInstance() as {
    set?: (k: string, v: unknown) => void;
  };
  expressApp.set?.('trust proxy', 1);

  app.setGlobalPrefix('api');

  app.use(cookieParser());
  app.use(
    helmet({
      // Default COOP=same-origin blocks Google OAuth popups from postMessage-ing
      // back to our window (Chrome refuses window.opener calls). same-origin-allow-popups
      // keeps process isolation against random popups while letting OAuth flows complete.
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    }),
  );

  // Explicit body-size cap: shuts down megabyte-spam DoS. All file uploads go
  // direct-to-S3 via presign, so 1mb is plenty for JSON.
  app.use(json({ limit: '1mb' }));
  app.use(urlencoded({ extended: true, limit: '1mb' }));

  // Strip Mongo operator keys ($-prefixed, dot-containing) from req.body.
  // Defends against operator injection like `{"email":{"$ne":null}}` in login bodies.
  // Renames (vs deletes) so tampered keys land as `_ne` in downstream validation —
  // logs catch attempts without 500ing legit traffic.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    if (req.body) sanitizeMongoOperators(req.body);
    next();
  });

  const corsOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (corsOrigins.length === 0) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CORS_ORIGINS must be set in production (comma-separated list of allowed origins).',
      );
    }
    corsOrigins.push('http://localhost:3000');
  }
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-CSRF-Token',
    ],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.SERVER_PORT) || 3001;
  await app.listen(port);
}

void bootstrap();
