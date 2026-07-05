import type { Params } from 'nestjs-pino';

// Pino configuration for nestjs-pino.
//   - JSON output in production (ship to ELK / Datadog / CloudWatch).
//   - Pretty-printed in development.
//   - Redacts known PII / secret paths so emails, phones, tokens, passwords, and
//     Authorization headers never reach the log destination in plaintext.
//   - Wires request-id correlation via pino-http (auto for each HTTP request).
//
// Nest's built-in Logger calls (`this.logger.log()` etc.) automatically pipe
// through pino once LoggerModule is registered globally, so existing log lines
// across the codebase pick up structured output + redaction without changes.

export const loggerConfig: Params = {
  pinoHttp: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport:
      process.env.NODE_ENV === 'production'
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:HH:MM:ss.l',
              singleLine: true,
              ignore: 'pid,hostname,req,res',
            },
          },
    redact: {
      paths: [
        // Request/response headers — never log Authorization, cookies, or CSRF header verbatim
        'req.headers.authorization',
        'req.headers.cookie',
        'req.headers["x-requested-with"]',
        'res.headers["set-cookie"]',
        // Request body — keep secrets/PII out
        'req.body.password',
        'req.body.newPassword',
        'req.body.currentPassword',
        'req.body.otp',
        'req.body.code',
        'req.body.accessToken',
        'req.body.idToken',
        'req.body.refreshToken',
        // Generic top-level keys appearing in custom log objects
        'password',
        'passwordHash',
        'newPassword',
        'currentPassword',
        'otp',
        'code',
        'token',
        'accessToken',
        'idToken',
        'refreshToken',
        'cookie',
        'authorization',
        // PII — coarse but useful; consider using redactEmail/redactPhone in code instead
        'email',
        'phone',
        'whatsappNumber',
      ],
      remove: false, // keep keys but replace value with '[Redacted]'
    },
    autoLogging: {
      // Skip noisy paths
      ignore: (req) => {
        const url = (req as { url?: string }).url ?? '';
        return url === '/api/health' || url === '/health';
      },
    },
    customLogLevel: (_req, res, err) => {
      const statusCode = (res as { statusCode?: number }).statusCode ?? 0;
      if (err || statusCode >= 500) return 'error';
      if (statusCode >= 400) return 'warn';
      return 'info';
    },
  },
};
