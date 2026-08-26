import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsModule } from '../notifications/notifications.module';
import { User, UserSchema } from '../users/schemas/user.schema';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';
import { Dispute, DisputeSchema } from './schemas/dispute.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Dispute.name, schema: DisputeSchema },
      { name: User.name, schema: UserSchema },
    ]),
    // Provides EmailService (used directly below). NotificationsService itself is
    // wired via the dispute.resolved/dispute.rejected events emitted below, not by
    // injecting it here — matches the EventEmitter2 pattern every other module uses.
    NotificationsModule,
  ],
  controllers: [DisputesController],
  providers: [DisputesService],
})
export class DisputesModule {}
