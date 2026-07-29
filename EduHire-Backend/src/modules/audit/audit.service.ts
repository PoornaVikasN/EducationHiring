import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectModel(AuditLog.name) private auditModel: Model<AuditLogDocument>,
  ) {}

  // Fire-and-forget — never block the primary action
  log(
    adminId: string,
    adminEmail: string,
    action: string,
    entityType: string,
    entityId: string,
    entityLabel: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
  ): void {
    this.auditModel
      .create({
        adminId: new Types.ObjectId(adminId),
        adminEmail,
        action,
        entityType,
        entityId,
        entityLabel,
        before,
        after,
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));
  }

  async list(page = 1, limit = 20, entityType?: string, actionPrefix?: string, entityId?: string) {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (entityType) filter['entityType'] = entityType;
    // Prefix match (e.g. "BULK_IMPORT") lets a caller pull every related action without
    // enumerating an exact list — used by the Bulk Import page's own Audit Log tab.
    if (actionPrefix) filter['action'] = { $regex: `^${escapeRegex(actionPrefix)}` };
    if (entityId) filter['entityId'] = entityId;

    const [data, total] = await Promise.all([
      this.auditModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.auditModel.countDocuments(filter),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  // Fire-and-forget — system-initiated events with no acting admin (e.g. the daily
  // bulk-import email-trickle cron). Mirrors log() exactly but never attempts
  // `new Types.ObjectId(adminId)` on a value that doesn't exist for a scheduled job.
  logSystemEvent(
    action: string,
    entityType: string,
    entityId: string,
    entityLabel: string,
    before?: Record<string, unknown>,
    after?: Record<string, unknown>,
  ): void {
    this.auditModel
      .create({
        adminId: null,
        adminEmail: null,
        action,
        entityType,
        entityId,
        entityLabel,
        before,
        after,
      })
      .catch((err) => this.logger.error(`System audit log failed: ${err.message}`));
  }

  // Fire-and-forget — anonymous auth-flow audit trail (no acting admin). Used to
  // record failed logins, OTP failures/lockouts, password resets, and successful
  // logins for security monitoring without blocking the primary auth request.
  logAuthEvent(
    action: 'AUTH_FAILED' | 'OTP_FAILED' | 'OTP_LOCKED' | 'PASSWORD_RESET' | 'LOGIN_SUCCESS',
    maskedEmail: string,
    reason: string,
    ip?: string,
    userAgent?: string,
  ): void {
    this.auditModel
      .create({
        adminId: null,
        adminEmail: null,
        action,
        entityType: 'auth',
        entityLabel: maskedEmail,
        ip: ip ?? null,
        userAgent: userAgent ?? null,
        reason,
      })
      .catch((err) => this.logger.error(`Auth audit failed: ${err.message}`));
  }
}
