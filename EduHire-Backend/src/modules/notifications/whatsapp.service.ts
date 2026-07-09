import { Injectable, Logger } from '@nestjs/common';
import { redactPhone } from '../../common/utils/redact';
import { SystemConfigService } from '../system-config/system-config.service';

export interface JobAlertPayload {
  jobId: string;
  title: string;
  city: string;
  department: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly systemConfig: SystemConfigService) {}

  async sendJobAlert(whatsappNumber: string, job: JobAlertPayload): Promise<void> {
    const token = await this.systemConfig.getSecret('WHATSAPP_TOKEN').catch(() => null);
    const phoneNumberId = await this.systemConfig.getSecret('WHATSAPP_PHONE_NUMBER_ID').catch(() => null);

    if (!token || !phoneNumberId) {
      this.logger.warn(`[WhatsApp] Not configured — skipping job alert to ${redactPhone(whatsappNumber)}`);
      return;
    }

    const jobUrl = `https://schoolteacher.in/jobs/${job.jobId}`;

    await fetch(
      `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: whatsappNumber.replace('+', ''),
          type: 'template',
          template: {
            name: 'new_job_alert',
            language: { code: 'en' },
            components: [
              {
                type: 'body',
                parameters: [
                  { type: 'text', text: job.title },
                  { type: 'text', text: job.city },
                  { type: 'text', text: jobUrl },
                ],
              },
            ],
          },
        }),
      },
    ).catch((err: unknown) => {
      this.logger.error(`[WhatsApp] Failed to send job alert to ${redactPhone(whatsappNumber)}: ${String(err)}`);
    });
  }
}
