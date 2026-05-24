import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SubscriptionStatus } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { Hospital, HospitalDocument } from '../hospitals/schemas/hospital.schema';
import { Subscription, SubscriptionDocument } from './schemas/subscription.schema';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectModel(Subscription.name) private subModel: Model<SubscriptionDocument>,
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
  ) {}

  async getActiveForHospital(hospitalId: string): Promise<SubscriptionDocument | null> {
    return this.subModel
      .findOne({
        hospitalId: new Types.ObjectId(hospitalId),
        status: SubscriptionStatus.ACTIVE,
        expiresAt: { $gt: new Date() },
        deletedAt: null,
      })
      .sort({ expiresAt: -1 })
      .exec();
  }

  async getMySubscription(user: JwtPayload) {
    const hospital = await this.hospitalModel
      .findOne({ adminUserId: new Types.ObjectId(user.sub) })
      .lean()
      .exec();
    if (!hospital) return null;

    return this.subModel
      .findOne({ hospitalId: hospital._id, deletedAt: null })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }
}
