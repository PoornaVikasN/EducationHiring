import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateDisputeDto } from './dto/create-dispute.dto';
import { ResolveDisputeDto } from './dto/resolve-dispute.dto';
import { DisputeStatus } from './schemas/dispute.schema';
import { DisputesService } from './disputes.service';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Post()
  @Roles(Role.JOB_SEEKER, Role.RECRUITER)
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateDisputeDto) {
    return this.disputesService.create(user, dto);
  }

  @Get('mine')
  @Roles(Role.JOB_SEEKER, Role.RECRUITER)
  findMine(@CurrentUser() user: JwtPayload) {
    return this.disputesService.findMine(user);
  }

  @Get()
  @Roles(Role.ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: DisputeStatus,
  ) {
    return this.disputesService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      status,
    );
  }

  @Patch(':id/review')
  @Roles(Role.ADMIN)
  markInReview(@Param('id') id: string) {
    return this.disputesService.updateStatus(id, DisputeStatus.IN_REVIEW);
  }

  @Patch(':id/resolve')
  @Roles(Role.ADMIN)
  resolve(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputesService.updateStatus(id, DisputeStatus.RESOLVED, dto);
  }

  @Patch(':id/reject')
  @Roles(Role.ADMIN)
  reject(@Param('id') id: string, @Body() dto: ResolveDisputeDto) {
    return this.disputesService.updateStatus(id, DisputeStatus.REJECTED, dto);
  }
}
