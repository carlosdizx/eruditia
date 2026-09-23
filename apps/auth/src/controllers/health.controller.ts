import { Controller, Get } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';

@Controller()
export default class HealthController {
  @Get()
  @AllowAnonymous()
  public async greeting() {
    return { ok: true, date: new Date() };
  }
}
