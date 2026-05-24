import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Hospital, HospitalSchema } from '../hospitals/schemas/hospital.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Hospital.name, schema: HospitalSchema },
    ]),
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [MongooseModule],
})
export class SubscriptionsModule {}
