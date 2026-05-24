import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateOrderDto, WebhookDto } from './dto/create-order.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // Create Razorpay order (seeker for application, recruiter for job-post/boost/subscription)
  @Post('order')
  createOrder(@CurrentUser() user: JwtPayload, @Body() dto: CreateOrderDto) {
    return this.paymentsService.createOrder(user, dto);
  }

  // Webhook from Razorpay (also called from FE after checkout success)
  @Public()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verify(@Body() dto: WebhookDto) {
    return this.paymentsService.handleWebhook(
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );
  }

  // Seeker SOS subscription — create order (requires seeker auth)
  @Post('seeker-sos-subscribe')
  @Roles(Role.JOB_SEEKER)
  createSeekerSosOrder(@CurrentUser() user: JwtPayload) {
    return this.paymentsService.createSeekerSosOrder(user);
  }

  // Seeker SOS subscription — verify + activate
  @Post('seeker-sos-subscribe/verify')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.JOB_SEEKER)
  verifySeekerSosSub(@CurrentUser() user: JwtPayload, @Body() dto: WebhookDto) {
    return this.paymentsService.verifySeekerSosSub(
      user,
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );
  }

  // Admin: list all payments
  @Roles(Role.ADMIN)
  @Get('admin')
  adminList(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('kind') kind?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.paymentsService.adminList(
      Number(page) || 1,
      Number(limit) || 20,
      kind as any,
      status as any,
      dateFrom,
      dateTo,
    );
  }
}
