import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Env from '@common/schemas/env.schema';
import DRIZZLE from '@database/database.constants';
import createDrizzleConnection from '@database/config/database-connection.factory';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) =>
        createDrizzleConnection({
          DB_HOST: configService.get('DB_HOST', { infer: true }),
          DB_PORT: configService.get('DB_PORT', { infer: true }),
          DB_USERNAME: configService.get('DB_USERNAME', { infer: true }),
          DB_PASSWORD: configService.get('DB_PASSWORD', { infer: true }),
          DB_NAME: configService.get('DB_NAME', { infer: true }),
          DB_LOGGING: configService.get('DB_LOGGING', { infer: true }),
        }),
    },
  ],
  exports: [DRIZZLE],
})
export default class DatabaseModule {}
