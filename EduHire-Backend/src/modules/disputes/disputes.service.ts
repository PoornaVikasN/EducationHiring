import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { Dispute, DisputeDocument, DisputeStatus } from './schemas/dispute.schema';

@Injectable()
export class DisputesService {
  constructor(
    @InjectModel(Dispute.name) private disputeModel: Model<DisputeDocument>,
  ) {}

  async create(user: JwtPayload, dto: CreateDisputeDto): Promise<DisputeDocument> {
    return this.disputeModel.create({ ...dto, raisedBy: user.sub });
  }

  async findMine(user: JwtPayload): Promise<DisputeDocument[]> {
    return this.disputeModel.find({ raisedBy: user.sub }).sort({ createdAt: -1 }).exec();
  }

  async findAll(page = 1, limit = 20, status?: DisputeStatus) {
    const filter = status ? { status } : {};
    const [data, total] = await Promise.all([
      this.disputeModel
        .find(filter)
        .populate('raisedBy', 'email phone seekerProfile recruiterProfile role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      this.disputeModel.countDocuments(filter),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async updateStatus(
    id: string,
    status: DisputeStatus,
    dto?: ResolveDisputeDto,
  ): Promise<DisputeDocument> {
    const update: Record<string, unknown> = { status };
    if (dto?.adminNote) update.adminNote = dto.adminNote;
    if (status === DisputeStatus.RESOLVED || status === DisputeStatus.REJECTED) {
      update.resolvedAt = new Date();
    }
    const doc = await this.disputeModel
      .findByIdAndUpdate(id, { $set: update }, { returnDocument: 'after' })
      .exec();
    if (!doc) throw new NotFoundException('Dispute not found');
    return doc;
  }

  async getById(id: string, user: JwtPayload): Promise<DisputeDocument> {
    const doc = await this.disputeModel.findById(id).exec();
    if (!doc) throw new NotFoundException('Dispute not found');
    if (doc.raisedBy.toString() !== user.sub) throw new ForbiddenException();
    return doc;
  }
}
