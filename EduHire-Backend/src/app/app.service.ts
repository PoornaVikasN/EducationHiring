import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
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
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedAdmin();
  }

  private async seedAdmin(): Promise<void> {
    const exists = await this.userModel
      .findOne({ email: 'admin@eduhire.com' })
      .lean()
      .exec();
    if (exists) return;

    const passwordHash = await bcrypt.hash('Andhra@1234', 12);
    await this.userModel.create({
      role: Role.ADMIN,
      email: 'admin@eduhire.com',
      passwordHash,
      emailVerified: true,
      phoneVerified: true,
      isActive: true,
    });
    this.logger.log('Admin user seeded → admin@eduhire.com');
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
      service: 'eduhire-api',
      env: process.env.NODE_ENV ?? 'development',
      mongo: mongoState,
      memory: `${Math.round(mem.heapUsed / 1024 / 1024)}MB / ${Math.round(mem.heapTotal / 1024 / 1024)}MB`,
      uptimeSec: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
