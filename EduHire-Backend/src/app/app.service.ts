import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { Connection, Model } from 'mongoose';
import { Role } from '../shared/enums';
import { User, UserDocument } from '../modules/users/schemas/user.schema';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectConnection() private readonly mongo: Connection,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedAdmin();
  }

  // Env-var driven, not hardcoded (Hard Rule #2 — no secrets in code). Runs on every
  // boot but is idempotent (skips if the account already exists), so on a fresh prod
  // DB this is the one thing that provisions your first login — set
  // ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD in .env before the first boot against a new
  // database. Safe to leave unset on subsequent boots (or even remove from .env after
  // the account exists) since it's a no-op once the account is already there.
  private async seedAdmin(): Promise<void> {
    const email = this.config.get<string>('ADMIN_SEED_EMAIL');
    const password = this.config.get<string>('ADMIN_SEED_PASSWORD');
    if (!email || !password) {
      this.logger.warn(
        'ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD not set — skipping admin seed. ' +
          'Set both in .env before first boot against a fresh database, or create an admin manually.',
      );
      return;
    }
    await this.seedAdminAccount(email, password);
  }

  private async seedAdminAccount(email: string, password: string): Promise<void> {
    const exists = await this.userModel.findOne({ email: email.toLowerCase() }).lean().exec();
    if (exists) return;

    const passwordHash = await bcrypt.hash(password, 12);
    await this.userModel.create({
      role: Role.ADMIN,
      email: email.toLowerCase(),
      passwordHash,
      emailVerified: true,
      phoneVerified: true,
      isActive: true,
    });
    this.logger.log(`Admin user seeded → ${email}`);
  }

  async getHealthStatus() {
    const stateMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };
    const mongoState = stateMap[this.mongo.readyState] ?? 'unknown';
    const mem = process.memoryUsage();
    return {
      status: mongoState === 'connected' ? 'ok' : 'degraded',
      service: 'schoolteacher-api',
      env: process.env.NODE_ENV ?? 'development',
      mongo: mongoState,
      memory: `${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      uptimeSec: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
