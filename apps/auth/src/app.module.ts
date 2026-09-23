import { Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import CommonModule from './common/common.module';
import Env from './common/schemas/env.schema';
import auth from '@common/config/auth.config';

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
  ],
})
export default class AppModule {}
