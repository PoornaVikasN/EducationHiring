import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { IsInt, IsString, Min, MinLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ParseObjectIdPipe } from '../../common/pipes/parse-object-id.pipe';
import { Role } from '../../shared/enums';
import { AuditService } from '../audit/audit.service';
import { EmailTemplatesService } from '../email-templates/email-templates.service';
import { CreateEmailTemplateDto } from '../email-templates/dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from '../email-templates/dto/update-email-template.dto';
import { LegalContentService } from '../legal-content/legal-content.service';
import { UpdateLegalPageDto } from '../legal-content/dto/update-legal-page.dto';
import { SystemConfigService } from '../system-config/system-config.service';
import { AdminService } from './admin.service';
import { CreateAdminUserDto } from './dto/create-admin-user.dto';

class UpdatePriceDto {
  @IsInt()
  @Min(100)
  valueNumber!: number;
}

class SetApiKeyDto {
  @IsString()
  @MinLength(4)
  value!: string;
}

@Controller('admin')
@Roles(Role.ADMIN)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly systemConfigService: SystemConfigService,
    private readonly auditService: AuditService,
    private readonly emailTemplatesService: EmailTemplatesService,
    private readonly legalContentService: LegalContentService,
  ) {}

  @Get('stats')
  stats() {
    return this.adminService.getDashboardStats();
  }

  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  createUser(@Body() dto: CreateAdminUserDto, @CurrentUser() user: { sub: string; email: string }) {
    return this.adminService.createUser(dto, user.sub, user.email);
  }

  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('isActive') isActive?: string,
    @Query('city') city?: string,
    @Query('joinedFrom') joinedFrom?: string,
    @Query('joinedTo') joinedTo?: string,
    @Query('includeDeleted') includeDeleted?: string,
  ) {
    const isActiveBool = isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.adminService.listUsers(
      Number(page) || 1,
      Number(limit) || 20,
      search,
      role,
      isActiveBool,
      city,
      joinedFrom,
      joinedTo,
      includeDeleted === 'true',
    );
  }

  @Patch('users/:id/suspend')
  @HttpCode(HttpStatus.NO_CONTENT)
  suspendUser(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { sub: string; email: string }) {
    return this.adminService.suspendUser(id, user.sub, user.email);
  }

  @Patch('users/:id/activate')
  @HttpCode(HttpStatus.NO_CONTENT)
  activateUser(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { sub: string; email: string }) {
    return this.adminService.activateUser(id, user.sub, user.email);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteUser(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { sub: string; email: string }) {
    return this.adminService.deleteUser(id, user.sub, user.email);
  }

  @Patch('users/:id/restore')
  @HttpCode(HttpStatus.NO_CONTENT)
  restoreUser(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { sub: string; email: string }) {
    return this.adminService.restoreUser(id, user.sub, user.email);
  }

  @Get('schools')
  listSchools(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('verified') verified?: string,
    @Query('search') search?: string,
    @Query('registeredFrom') registeredFrom?: string,
    @Query('registeredTo') registeredTo?: string,
  ) {
    const verifiedBool = verified === 'true' ? true : verified === 'false' ? false : undefined;
    return this.adminService.listSchools(
      Number(page) || 1,
      Number(limit) || 20,
      verifiedBool,
      search,
      registeredFrom,
      registeredTo,
    );
  }

  @Patch('schools/:id/verify')
  @HttpCode(HttpStatus.NO_CONTENT)
  verifySchool(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { sub: string; email: string }) {
    return this.adminService.verifySchool(id, user.sub, user.email);
  }

  @Patch('schools/:id/reject')
  @HttpCode(HttpStatus.NO_CONTENT)
  rejectSchool(@Param('id', ParseObjectIdPipe) id: string, @CurrentUser() user: { sub: string; email: string }) {
    return this.adminService.rejectSchool(id, user.sub, user.email);
  }

  // ── Audit log ───────────────────────────────────────────────────────────────

  @Get('audit')
  getAuditLogs(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.auditService.list(Number(page) || 1, Number(limit) || 20, entityType);
  }

  // ── Pricing config ──────────────────────────────────────────────────────────

  @Get('config/pricing')
  getPricing() {
    return this.systemConfigService.getAllPrices();
  }

  @Patch('config/pricing/:key')
  updatePrice(
    @Param('key') key: string,
    @Body() dto: UpdatePriceDto,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.systemConfigService.upsertPrice(key, dto.valueNumber, user.sub, user.email);
  }

  // ── General settings (radius, etc.) ────────────────────────────────────────

  @Get('config/settings')
  getSettings() {
    return this.systemConfigService.getAllSettings();
  }

  @Patch('config/settings/:key')
  updateSetting(
    @Param('key') key: string,
    @Body('value') value: number,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.systemConfigService.updateSetting(key, value, user.sub, user.email);
  }

  // ── API key config ──────────────────────────────────────────────────────────

  @Get('config/env')
  getApiKeyStatuses() {
    return this.systemConfigService.getApiKeyStatuses();
  }

  @Patch('config/env/:key')
  setApiKey(
    @Param('key') key: string,
    @Body() dto: SetApiKeyDto,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.systemConfigService.setSecret(key, dto.value, user.sub, user.email);
  }

  // ── Email Templates ─────────────────────────────────────────────────────────

  @Get('config/email-templates')
  getEmailTemplates() {
    return this.emailTemplatesService.findAll();
  }

  @Patch('config/email-templates/:key')
  updateEmailTemplate(
    @Param('key') key: string,
    @Body() dto: UpdateEmailTemplateDto,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.emailTemplatesService.update(key, dto, user.sub, user.email);
  }

  @Post('config/email-templates')
  @HttpCode(HttpStatus.CREATED)
  createEmailTemplate(
    @Body() dto: CreateEmailTemplateDto,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.emailTemplatesService.create(dto, user.sub, user.email);
  }

  @Delete('config/email-templates/:key')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteEmailTemplate(
    @Param('key') key: string,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.emailTemplatesService.remove(key, user.sub, user.email);
  }

  // ── Legal pages (Terms / Privacy Policy) ────────────────────────────────────

  @Get('config/legal-pages')
  getLegalPages() {
    return this.legalContentService.findAll();
  }

  @Patch('config/legal-pages/:key')
  updateLegalPage(
    @Param('key') key: string,
    @Body() dto: UpdateLegalPageDto,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.legalContentService.update(key, dto, user.sub, user.email);
  }
}
