import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { PassportStrategy } from '@nestjs/passport';
import { Model } from 'mongoose';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '../../../shared/enums';
import { User, UserDocument } from '../../users/schemas/user.schema';

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
  tv?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub || !payload.role) {
      throw new UnauthorizedException();
    }
    const user = await this.userModel
      .findOne({ _id: payload.sub, isActive: true, deletedAt: null })
      .select('_id tokenVersion')
      .lean()
      .exec();
    if (!user) {
      throw new UnauthorizedException('Account is suspended or deleted');
    }

    const userTv = (user.tokenVersion as number | undefined) ?? 0;
    const tokenTv = payload.tv ?? 0;
    if (userTv !== tokenTv) {
      throw new UnauthorizedException('Token has been revoked');
    }

    return payload;
  }
}
