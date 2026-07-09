import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubscriptionStatus } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { School, SchoolDocument } from '../schools/schemas/school.schema';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name) private subModel: Model<SubscriptionDocument>,
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
  ) {}

  async getActiveForSchool(schoolId: string): Promise<SubscriptionDocument | null> {
    return this.subModel
      .findOne({
        schoolId: new Types.ObjectId(schoolId),
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { $gt: new Date() },
        deletedAt: null,
      })
      .sort({ expiresAt: -1 })
      .exec();
  }

  async getMySubscription(user: JwtPayload) {
    const school = await this.schoolModel
      .findOne({ adminUserId: new Types.ObjectId(user.sub) })
      .lean()
      .exec();
    if (!school) return null;

    return this.subModel
      .findOne({ schoolId: school._id, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}
