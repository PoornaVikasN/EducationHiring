import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { Role } from '../../../shared/enums';
import { BulkImportService } from './bulk-import.service';

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls'];
const ALLOWED_MIMETYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream', // some browsers/OSes report this for .xlsx
]);

@Controller('admin/bulk-import')
@Roles(Role.ADMIN)
export class BulkImportController {
  constructor(private readonly bulkImportService: BulkImportService) {}

  @Get('template')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="bulk-user-import-template.xlsx"')
  async downloadTemplate(): Promise<StreamableFile> {
    const buffer = await this.bulkImportService.generateTemplate();
    return new StreamableFile(buffer);
  }

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('force') force: string | undefined,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    if (!file) throw new BadRequestException('No file uploaded. Attach an .xlsx file under the "file" field.');

    const ext = file.originalname.slice(file.originalname.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext) || !ALLOWED_MIMETYPES.has(file.mimetype)) {
      throw new BadRequestException('Only .xlsx or .xls files are accepted.');
    }

    return this.bulkImportService.processUpload(file.buffer, file.originalname, user.sub, user.email, force === 'true');
  }

  @Get('history')
  history(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.bulkImportService.getHistory(Number(page) || 1, Number(limit) || 20);
  }

  @Get(':batchId/errors')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="bulk-import-errors.xlsx"')
  async downloadErrors(@Param('batchId') batchId: string): Promise<StreamableFile> {
    if (!batchId || batchId.length !== 24) throw new NotFoundException('Import batch not found');
    const buffer = await this.bulkImportService.getErrorReport(batchId);
    return new StreamableFile(buffer);
  }

  @Post(':batchId/resend-emails')
  @HttpCode(HttpStatus.OK)
  resendEmails(
    @Param('batchId') batchId: string,
    @Body('userIds') userIds: string[] | undefined,
    @CurrentUser() user: { sub: string; email: string },
  ) {
    return this.bulkImportService.resendEmails(batchId, userIds, user.sub, user.email);
  }
}
