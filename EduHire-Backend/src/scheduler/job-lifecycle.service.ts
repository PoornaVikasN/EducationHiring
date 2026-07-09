import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ApplicationsService } from '../modules/applications/applications.service';
import { JobsService } from '../modules/jobs/jobs.service';
import { PaymentsService } from '../modules/payments/payments.service';

@Injectable()
export class JobLifecycleService {
  private readonly logger = new Logger(JobLifecycleService.name);

  constructor(
    private jobsService: JobsService,
    private applicationsService: ApplicationsService,
    private paymentsService: PaymentsService,
  ) {}

  // Every 5 minutes: expire jobs past their TTL
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepExpiredJobs() {
    const { expired } = await this.jobsService.runExpirySweep();
    if (expired > 0) {
      this.logger.log(`Expiry sweep: ${expired} jobs expired`);
    }
  }

  // Every 5 minutes: close shortlisted applications past 48h pay window
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sweepPayWindows() {
    const closed = await this.applicationsService.runPayWindowSweep();
    if (closed > 0) {
      this.logger.log(`Pay-window sweep: ${closed} applications auto-closed`);
    }
  }

  // Hourly: reconcile PENDING payments with Razorpay (handles missed webhooks)
  @Cron(CronExpression.EVERY_HOUR)
  async reconcilePayments() {
    const fulfilled = await this.paymentsService.reconcilePendingPayments();
    if (fulfilled > 0) {
      this.logger.log(`Payment reconciliation: ${fulfilled} payments fulfilled`);
    }
  }
}
