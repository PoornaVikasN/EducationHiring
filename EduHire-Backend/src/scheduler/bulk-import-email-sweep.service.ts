import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BulkImportService } from '../modules/admin/bulk-import/bulk-import.service';

@Injectable()
export class BulkImportEmailSweepService {
  private readonly logger = new Logger(BulkImportEmailSweepService.name);

  constructor(private bulkImportService: BulkImportService) {}

  // Daily: trickle out the next wave of activation emails for any bulk-import batch
  // still carrying pending recipients (Gmail's real per-account daily send cap means a
  // large batch can't all be emailed in one pass — see EMAIL_DAILY_SEND_CAP).
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async sweepPendingBulkImportEmails() {
    const { batchesProcessed, totalQueued, totalSent, totalFailed } = await this.bulkImportService.runPendingEmailSweep();
    if (batchesProcessed > 0) {
      this.logger.log(
        `Bulk-import email sweep: ${totalQueued} email(s) attempted across ${batchesProcessed} batch(es) — ${totalSent} sent, ${totalFailed} failed`,
      );
    }
  }
}
