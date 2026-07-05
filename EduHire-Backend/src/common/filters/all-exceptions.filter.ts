import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

// Global exception filter — produces the project's uniform error envelope.
// In production it suppresses internal stack traces and generic-500 messages for
// non-HttpException errors; in development it forwards the real message for debugging.
// HttpException-derived errors (validation, auth, forbidden, not-found, etc.) are
// always passed through with their original status + message — those are intentional.

interface ErrorEnvelope {
  statusCode: number;
  error: string;
  message: string | string[];
  details?: unknown;
  timestamp: string;
  path: string;
}

const STATUS_TEXT: Record<number, string> = {
  400: 'BadRequest',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'NotFound',
  409: 'Conflict',
  422: 'UnprocessableEntity',
  429: 'TooManyRequests',
  500: 'InternalServerError',
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const isProd = process.env.NODE_ENV === 'production';

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let details: unknown = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (res && typeof res === 'object') {
        const r = res as { message?: string | string[]; error?: string; details?: unknown };
        message = r.message ?? exception.message;
        details = r.details;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // Unexpected error — log full detail server-side; redact for client in prod.
      this.logger.error(
        `Unhandled error on ${request.method} ${request.url}: ${exception.message}`,
        exception.stack,
      );
      if (!isProd) {
        message = exception.message;
        details = { name: exception.name };
      }
    } else {
      this.logger.error(
        `Unhandled non-Error throw on ${request.method} ${request.url}: ${String(exception)}`,
      );
    }

    const envelope: ErrorEnvelope = {
      statusCode: status,
      error: STATUS_TEXT[status] ?? 'Error',
      message,
      ...(details !== undefined ? { details } : {}),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(status).json(envelope);
  }
}
