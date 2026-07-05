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
      return; // No key configured → skip silently
    }
    if (!token) {
      throw new BadRequestException('reCAPTCHA token missing');
    }
    const res = await fetch(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`,
      { method: 'POST' },
    );
    const data = await res.json() as { success: boolean; score: number; action: string };
    this.logger.log(`reCAPTCHA verify action=${action ?? '?'} success=${data.success} score=${data.score}`);
    if (!data.success || data.score < 0.5) {
      throw new BadRequestException('reCAPTCHA verification failed');
    }
  }
}
