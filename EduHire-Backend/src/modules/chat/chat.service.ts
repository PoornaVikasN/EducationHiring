import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ApplicationState, Role } from '../../shared/enums';
import { Application } from '../applications/schemas/application.schema';
import { Hospital } from '../hospitals/schemas/hospital.schema';
import { ChatMessage } from './chat.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name) private chatModel: Model<ChatMessage>,
    @InjectModel(Application.name) private appModel: Model<Application>,
    @InjectModel(Hospital.name) private hospitalModel: Model<Hospital>,
  ) {}

  async verifyAccess(applicationId: string, userId: string, role: string): Promise<void> {
    const app = await this.appModel
      .findOne({ _id: new Types.ObjectId(applicationId), deletedAt: null })
      .lean()
      .exec();
    if (!app) throw new NotFoundException('Application not found');

    if (app.state !== ApplicationState.PAID && app.state !== ApplicationState.WON) {
      throw new ForbiddenException('Chat unlocks after the teacher confirms interest (₹99 payment)');
    }

    if (role === Role.JOB_SEEKER) {
      if (app.seekerId.toString() !== userId) throw new ForbiddenException('Not your application');
      return;
    }

    if (role === Role.RECRUITER) {
      const hospital = await this.hospitalModel
        .findOne({ adminUserId: new Types.ObjectId(userId), deletedAt: null })
        .lean()
        .exec();
      if (!hospital || !app.hospitalId.equals(hospital._id)) {
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
