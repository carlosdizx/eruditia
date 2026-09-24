import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import HealthController from './controllers/health.controller';
import CommonModule from './common/common.module';
import Env from './common/schemas/env.schema';
import auth from '@common/config/auth.config';
import BetterAuthApiErrorFilter from '@common/filters/better-auth-api-error.filter';
import SystemOrganizationsModule from '@modules/system-organizations.module';
import OrganizationUsersModule from '@modules/organization-users.module';
import ReportsModule from '@modules/reports.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    CommonModule,
    AuthModule.forRoot({ auth }),
    ObserveModule.forRootAsync({
      imports: [CommonModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        appKey: configService.get('OBSERVE_APP_KEY', { infer: true }),
        appSecret: configService.get('OBSERVE_APP_SECRET', { infer: true }),
        serviceId: configService.get('OBSERVE_SERVICE_ID', { infer: true }),
      }),
    }),
    SystemOrganizationsModule,
    OrganizationUsersModule,
    ReportsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_FILTER, useClass: BetterAuthApiErrorFilter }],
})
export default class AppModule {}
