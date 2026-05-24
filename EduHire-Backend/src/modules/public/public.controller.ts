import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';
import { SystemConfigService } from '../system-config/system-config.service';

@Controller('public')
export class PublicController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Public()
  @Get('pricing')
  getPricing() {
    return this.systemConfigService.getAllPrices();
  }
}
