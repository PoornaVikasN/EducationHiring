import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { Role } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { CreateJobDto } from './dto/create-job.dto';
import { JobsQueryDto } from './dto/jobs-query.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  // Public: browse active jobs
  @Public()
  @Get()
  findAll(@Query() query: JobsQueryDto) {
    return this.jobsService.findAll(query);
  }

  // Recruiter: my jobs list — static segment must come before recruiter/:id
  @Roles(Role.RECRUITER)
  @Get('recruiter/my-jobs')
  findMyJobs(@CurrentUser() user: JwtPayload, @Query() query: JobsQueryDto) {
    return this.jobsService.findMyJobs(user, query);
  }

  // Recruiter: single job by id (any status — used by edit page)
  @Roles(Role.RECRUITER)
  @Get('recruiter/:id')
  findMyJobById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.jobsService.findMyJobById(user, id);
  }

  // Admin: all jobs — static segment must come before :id
  @Roles(Role.ADMIN)
  @Get('admin/all')
  adminFindAll(@Query() query: JobsQueryDto) {
    return this.jobsService.adminFindAll(query);
  }

  // Admin: disable job
  @Roles(Role.ADMIN)
  @Patch('admin/:id/disable')
  @HttpCode(HttpStatus.NO_CONTENT)
  adminDisable(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.jobsService.adminDisableJob(id, user.sub, user.email);
  }

  // Admin: delete job (soft delete, same cascade as recruiter's own delete)
  @Roles(Role.ADMIN)
  @Delete('admin/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  adminRemove(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.jobsService.adminRemoveJob(id, user.sub, user.email);
  }

  // Public: single job detail — parameterized routes last
  @Public()
  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe) id: string) {
    return this.jobsService.findOne(id);
  }

  // Recruiter: post a new job
  @Roles(Role.RECRUITER)
  @Post()
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateJobDto) {
    return this.jobsService.create(user, dto);
  }

  // Recruiter: update job
  @Roles(Role.RECRUITER)
  @Patch(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(user, id, dto);
  }

  // Recruiter: delete job
  @Roles(Role.RECRUITER)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@CurrentUser() user: JwtPayload, @Param('id', ParseObjectIdPipe) id: string) {
    return this.jobsService.remove(user, id);
  }
}
