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
import {
  APPLICATION_FEE_PAISE,
  RECRUITER_MONTHLY_PAISE,
  FREE_TIER_JOB_LIMIT,
} from '../../shared/constants/pricing';
import { AuditService } from '../audit/audit.service';
import { SystemConfig, SystemConfigDocument } from './schemas/system-config.schema';

const PRICE_SEEDS: Array<{
  key: string;
  label: string;
  description: string;
  valueNumber: number;
  minValue: number;
}> = [
  {
    key: 'RECRUITER_MONTHLY_PAISE',
    label: 'School Monthly Subscription',
    description: 'Monthly school subscription for unlimited job posts (paise)',
    valueNumber: RECRUITER_MONTHLY_PAISE,
    minValue: 5_000,
  },
  {
    key: 'APPLICATION_FEE_PAISE',
    label: 'Teacher Shortlist Confirmation Fee',
    description: 'Teacher pays after shortlist to confirm interview intent — gated behind TEACHER_PAID_ENABLED (paise)',
    valueNumber: APPLICATION_FEE_PAISE,
    minValue: 1_000,
  },
];

const SETTING_SEEDS: Array<{ key: string; label: string; description: string; valueNumber: number; minValue: number }> = [
  {
    key: 'JOB_ALERT_RADIUS_KM',
    label: 'Job Alert Radius (km)',
    description: 'Radius in kilometres for location-based job alerts. Teachers within this distance of a new job will receive a notification.',
    valueNumber: 30,
    minValue: 5,
  },
  {
    key: 'FREE_TIER_JOB_LIMIT',
    label: 'Free Tier Job Post Limit',
    description: 'Maximum number of active job posts a school can have without a paid subscription.',
    valueNumber: FREE_TIER_JOB_LIMIT,
    minValue: 1,
  },
  {
    key: 'SCHOOL_PAID_ENABLED',
    label: 'School Paid Posting Enabled',
    description: 'When 1, schools must subscribe (RECRUITER_MONTHLY_PAISE) for unlimited posts beyond FREE_TIER_JOB_LIMIT. Set to 0 to make all school posting free.',
    valueNumber: 1,
    minValue: 0,
  },
  {
    key: 'TEACHER_PAID_ENABLED',
    label: 'Teacher Shortlist Fee Enabled',
    description: 'When 1, teachers pay APPLICATION_FEE_PAISE after being shortlisted. Set to 0 (default) for free flow: INTERESTED → SHORTLISTED → WON.',
    valueNumber: 0,
    minValue: 0,
  },
];

// API keys that admins can rotate via the admin UI
export const API_KEY_WHITELIST: Record<string, { label: string; service: string }> = {
  RAZORPAY_KEY_ID: { label: 'Razorpay Key ID', service: 'Payments' },
  RAZORPAY_KEY_SECRET: { label: 'Razorpay Key Secret', service: 'Payments' },
  BREVO_API_KEY: { label: 'Brevo API Key', service: 'Email' },
  MSG91_AUTH_KEY: { label: 'MSG91 Auth Key', service: 'SMS' },
  MSG91_SENDER_ID: { label: 'MSG91 Sender ID', service: 'SMS' },
  MSG91_OTP_TEMPLATE_ID: { label: 'MSG91 OTP Template ID', service: 'SMS' },
  GOOGLE_MAPS_API_KEY: { label: 'Google Maps API Key', service: 'Geolocation' },
  AWS_ACCESS_KEY_ID: { label: 'AWS Access Key ID', service: 'File Storage' },
  AWS_SECRET_ACCESS_KEY: { label: 'AWS Secret Access Key', service: 'File Storage' },
  AWS_BUCKET_NAME: { label: 'AWS Bucket Name', service: 'File Storage' },
  AWS_REGION: { label: 'AWS Region', service: 'File Storage' },
  WHATSAPP_TOKEN: { label: 'WhatsApp Token', service: 'WhatsApp' },
  WHATSAPP_PHONE_NUMBER_ID: { label: 'WhatsApp Phone Number ID', service: 'WhatsApp' },
};

@Injectable()
export class SystemConfigService implements OnModuleInit {
  private readonly logger = new Logger(SystemConfigService.name);

  constructor(
    @InjectModel(SystemConfig.name) private configModel: Model<SystemConfigDocument>,
    private auditService: AuditService,
  ) {}

  async onModuleInit() {
    for (const seed of PRICE_SEEDS) {
      const exists = await this.configModel.findOne({ key: seed.key }).lean().exec();
      if (!exists) {
        await this.configModel.create({ ...seed, type: 'price', updatedByAdminId: null });
        this.logger.log(`Seeded pricing config: ${seed.key} = ${seed.valueNumber}`);
      }
    }
    for (const seed of SETTING_SEEDS) {
      const exists = await this.configModel.findOne({ key: seed.key }).lean().exec();
      if (!exists) {
        await this.configModel.create({ ...seed, type: 'setting', updatedByAdminId: null });
        this.logger.log(`Seeded setting config: ${seed.key} = ${seed.valueNumber}`);
      }
    }
  }

  async getPricePaise(key: string): Promise<number> {
    const doc = await this.configModel.findOne({ key, type: 'price' }).lean().exec();
    if (!doc || doc.valueNumber == null) {
      throw new InternalServerErrorException(`Missing pricing config: ${key}`);
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

  async updateSetting(key: string, valueNumber: number, adminId: string, adminEmail: string): Promise<void> {
    const doc = await this.configModel.findOne({ key, type: 'setting' }).exec();
    if (!doc) throw new BadRequestException(`Unknown setting key: ${key}`);
    if (valueNumber < doc.minValue) {
      throw new BadRequestException(`Minimum value for ${key} is ${doc.minValue}`);
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

  async updatePrice(key: string, valueNumber: number, adminId: string, adminEmail: string): Promise<void> {
    const doc = await this.configModel.findOne({ key, type: 'price' }).exec();
    if (!doc) throw new BadRequestException(`Unknown price key: ${key}`);
    if (valueNumber < doc.minValue) {
      throw new BadRequestException(`Minimum value for ${key} is ${doc.minValue} paise (₹${doc.minValue / 100})`);
    }
    const oldValue = doc.valueNumber;
    await this.configModel.findByIdAndUpdate(doc._id, {
      $set: { valueNumber, updatedByAdminId: new Types.ObjectId(adminId) },
    });
    this.auditService.log(adminId, adminEmail, 'PRICE_UPDATED', 'price', key, doc.label,
      { paise: oldValue, rupees: (oldValue ?? 0) / 100 },
      { paise: valueNumber, rupees: valueNumber / 100 },
    );
  }

  // ── API Key management (Batch E) ─────────────────────────────────────────────

  private getEncryptionKey(): Buffer {
    const secret = process.env.JWT_ACCESS_SECRET ?? 'fallback-key-change-me';
    return Buffer.from(secret.padEnd(32, '0').slice(0, 32));
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
