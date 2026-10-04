import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigService } from '@nestjs/config';
import CommonModule from './common/common.module';
import Env from './common/schemas/env.schema';
import OrganizationsModule from './organizations/organizations.module';
import UsersModule from './users/users.module';
import TwoFactorModule from './two-factor/two-factor.module';
import RolesModule from './roles/roles.module';
import EmailModule from './email/email.module';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    CommonModule,
    ObserveModule.forRootAsync({
      imports: [CommonModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        appKey: configService.get('OBSERVE_APP_KEY', { infer: true }),
        appSecret: configService.get('OBSERVE_APP_SECRET', { infer: true }),
        serviceId: configService.get('OBSERVE_SERVICE_ID', { infer: true }),
      }),
    }),
    OrganizationsModule,
    UsersModule,
    TwoFactorModule,
    RolesModule,
    EmailModule,
  ],
})
export default class AppModule {}
