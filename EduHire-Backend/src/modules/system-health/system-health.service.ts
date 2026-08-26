import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemHealthFlag, SystemHealthFlagDocument } from './schemas/system-health-flag.schema';

@Injectable()
export class SystemHealthService {
  private readonly logger = new Logger(SystemHealthService.name);

  constructor(
    @InjectModel(SystemHealthFlag.name) private flagModel: Model<SystemHealthFlagDocument>,
  ) {}

  // Fire-and-forget by design (callers wrap with .catch()) — a health-flag write must
  // never be why a real send/action fails or gets delayed.
  async reportDown(key: string, label: string, error: string): Promise<void> {
    const existing = await this.flagModel.findOne({ key }).lean().exec();
    await this.flagModel.findOneAndUpdate(
      { key },
      {
        $set: {
          label,
          status: 'down',
          lastError: error,
          // Keep the original downSince if this integration was already down —
          // otherwise every failure would reset the "down for X" clock to zero.
          downSince: existing?.status === 'down' ? existing.downSince : new Date(),
        },
      },
      { upsert: true },
    );
    this.logger.warn(`Health flag DOWN: ${key} — ${error}`);
  }

  async reportOk(key: string, label: string): Promise<void> {
    const existing = await this.flagModel.findOne({ key }).lean().exec();
    await this.flagModel.findOneAndUpdate(
      { key },
      { $set: { label, status: 'ok', lastError: null, downSince: null, lastOkAt: new Date() } },
      { upsert: true },
    );
    if (existing?.status === 'down') {
      this.logger.log(`Health flag recovered: ${key}`);
    }
  }

  async getAll(): Promise<SystemHealthFlagDocument[]> {
    // 'down' sorts before 'ok' alphabetically — problems surface first with zero
    // frontend sorting logic needed.
    return this.flagModel.find({}).sort({ status: 1, key: 1 }).lean().exec();
  }
}
