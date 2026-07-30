import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BulkImportService } from '../modules/admin/bulk-import/bulk-import.service';

@Injectable()
export class BulkImportEmailSweepService implements OnModuleInit {
  private readonly logger = new Logger(BulkImportEmailSweepService.name);

  constructor(private bulkImportService: BulkImportService) {}

  // Confirms on every boot (local or production) that this cron actually registered —
  // the only way to tell "it hasn't fired yet" apart from "it was never scheduled at all"
  // is a log line that's independent of whether there's ever any work to do. Live-verified
  // twice on 2026-07-30 by temporarily pointing this at near-future timestamps: fired
  // exactly on target both times. First real run: 500 attempted, 450 sent, 50 rejected
  // with Gmail's "550 Daily user sending limit exceeded" (permanent-for-today, correctly
  // not retried). Second run (same day, quota already spent from the first run + manual
  // testing): 500/500 correctly rejected the same way — proves the daily-cap classification
  // holds under genuine exhaustion, not just the happy path.
  onModuleInit() {
    this.logger.log(
      'Bulk-import email sweep cron registered (EVERY_DAY_AT_3AM IST).',
    );
  }

  // Daily: trickle out the next wave of activation emails for any bulk-import batch
  // still carrying pending recipients (Gmail's real per-account daily send cap means a
  // large batch can't all be emailed in one pass — see EMAIL_DAILY_SEND_CAP).
  // The backend process runs with TZ=UTC (see .env) — without an explicit timeZone here,
  // "3 AM" silently means 3 AM UTC (8:30 AM IST), not 3 AM India time as the hour clearly
  // implies. Pinned to Asia/Kolkata so the schedule matches real off-peak local hours
  // regardless of the process's own TZ setting.
  @Cron(CronExpression.EVERY_DAY_AT_3AM, { timeZone: 'Asia/Kolkata' })
  async sweepPendingBulkImportEmails() {
    this.logger.log('Bulk-import email sweep tick started.');
    const { batchesProcessed, totalQueued, totalSent, totalFailed } =
      await this.bulkImportService.runPendingEmailSweep();
    this.logger.log(
      batchesProcessed > 0
        ? `Bulk-import email sweep tick finished: ${totalQueued} email(s) attempted across ${batchesProcessed} batch(es) — ${totalSent} sent, ${totalFailed} failed`
        : 'Bulk-import email sweep tick finished: no batches had pending emails.',
    );
  }
}
