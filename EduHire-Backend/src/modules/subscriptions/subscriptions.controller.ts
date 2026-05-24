import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { SubscriptionsService } from './subscriptions.service';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('me')
  @Roles(Role.RECRUITER)
  getMySubscription(@CurrentUser() user: JwtPayload) {
    return this.subscriptionsService.getMySubscription(user);
  }
}
