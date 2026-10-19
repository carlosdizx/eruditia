import { Controller, Get } from '@nestjs/common';
import Public from '@auth/decorators/public.decorator';
import HealthService from './health.service';

@Controller('health')
export default class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  public async check() {
    return await this.healthService.check();
  }
}
