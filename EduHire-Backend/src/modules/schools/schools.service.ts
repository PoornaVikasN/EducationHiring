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
import { UploadKind } from '../uploads/dto/presign.dto';
import { UploadsService } from '../uploads/uploads.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { School, SchoolDocument } from './schemas/school.schema';

@Injectable()
export class SchoolsService {
  constructor(
    @InjectModel(School.name) private schoolModel: Model<SchoolDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private eventEmitter: EventEmitter2,
    private uploads: UploadsService,
  ) {}

  // Server-side verification that any client-submitted S3 URL actually exists in the
  // bucket with the claimed content-type/size before it gets persisted onto a School
  // document — prevents a client from claiming any arbitrary (even someone else's) S3 key.
  private async verifySchoolUploads(
    dto: Partial<CreateSchoolDto | UpdateSchoolDto>,
  ): Promise<void> {
    if (dto.logoUrl) {
      await this.uploads.verifyUploadKey(dto.logoUrl, UploadKind.LOGO);
    }
    if (dto.photos?.length) {
      for (const url of dto.photos) {
        await this.uploads.verifyUploadKey(url, UploadKind.SCHOOL_PHOTO);
      }
    }
  }

  async create(currentUser: JwtPayload, dto: CreateSchoolDto): Promise<SchoolDocument> {
    if (currentUser.role !== Role.RECRUITER) {
      throw new ForbiddenException('Only recruiters can create a school profile');
    }

    const existing = await this.schoolModel
      .findOne({ registrationNumber: dto.registrationNumber, deletedAt: null })
      .lean()
      .exec();
    if (existing) throw new ConflictException('A school with this registration number already exists');

    await this.verifySchoolUploads(dto);

    const locationGeo =
      dto.longitude !== undefined && dto.latitude !== undefined
        ? { type: 'Point' as const, coordinates: [dto.longitude, dto.latitude] as [number, number] }
        : undefined;

    const school = await this.schoolModel.create({
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
      noOfClassrooms: dto.noOfClassrooms ?? null,
      campusFacilities: dto.campusFacilities ?? [],
      noOfLabsOrSpecialRooms: dto.noOfLabsOrSpecialRooms ?? null,
      photos: dto.photos ?? [],
      scopeOfServices: dto.scopeOfServices ?? null,
      schoolStrength: dto.schoolStrength ?? null,
      studentCapacity: dto.studentCapacity ?? null,
      accreditations: dto.accreditations ?? [],
      departments: dto.departments ?? [],
      verificationStatus: VerificationStatus.PENDING,
      ...(locationGeo && { location: locationGeo }),
    });

    await this.userModel.findByIdAndUpdate(currentUser.sub, {
      $set: { 'recruiterProfile.schoolId': school._id },
    });

    this.eventEmitter.emit('school.registered', {
      schoolId: school._id.toString(),
      schoolName: school.name,
    });

    return school;
  }

  async getMySchool(currentUser: JwtPayload): Promise<SchoolDocument> {
    const [result] = await this.schoolModel.aggregate<SchoolDocument>([
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

    if (!result) throw new NotFoundException('School profile not found');
    return result;
  }

  async getById(id: string): Promise<SchoolDocument> {
    const [result] = await this.schoolModel.aggregate<SchoolDocument>([
      {
        $match: {
          _id: new Types.ObjectId(id),
          deletedAt: null,
        },
      },
    ]);

    if (!result) throw new NotFoundException('School not found');
    return result;
  }

  async update(
    currentUser: JwtPayload,
    schoolId: string,
    dto: UpdateSchoolDto,
  ): Promise<SchoolDocument> {
    const school = await this.schoolModel
      .findOne({ _id: schoolId, deletedAt: null })
      .exec();
    if (!school) throw new NotFoundException('School not found');

    if (school.adminUserId.toString() !== currentUser.sub) {
      throw new ForbiddenException('Not authorised to update this school');
    }

    await this.verifySchoolUploads(dto);

    const update: Record<string, unknown> = { ...dto };
    delete update.latitude;
    delete update.longitude;
    if (dto.longitude !== undefined && dto.latitude !== undefined) {
      update.location = { type: 'Point', coordinates: [dto.longitude, dto.latitude] };
    }

    const updated = await this.schoolModel
      .findByIdAndUpdate(schoolId, { $set: update }, { new: true })
      .exec();

    if (!updated) throw new NotFoundException('School not found');
    return updated;
  }
}
