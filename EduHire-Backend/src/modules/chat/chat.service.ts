import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApplicationState, Role } from '../../shared/enums';
import { Application } from '../applications/schemas/application.schema';
import { School } from '../schools/schemas/school.schema';
import { SystemConfigService } from '../system-config/system-config.service';
import { ChatMessage } from './chat.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name) private chatModel: Model<ChatMessage>,
    @InjectModel(Application.name) private appModel: Model<Application>,
    @InjectModel(School.name) private schoolModel: Model<School>,
    private systemConfig: SystemConfigService,
  ) {}

  async verifyAccess(applicationId: string, userId: string, role: string): Promise<void> {
    const app = await this.appModel
      .findOne({ _id: new Types.ObjectId(applicationId), deletedAt: null })
      .lean()
      .exec();
    if (!app) throw new NotFoundException('Application not found');

    // Chat unlocks at SHORTLISTED when the teacher-fee toggle is off (default flow:
    // INTERESTED → SHORTLISTED → WON | CLOSED), or at PAID when the toggle is on
    // (flow: INTERESTED → SHORTLISTED → PAID → WON | CLOSED). WON always qualifies.
    // See DECISIONS.md §2 and D38 (corrected — was previously hardcoded to PAID/WON only,
    // which meant chat could never unlock while TEACHER_PAID_ENABLED is false/default).
    const teacherPaidEnabled = await this.systemConfig.getSettingBoolean('TEACHER_PAID_ENABLED', false);
    const unlockState = teacherPaidEnabled ? ApplicationState.PAID : ApplicationState.SHORTLISTED;
    const unlocked = app.state === unlockState || app.state === ApplicationState.WON;

    if (!unlocked) {
      throw new ForbiddenException(
        teacherPaidEnabled
          ? 'Chat unlocks after the teacher confirms interest with payment'
          : 'Chat unlocks once the school shortlists this application',
      );
    }

    if (role === Role.TEACHER) {
      if (app.seekerId.toString() !== userId) throw new ForbiddenException('Not your application');
      return;
    }

    if (role === Role.RECRUITER) {
      const school = await this.schoolModel
        .findOne({ adminUserId: new Types.ObjectId(userId), deletedAt: null })
        .lean()
        .exec();
      if (!school || !app.schoolId.equals(school._id)) {
        throw new ForbiddenException('Not your application');
      }
      return;
    }

    if (role === Role.ADMIN) return;

    throw new ForbiddenException('Access denied');
  }

  async getHistory(applicationId: string, userId: string, role: string): Promise<ChatMessage[]> {
    await this.verifyAccess(applicationId, userId, role);
    return this.chatModel
      .find({ applicationId: new Types.ObjectId(applicationId) })
      .sort({ createdAt: 1 })
      .lean()
      .exec();
  }

  async sendMessage(
    applicationId: string,
    senderId: string,
    senderRole: string,
    text: string,
  ): Promise<ChatMessage> {
    const msg = await this.chatModel.create({
      applicationId: new Types.ObjectId(applicationId),
      senderId: new Types.ObjectId(senderId),
      senderRole,
      text: text.trim().slice(0, 2000),
    });
    return msg.toObject();
  }
}
