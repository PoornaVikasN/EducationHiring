import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';

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

  async list(page = 1, limit = 20, entityType?: string) {
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};
    if (entityType) filter['entityType'] = entityType;

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
