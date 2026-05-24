import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Role, VerificationStatus } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { UpdateHospitalDto } from './dto/update-hospital.dto';
import { Hospital, HospitalDocument } from './schemas/hospital.schema';

@Injectable()
export class HospitalsService {
  constructor(
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(currentUser: JwtPayload, dto: CreateHospitalDto): Promise<HospitalDocument> {
    if (currentUser.role !== Role.RECRUITER) {
      throw new ForbiddenException('Only recruiters can create a hospital profile');
    }

    const existing = await this.hospitalModel
      .findOne({ registrationNumber: dto.registrationNumber, deletedAt: null })
      .lean()
      .exec();
    if (existing) throw new ConflictException('A hospital with this registration number already exists');

    const locationGeo =
      dto.longitude !== undefined && dto.latitude !== undefined
        ? { type: 'Point' as const, coordinates: [dto.longitude, dto.latitude] as [number, number] }
        : undefined;

    const hospital = await this.hospitalModel.create({
      name: dto.name,
      registrationNumber: dto.registrationNumber,
      logoUrl: dto.logoUrl ?? null,
      address: dto.address,
      city: dto.city,
      state: dto.state,
      pincode: dto.pincode,
      contactEmail: dto.contactEmail.toLowerCase(),
      contactPhone: dto.contactPhone,
      adminUserId: new Types.ObjectId(currentUser.sub),
      description: dto.description ?? null,
      website: dto.website ?? null,
      noOfOperationTheatres: dto.noOfOperationTheatres ?? null,
      hospitalInfra: dto.hospitalInfra ?? [],
      noOfCabinsAndBeds: dto.noOfCabinsAndBeds ?? null,
      photos: dto.photos ?? [],
      scopeOfServices: dto.scopeOfServices ?? null,
      hospitalStrength: dto.hospitalStrength ?? null,
      noOfBeds: dto.noOfBeds ?? null,
      accreditations: dto.accreditations ?? [],
      departments: dto.departments ?? [],
      verificationStatus: VerificationStatus.PENDING,
      ...(locationGeo && { location: locationGeo }),
    });

    await this.userModel.findByIdAndUpdate(currentUser.sub, {
      $set: { 'recruiterProfile.hospitalId': hospital._id },
    });

    this.eventEmitter.emit('hospital.registered', {
      hospitalId: hospital._id.toString(),
      hospitalName: hospital.name,
    });

    return hospital;
  }

  async getMyHospital(currentUser: JwtPayload): Promise<HospitalDocument> {
    const [result] = await this.hospitalModel.aggregate<HospitalDocument>([
      {
        $match: {
          adminUserId: new Types.ObjectId(currentUser.sub),
          deletedAt: null,
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'adminUserId',
          foreignField: '_id',
          as: 'admin',
          pipeline: [{ $project: { 'recruiterProfile.fullName': 1, email: 1 } }],
        },
      },
      { $unwind: { path: '$admin', preserveNullAndEmptyArrays: true } },
    ]);

    if (!result) throw new NotFoundException('Hospital profile not found');
    return result;
  }

  async getById(id: string): Promise<HospitalDocument> {
    const [result] = await this.hospitalModel.aggregate<HospitalDocument>([
      {
        $match: {
          _id: new Types.ObjectId(id),
          deletedAt: null,
        },
      },
    ]);

    if (!result) throw new NotFoundException('Hospital not found');
    return result;
  }

  async update(
    currentUser: JwtPayload,
    hospitalId: string,
    dto: UpdateHospitalDto,
  ): Promise<HospitalDocument> {
    const hospital = await this.hospitalModel
      .findOne({ _id: hospitalId, deletedAt: null })
      .exec();
    if (!hospital) throw new NotFoundException('Hospital not found');

    if (hospital.adminUserId.toString() !== currentUser.sub) {
      throw new ForbiddenException('Not authorised to update this hospital');
    }

    const update: Record<string, unknown> = { ...dto };
    delete update.latitude;
    delete update.longitude;
    if (dto.longitude !== undefined && dto.latitude !== undefined) {
      update.location = { type: 'Point', coordinates: [dto.longitude, dto.latitude] };
    }

    const updated = await this.hospitalModel
      .findByIdAndUpdate(hospitalId, { $set: update }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('Hospital not found');
    return updated;
  }
}
