import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SystemConfigService } from '../../modules/system-config/system-config.service';

@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);

  constructor(
    private config: ConfigService,
    private systemConfig: SystemConfigService,
  ) {}

  async verify(token: string | undefined, action?: string): Promise<void> {
    // Skip entirely outside production — localhost scores are always low and
    // the domain isn't registered, so verification will always fail in dev.
    const nodeEnv = this.config.get<string>('NODE_ENV', 'development');
    if (nodeEnv !== 'production') {
      this.logger.debug(`reCAPTCHA skipped (NODE_ENV=${nodeEnv})`);
      return;
    }

    const secretKey =
      (await this.systemConfig.getSecret('RECAPTCHA_SECRET_KEY')) ??
      this.config.get<string>('RECAPTCHA_SECRET_KEY');

    if (!secretKey) {
      // A missing key in production is a real misconfiguration, not routine traffic —
      // log it loudly so it shows up in the Hostinger backend log immediately, instead
      // of silently skipping and leaving auth entirely unprotected with no trace.
      this.logger.error(`reCAPTCHA skipped: RECAPTCHA_SECRET_KEY not configured (action=${action ?? '?'})`);
      return;
    }
    if (!token) {
      throw new BadRequestException('reCAPTCHA token missing');
    }

    let data: { success: boolean; score?: number; action?: string; 'error-codes'?: string[] };
    try {
      const res = await fetch(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
        { method: 'POST' },
      );
      if (!res.ok) {
        this.logger.error(`reCAPTCHA siteverify HTTP ${res.status} for action=${action ?? '?'}`);
        throw new BadRequestException('reCAPTCHA verification failed');
      }
      data = await res.json();
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      // Previously this branch threw uncaught (a network blip or malformed JSON from Google
      // bubbled up as a generic 500), instead of the intended, user-facing BadRequestException.
      this.logger.error(`reCAPTCHA siteverify request failed for action=${action ?? '?'}: ${err instanceof Error ? err.message : String(err)}`);
      throw new BadRequestException('reCAPTCHA verification failed');
    }

    const errorCodes = data['error-codes'] ?? [];
    if (errorCodes.includes('missing-input-secret') || errorCodes.includes('invalid-input-secret')) {
      // Google rejected our own secret key — a genuine configuration problem, not a per-user event.
      this.logger.error(`reCAPTCHA rejected our secret key: error-codes=${JSON.stringify(errorCodes)} action=${action ?? '?'}`);
      throw new BadRequestException('reCAPTCHA verification failed');
    }
    if (!data.success || errorCodes.length > 0) {
      // Client-side token problem (missing/invalid/expired/reused response token) — routine,
      // not a system fault, but still worth a real log line with the actual codes.
      this.logger.warn(`reCAPTCHA token rejected: error-codes=${JSON.stringify(errorCodes)} action=${action ?? '?'}`);
      throw new BadRequestException('reCAPTCHA verification failed');
    }
    if ((data.score ?? 0) < 0.5) {
      // Normal v3 behaviour — genuine users can legitimately score low sometimes. Still logged
      // with full detail so a *pattern* of these (as opposed to one-off) is visible in the logs.
      this.logger.warn(`reCAPTCHA score below threshold: score=${data.score} expectedAction=${action ?? '?'} returnedAction=${data.action ?? '?'}`);
      throw new BadRequestException('reCAPTCHA verification failed');
    }

    this.logger.log(`reCAPTCHA verify ok: action=${data.action ?? '?'} score=${data.score}`);
  }
}
