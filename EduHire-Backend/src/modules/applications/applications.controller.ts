import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { Role } from '../../shared/enums';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { ApplicationsService } from './applications.service';
import { DecisionDto, ShowInterestDto } from './dto/application.dto';

@Controller()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  // Seeker: show interest in a job
  @Roles(Role.JOB_SEEKER)
  @Post('jobs/:jobId/apply')
  apply(
    @CurrentUser() user: JwtPayload,
    @Param('jobId', ParseObjectIdPipe) jobId: string,
    @Body() dto: ShowInterestDto,
  ) {
    return this.applicationsService.showInterest(user, jobId, dto);
  }

  // Seeker: my applications
  @Roles(Role.JOB_SEEKER)
  @Get('applications/my')
  myApplications(@CurrentUser() user: JwtPayload) {
    return this.applicationsService.myApplications(user);
  }

  // Recruiter: all PAID/WON applications across all jobs (for chat)
  @Roles(Role.RECRUITER)
  @Get('applications/recruiter-chats')
  recruiterChats(@CurrentUser() user: JwtPayload) {
    return this.applicationsService.paidForHospital(user);
  }

  // Recruiter: list applicants for a job
  @Roles(Role.RECRUITER)
  @Get('jobs/:jobId/applicants')
  jobApplicants(
    @CurrentUser() user: JwtPayload,
    @Param('jobId', ParseObjectIdPipe) jobId: string,
  ) {
    return this.applicationsService.jobApplicants(user, jobId);
  }

  // Recruiter: shortlist an applicant (full-time only)
  @Roles(Role.RECRUITER)
  @Post('jobs/:jobId/applicants/:applicationId/shortlist')
  @HttpCode(HttpStatus.OK)
  shortlist(
    @CurrentUser() user: JwtPayload,
    @Param('jobId', ParseObjectIdPipe) jobId: string,
    @Param('applicationId', ParseObjectIdPipe) applicationId: string,
  ) {
    return this.applicationsService.shortlist(user, jobId, applicationId);
  }

  // Recruiter: mark WON
  @Roles(Role.RECRUITER)
  @Post('jobs/:jobId/applicants/:applicationId/won')
  @HttpCode(HttpStatus.NO_CONTENT)
  markWon(
    @CurrentUser() user: JwtPayload,
    @Param('jobId', ParseObjectIdPipe) jobId: string,
    @Param('applicationId', ParseObjectIdPipe) applicationId: string,
    @Body() dto: DecisionDto,
  ) {
    return this.applicationsService.markWon(user, jobId, applicationId, dto);
  }

  // Recruiter: decline / close application
  @Roles(Role.RECRUITER)
  @Post('jobs/:jobId/applicants/:applicationId/close')
  @HttpCode(HttpStatus.NO_CONTENT)
  markClosed(
    @CurrentUser() user: JwtPayload,
    @Param('jobId', ParseObjectIdPipe) jobId: string,
    @Param('applicationId', ParseObjectIdPipe) applicationId: string,
    @Body() dto: DecisionDto,
  ) {
    return this.applicationsService.markClosed(user, jobId, applicationId, dto);
  }
}
