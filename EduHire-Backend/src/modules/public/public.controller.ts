import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SystemConfigService } from '../system-config/system-config.service';
import { LegalContentService } from '../legal-content/legal-content.service';

@Controller('public')
export class PublicController {
  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly legalContentService: LegalContentService,
  ) {}

  @Public()
  @Get('pricing')
  getPricing() {
    return this.systemConfigService.getAllPrices();
  }

  @Public()
  @Get('settings')
  getSettings() {
    return this.systemConfigService.getAllSettings();
  }

  @Public()
  @Get('legal/:key')
  async getLegalPage(@Param('key') key: string) {
    const page = await this.legalContentService.findByKey(key);
    if (!page) throw new NotFoundException('Page not found');
    return page;
  }
}
