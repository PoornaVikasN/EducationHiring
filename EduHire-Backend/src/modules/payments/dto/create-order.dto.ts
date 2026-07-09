import { IsEnum, IsMongoId, IsString } from 'class-validator';
import { PaymentKind } from '../../../shared/enums';

export class CreateOrderDto {
  @IsEnum(PaymentKind)
  kind!: PaymentKind;

  // entityId: jobId for BOOST, applicationId for APPLICATION, schoolId for SUBSCRIPTION
  @IsMongoId()
  entityId!: string;
}

export class WebhookDto {
  @IsString()
  razorpay_order_id!: string;

  @IsString()
  razorpay_payment_id!: string;

  @IsString()
  razorpay_signature!: string;
}
