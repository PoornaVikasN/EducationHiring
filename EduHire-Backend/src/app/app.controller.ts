import { Controller, Get, UnauthorizedException } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    throw new UnauthorizedException(
      'You are not authorised to access this resource!!!',
    );
  }

  @Get('health')
  async healthCheck() {
    return this.appService.getHealthStatus();
  }
}
