import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model, Types } from 'mongoose';
import { AuditService } from '../audit/audit.service';
import { SystemConfig, SystemConfigDocument } from './schemas/system-config.schema';

// ─── Pricing is 100% dynamic (see DECISIONS.md D29) ──────────────────────────
// NO PRICE_SEEDS array here. Every price lives in `SystemConfig{type:'price'}`
// and is populated by the admin via UI at go-live. `getPricePaise(key)` throws
// on missing keys so payment endpoints hard-fail until admin configures.

type SettingSeed = {
  key: string;
  label: string;
  description: string;
  valueNumber: number;
  minValue: number;
  maxValue?: number;
  displayKind?: 'boolean' | 'number';
  unit?: string;
};

const SETTING_SEEDS: SettingSeed[] = [
  {
    key: 'JOB_ALERT_RADIUS_KM',
    label: 'Job Alert Radius',
    description:
      'Radius for location-based job alerts. Teachers whose saved location is within this distance of a newly posted role will receive a notification — even if the job city does not match their preferred city list. Minimum 5 km, maximum 200 km.',
    valueNumber: 30,
    minValue: 5,
    maxValue: 200,
    unit: 'km',
    displayKind: 'number',
  },
  {
    key: 'SCHOOL_PAID_ENABLED',
    label: 'School job posting is paid',
    description:
      'When ON (default), schools without an active subscription are limited to the free-tier monthly job post quota (see FREE_TIER_JOB_LIMIT) and must subscribe for unlimited posts. When OFF, all job posts go live immediately regardless of subscription or free-tier usage.',
    valueNumber: 1,
    minValue: 0,
    maxValue: 1,
    displayKind: 'boolean',
  },
  {
    key: 'FREE_TIER_JOB_LIMIT',
    label: 'Free Tier Job Post Limit',
    description:
      'Number of active job posts a school may create per calendar month without an active subscription, while SCHOOL_PAID_ENABLED is on.',
    valueNumber: 2,
    minValue: 0,
    displayKind: 'number',
  },
  {
    key: 'TEACHER_PAID_ENABLED',
    label: 'Teacher shortlist fee is paid',
    description:
      'When ON, a shortlisted teacher must pay the application fee (see APPLICATION_FEE_PAISE) within the pay window to unlock school contact details and move to WON. When OFF (default), shortlisted teachers move straight through to WON/CLOSED with no payment step.',
    valueNumber: 0,
    minValue: 0,
    maxValue: 1,
    displayKind: 'boolean',
  },
  {
    key: 'JOB_LISTING_DURATION_DAYS',
    label: 'Job Listing Duration',
    description:
      'How many days a job posting stays active before it auto-expires. Also the length of time a Boost payment re-activates an expired listing for. Industry-typical range is 30-45 days.',
    valueNumber: 30,
    minValue: 7,
    maxValue: 90,
    unit: 'days',
    displayKind: 'number',
  },
  {
    key: 'BULK_IMPORT_MAX_ROWS',
    label: 'Bulk Import Max Rows',
    description:
      'Maximum number of data rows accepted in a single Admin → Users bulk-import Excel file. Uploads processed synchronously within the request, so keep this bounded to what completes in a reasonable time.',
    valueNumber: 2000,
    minValue: 100,
    maxValue: 5000,
    unit: 'rows',
    displayKind: 'number',
  },
];

// API keys that admins can rotate via the admin UI.
// Add integrations here as they're wired.
export const API_KEY_WHITELIST: Record<string, { label: string; service: string }> = {
  RAZORPAY_KEY_ID: { label: 'Razorpay Key ID', service: 'Payments' },
  RAZORPAY_KEY_SECRET: { label: 'Razorpay Key Secret', service: 'Payments' },
  RAZORPAY_WEBHOOK_SECRET: { label: 'Razorpay Webhook Secret', service: 'Payments' },
  GMAIL_USER: { label: 'Gmail Sender Address', service: 'Email' },
  GMAIL_CLIENT_ID: { label: 'Gmail OAuth2 Client ID', service: 'Email' },
  GMAIL_CLIENT_SECRET: { label: 'Gmail OAuth2 Client Secret', service: 'Email' },
  GMAIL_REFRESH_TOKEN: { label: 'Gmail OAuth2 Refresh Token', service: 'Email' },
  GOOGLE_API: { label: 'Google UserInfo Endpoint URL', service: 'Google OAuth' },
  GOOGLE_CLIENT_ID: { label: 'Google OAuth Client ID', service: 'Google OAuth' },
  GOOGLE_CLIENT_SECRET: { label: 'Google OAuth Client Secret', service: 'Google OAuth' },
  GOOGLE_MAPS_API_KEY: { label: 'Google Maps API Key', service: 'Geolocation' },
  AWS_ACCESS_KEY_ID: { label: 'AWS Access Key ID', service: 'File Storage' },
  AWS_SECRET_ACCESS_KEY: { label: 'AWS Secret Access Key', service: 'File Storage' },
  AWS_BUCKET_NAME: { label: 'AWS Bucket Name', service: 'File Storage' },
  AWS_REGION: { label: 'AWS Region', service: 'File Storage' },
  AWS_BASE_URL: { label: 'AWS S3 Bucket Public Base URL', service: 'File Storage' },
  RECAPTCHA_SECRET_KEY: { label: 'reCAPTCHA v3 Secret Key', service: 'Security' },
};

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    @InjectModel(SystemConfig.name) private configModel: Model<SystemConfigDocument>,
    private auditService: AuditService,
  ) {}

  async onModuleInit() {
    // ── No pricing seeds (D29). Admin fills at go-live.

    for (const seed of SETTING_SEEDS) {
      const exists = await this.configModel.findOne({ key: seed.key }).lean().exec();
      if (!exists) {
        await this.configModel.create({ ...seed, type: 'setting', updatedByAdminId: null });
        this.logger.log(`Seeded setting config: ${seed.key} = ${seed.valueNumber}`);
      } else {
        // Back-fill metadata on previously-seeded docs that pre-date these fields.
        // Idempotent — only writes the metadata, never touches valueNumber.
        const patch: Record<string, unknown> = {};
        if (seed.displayKind !== undefined && (exists as { displayKind?: string }).displayKind !== seed.displayKind) {
          patch['displayKind'] = seed.displayKind;
        }
        if (seed.unit !== undefined && (exists as { unit?: string }).unit !== seed.unit) {
          patch['unit'] = seed.unit;
        }
        if (seed.maxValue !== undefined && (exists as { maxValue?: number | null }).maxValue !== seed.maxValue) {
          patch['maxValue'] = seed.maxValue;
        }
        if (seed.label && (exists as { label?: string }).label !== seed.label) {
          patch['label'] = seed.label;
        }
        if (seed.description && (exists as { description?: string }).description !== seed.description) {
          patch['description'] = seed.description;
        }
        if (Object.keys(patch).length > 0) {
          await this.configModel.updateOne({ key: seed.key }, { $set: patch });
          this.logger.log(`Back-filled setting metadata: ${seed.key} ← ${JSON.stringify(patch)}`);
        }
      }
    }
  }

  /**
   * Reads a price from SystemConfig. Throws if unset — payment endpoints
   * hard-fail on missing config so admin must set every price before go-live.
   * This is the deliberate D29 behaviour: no fallback constants.
   */
  async getPricePaise(key: string): Promise<number> {
    const doc = await this.configModel.findOne({ key, type: 'price' }).lean().exec();
    if (!doc || doc.valueNumber == null) {
      throw new InternalServerErrorException(
        `Missing pricing config: ${key}. Admin must set this via Settings → Pricing before this endpoint is usable.`,
      );
    }
    return doc.valueNumber;
  }

  async getAllPrices(): Promise<SystemConfigDocument[]> {
    return this.configModel.find({ type: 'price' }).lean().exec() as any;
  }

  async getAllSettings(): Promise<SystemConfigDocument[]> {
    return this.configModel.find({ type: 'setting' }).lean().exec() as any;
  }

  async getSettingNumber(key: string, fallback: number): Promise<number> {
    const doc = await this.configModel.findOne({ key, type: 'setting' }).lean().exec();
    return doc?.valueNumber ?? fallback;
  }

  async getSettingBoolean(key: string, fallback: boolean): Promise<boolean> {
    const num = await this.getSettingNumber(key, fallback ? 1 : 0);
    return num !== 0;
  }

  // Job listing active-window length, in ms — admin-editable via JOB_LISTING_DURATION_DAYS
  // (days, not ms, since that's what the admin Settings UI shows). Centralised here so the
  // three call sites (create, boost, re-boost) can't drift on the day→ms conversion.
  async getJobListingDurationMs(): Promise<number> {
    const days = await this.getSettingNumber('JOB_LISTING_DURATION_DAYS', 30);
    return days * 24 * 60 * 60 * 1000;
  }

  async updateSetting(key: string, valueNumber: number, adminId: string, adminEmail: string): Promise<void> {
    if (typeof valueNumber !== 'number' || Number.isNaN(valueNumber)) {
      // Without this guard, a missing/malformed body silently no-ops below (Mongoose
      // drops `undefined` from $set, and `undefined < doc.minValue` is always false) —
      // the endpoint would return 200 while changing nothing, with zero error feedback.
      throw new BadRequestException('value must be a number');
    }
    const doc = await this.configModel.findOne({ key, type: 'setting' }).exec();
    if (!doc) throw new BadRequestException(`Unknown setting key: ${key}`);
    if (valueNumber < doc.minValue) {
      throw new BadRequestException(`Minimum value for ${key} is ${doc.minValue}`);
    }
    if (doc.maxValue != null && valueNumber > doc.maxValue) {
      throw new BadRequestException(`Maximum value for ${key} is ${doc.maxValue}`);
    }
    const oldValue = doc.valueNumber;
    await this.configModel.findByIdAndUpdate(doc._id, {
      $set: { valueNumber, updatedByAdminId: new Types.ObjectId(adminId) },
    });
    this.auditService.log(adminId, adminEmail, 'SETTING_UPDATED', 'setting', key, doc.label,
      { value: oldValue },
      { value: valueNumber },
    );
  }

  /**
   * Create OR update a price row. Because pricing is fully dynamic, admin
   * both creates new pricing keys AND edits existing ones through this method.
   * The service accepts a full seed spec so a brand-new key can be created
   * from the UI without a code deploy.
   */
  async upsertPrice(
    key: string,
    valueNumber: number,
    adminId: string,
    adminEmail: string,
    meta?: { label?: string; description?: string; minValue?: number },
  ): Promise<void> {
    const existing = await this.configModel.findOne({ key, type: 'price' }).exec();
    const oldValue = existing?.valueNumber ?? null;
    const label = meta?.label ?? existing?.label ?? key;
    const description = meta?.description ?? existing?.description ?? '';
    const minValue = meta?.minValue ?? existing?.minValue ?? 0;
    if (valueNumber < minValue) {
      throw new BadRequestException(`Minimum value for ${key} is ${minValue} paise (₹${minValue / 100})`);
    }
    await this.configModel.findOneAndUpdate(
      { key, type: 'price' },
      {
        $set: {
          key, type: 'price', label, description, minValue, valueNumber,
          updatedByAdminId: new Types.ObjectId(adminId),
        },
      },
      { upsert: true },
    );
    this.auditService.log(adminId, adminEmail, existing ? 'PRICE_UPDATED' : 'PRICE_CREATED', 'price', key, label,
      { paise: oldValue, rupees: oldValue == null ? null : oldValue / 100 },
      { paise: valueNumber, rupees: valueNumber / 100 },
    );
  }

  // ── API Key management (encrypted at rest) ─────────────────────────────

  private getEncryptionKey(): Buffer {
    const secret = process.env.CONFIG_ENCRYPTION_KEY;
    if (!secret || secret.length < 32) {
      throw new Error('CONFIG_ENCRYPTION_KEY is missing or too short (≥32 chars required).');
    }
    return crypto.createHash('sha256').update(secret, 'utf8').digest();
  }

  private encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    return `${iv.toString('base64')}:${encrypted.toString('base64')}`;
  }

  private decrypt(stored: string): string {
    const [ivB64, dataB64] = stored.split(':') as [string, string];
    const iv = Buffer.from(ivB64, 'base64');
    const data = Buffer.from(dataB64, 'base64');
    const decipher = crypto.createDecipheriv('aes-256-cbc', this.getEncryptionKey(), iv);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  async getSecret(key: string): Promise<string | undefined> {
    const doc = await this.configModel.findOne({ key, type: 'api_key' }).lean().exec();
    if (doc?.valueString) {
      try {
        return this.decrypt(doc.valueString);
      } catch {
        return undefined;
      }
    }
    return process.env[key];
  }

  async setSecret(key: string, plaintext: string, adminId: string, adminEmail: string): Promise<void> {
    if (!API_KEY_WHITELIST[key]) throw new BadRequestException(`Key "${key}" is not configurable via admin UI`);
    const encrypted = this.encrypt(plaintext);
    await this.configModel.findOneAndUpdate(
      { key },
      { $set: { key, valueString: encrypted, type: 'api_key', label: API_KEY_WHITELIST[key].label, description: '', minValue: 0, updatedByAdminId: new Types.ObjectId(adminId) } },
      { upsert: true },
    );
    this.auditService.log(adminId, adminEmail, 'API_KEY_SET', 'api_key', key, API_KEY_WHITELIST[key].label,
      { isSet: false },
      { isSet: true },
    );
  }

  async getApiKeyStatuses(): Promise<Array<{ key: string; label: string; service: string; isSet: boolean }>> {
    const docs = await this.configModel.find({ type: 'api_key' }).lean().exec();
    const dbKeys = new Map(docs.map((d) => [d.key, !!d.valueString]));

    return Object.entries(API_KEY_WHITELIST).map(([key, { label, service }]) => ({
      key,
      label,
      service,
      isSet: dbKeys.get(key) ?? !!process.env[key],
    }));
  }
}
