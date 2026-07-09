import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import * as crypto from 'crypto';
import { Model, Types } from 'mongoose';
import Razorpay from 'razorpay';
import {
  ApplicationState,
  PaymentKind,
  PaymentStatus,
  SubscriptionStatus,
} from '../../shared/enums';
import { JOB_TTL_MS, SUBSCRIPTION_CYCLE_DAYS } from '../../shared/constants/pricing';
import { Application, ApplicationDocument } from '../applications/schemas/application.schema';
import { School, SchoolDocument } from '../schools/schemas/school.schema';
import { Job, JobDocument } from '../jobs/schemas/job.schema';
import { Subscription, SubscriptionDocument } from '../subscriptions/schemas/subscription.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { SystemConfigService } from '../system-config/system-config.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateOrderDto } from './dto/create-order.dto';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { safeEqual } from '../../common/utils/crypto.util';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Application.name) private appModel: Model<ApplicationDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private eventEmitter: EventEmitter2,
    private systemConfig: SystemConfigService,
  ) {}

  private async getRazorpay(): Promise<Razorpay> {
    const key_id = (await this.systemConfig.getSecret('RAZORPAY_KEY_ID')) ?? '';
    const key_secret = (await this.systemConfig.getSecret('RAZORPAY_KEY_SECRET')) ?? '';
    return new Razorpay({ key_id, key_secret });
  }

  // ── Create Razorpay order ─────────────────────────────────────────────────────

  async createOrder(currentUser: JwtPayload, dto: CreateOrderDto) {
    const amountPaise = await this.resolveAmount(dto.kind);

    // Kind-specific pre-validation
    await this.validateEntityForKind(currentUser, dto.kind, dto.entityId);

    const rzp = await this.getRazorpay();
    const razorpayOrder = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: `rx_${dto.kind}_${dto.entityId.slice(-6)}_${Date.now()}`,
    });

    const payment = await this.paymentModel.create({
      userId: new Types.ObjectId(currentUser.sub),
      kind: dto.kind,
      amountPaise,
      status: PaymentStatus.PENDING,
      razorpayOrderId: razorpayOrder.id,
      entityId: new Types.ObjectId(dto.entityId),
    });

    return {
      orderId: razorpayOrder.id,
      paymentId: payment._id.toString(),
      amount: amountPaise,
      currency: 'INR',
      keyId: (await this.systemConfig.getSecret('RAZORPAY_KEY_ID')) ?? '',
    };
  }

  // ── Verify + fulfill webhook ──────────────────────────────────────────────────

  async handleWebhook(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<void> {
    // Checkout signatures are HMAC_SHA256(order_id|payment_id, KEY_SECRET)
    const secret = (await this.systemConfig.getSecret('RAZORPAY_KEY_SECRET')) ?? '';
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (!safeEqual(expected, razorpaySignature)) {
      throw new BadRequestException('Invalid payment signature');
    }

    const payment = await this.paymentModel
      .findOne({ razorpayOrderId })
      .exec();

    if (!payment) throw new NotFoundException('Payment record not found');

    // Idempotent: already fulfilled
    if (payment.status === PaymentStatus.PAID) return;

    await this.paymentModel.findByIdAndUpdate(payment._id, {
      $set: { status: PaymentStatus.PAID, razorpayPaymentId, fulfilledAt: new Date() },
    });

    await this.fulfill(payment, razorpayPaymentId);
  }

  // ── Fulfill based on kind ─────────────────────────────────────────────────────

  private async fulfill(payment: PaymentDocument, razorpayPaymentId: string): Promise<void> {
    const entityId = payment.entityId?.toString() ?? '';

    switch (payment.kind) {
      case PaymentKind.APPLICATION: {
        // Teacher paid ₹99 — mark app PAID + reveal school
        await this.appModel.findByIdAndUpdate(entityId, {
          $set: {
            state: ApplicationState.PAID,
            paidAt: new Date(),
            razorpayPaymentId,
            schoolRevealed: true,
          },
        });
        const app = await this.appModel.findById(entityId).lean().exec();
        if (app) {
          this.eventEmitter.emit('application.paid', {
            seekerId: app.seekerId.toString(),
            schoolId: app.schoolId.toString(),
            jobId: app.jobId.toString(),
            applicationId: entityId,
          });
        }
        break;
      }

      case PaymentKind.SUBSCRIPTION: {
        // School's monthly unlimited-posting subscription
        const school = await this.schoolModel.findById(entityId).lean().exec();
        if (!school) break;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_CYCLE_DAYS);

        await this.subscriptionModel.findOneAndUpdate(
          { schoolId: school._id },
          {
            $set: {
              schoolId: school._id,
              status: SubscriptionStatus.ACTIVE,
              expiresAt,
              razorpayPaymentId,
              razorpayOrderId: payment.razorpayOrderId,
              deletedAt: null,
            },
          },
          { upsert: true, returnDocument: 'after' },
        );

        this.eventEmitter.emit('subscription.activated', { schoolId: entityId, amountPaise: payment.amountPaise, expiresAt });
        break;
      }

      case PaymentKind.BOOST: {
        await this.jobModel.findByIdAndUpdate(entityId, {
          $set: {
            status: 'ACTIVE',
            isBoosted: true,
            expiresAt: new Date(Date.now() + JOB_TTL_MS),
          },
        });
        this.eventEmitter.emit('job.boosted', { jobId: entityId, userId: payment.userId.toString() });
        break;
      }

      default:
        this.logger.warn(`Unknown payment kind: ${payment.kind}`);
    }
  }

  // ── Admin: list payments ──────────────────────────────────────────────────────

  async adminList(page = 1, limit = 20, kind?: PaymentKind, status?: PaymentStatus, dateFrom?: string, dateTo?: string) {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = { deletedAt: null };
    if (kind) filter['kind'] = kind;
    if (status) filter['status'] = status;
    if (dateFrom || dateTo) {
      const dateRange: Record<string, Date> = {};
      if (dateFrom) dateRange['$gte'] = new Date(dateFrom);
      if (dateTo) {
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        dateRange['$lte'] = to;
      }
      filter['createdAt'] = dateRange;
    }

    const [data, total] = await Promise.all([
      this.paymentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email seekerProfile.fullName recruiterProfile.fullName')
        .lean()
        .exec(),
      this.paymentModel.countDocuments(filter),
    ]);

    // Normalize populated user to { email, fullName }
    const normalized = data.map((p: any) => {
      const u = p.userId as any;
      const fullName = u?.seekerProfile?.fullName ?? u?.recruiterProfile?.fullName ?? undefined;
      return { ...p, user: u ? { email: u.email, fullName } : undefined, userId: u?._id ?? p.userId };
    });

    return { data: normalized, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // ── Reconcile stale PENDING payments (called by scheduler) ───────────────────

  async reconcilePendingPayments(): Promise<number> {
    // Find PENDING payments older than 30 min — query Razorpay to see if paid
    const cutoff = new Date(Date.now() - 30 * 60 * 1000);
    const stale = await this.paymentModel
      .find({ status: PaymentStatus.PENDING, createdAt: { $lt: cutoff }, deletedAt: null })
      .limit(50)
      .exec();

    let fulfilled = 0;
    for (const payment of stale) {
      try {
        const rzp = await this.getRazorpay();
        const order = await rzp.orders.fetch(payment.razorpayOrderId) as { status: string; id: string };
        if (order.status === 'paid') {
          // Fetch the payment ID from the order's payments
          const ordPayments = await rzp.orders.fetchPayments(payment.razorpayOrderId) as { items: Array<{ id: string; status: string }> };
          const paid = ordPayments.items?.find((p) => p.status === 'captured');
          if (paid) {
            await this.paymentModel.findByIdAndUpdate(payment._id, {
              $set: { status: PaymentStatus.PAID, razorpayPaymentId: paid.id, fulfilledAt: new Date() },
            });
            await this.fulfill(payment, paid.id);
            fulfilled++;
          }
        }
      } catch (err) {
        this.logger.warn(`Reconcile failed for payment ${payment._id}: ${(err as Error).message}`);
      }
    }
    return fulfilled;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private async resolveAmount(kind: PaymentKind): Promise<number> {
    switch (kind) {
      case PaymentKind.SUBSCRIPTION:
        return this.systemConfig.getPricePaise('RECRUITER_MONTHLY_PAISE');
      case PaymentKind.APPLICATION:
        return this.systemConfig.getPricePaise('APPLICATION_FEE_PAISE');
      default:
        throw new BadRequestException('Unknown or unsupported payment kind');
    }
  }

  private async validateEntityForKind(
    currentUser: JwtPayload,
    kind: PaymentKind,
    entityId: string,
  ): Promise<void> {
    if (kind === PaymentKind.APPLICATION) {
      const app = await this.appModel
        .findOne({ _id: entityId, seekerId: new Types.ObjectId(currentUser.sub), state: ApplicationState.SHORTLISTED })
        .lean()
        .exec();
      if (!app) throw new BadRequestException('Application not found or not in SHORTLISTED state');
      if (app.paymentDueBy && app.paymentDueBy < new Date()) {
        throw new BadRequestException('Payment window has expired');
      }
    }
  }
}
